import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const storageMock = vi.hoisted(() => {
	const state = {
		data: new Map<string, unknown>(),
		failKeys: new Set<string>(),
	}

	class Storage {
		async get<T>(key: string): Promise<T | undefined> {
			if (state.failKeys.has(key)) {
				throw new Error(`forced storage failure for ${key}`)
			}

			return state.data.get(key) as T | undefined
		}

		async set(key: string, value: unknown): Promise<void> {
			state.data.set(key, value)
		}

		async remove(key: string): Promise<void> {
			state.data.delete(key)
		}
	}

	return {
		Storage,
		state,
	}
})

vi.mock('@plasmohq/storage', () => ({
	Storage: storageMock.Storage,
}))

type NotesModule = typeof import('../../../src/lib/notes/storage')
let notesModule: NotesModule

function createChromeStorageGet() {
	return vi.fn(async (key: string | null) => {
		if (key === null) {
			const result: Record<string, unknown> = {}

			for (const [
				storedKey,
				value,
			] of storageMock.state.data.entries()) {
				result[storedKey] = JSON.stringify(value)
			}

			return result
		}

		return {
			[key]: storageMock.state.data.get(key),
		}
	})
}

beforeEach(async () => {
	storageMock.state.data.clear()
	storageMock.state.failKeys.clear()
	vi.useFakeTimers()
	vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
	;(globalThis as unknown as Record<string, unknown>).chrome = {
		storage: {
			local: {
				get: createChromeStorageGet(),
			},
		},
	}

	vi.resetModules()
	notesModule = await import('../../../src/lib/notes/storage')
})

afterEach(() => {
	vi.useRealTimers()
})

describe('notes storage', () => {
	it('creates notes with normalized defaults and persisted index', async () => {
		const note = await notesModule.createNote({
			title: 'Title',
			content: 'First line\n\nSecond line',
			html: '',
			folderId: undefined,
			favorite: undefined,
		})

		expect(note.folderId).toBeNull()
		expect(note.favorite).toBe(false)
		expect(note.html).toContain('<p>First line</p>')

		const notes = await notesModule.getNotes()
		expect(notes).toHaveLength(1)
		expect(notes[0].id).toBe(note.id)
	})

	it('updates notes without changing createdAt and bumps updatedAt', async () => {
		const note = await notesModule.createNote({
			title: 'Original',
			content: 'Body',
			html: '<p onclick="x()">Body</p>',
			folderId: null,
			favorite: false,
		})

		vi.setSystemTime(new Date('2026-01-01T00:10:00.000Z'))
		const updated = await notesModule.updateNote(note.id, {
			title: 'Updated',
			html: '<p onclick="x()">Updated</p>',
		})

		expect(updated).not.toBeNull()
		expect(updated?.createdAt).toBe(note.createdAt)
		expect(updated?.updatedAt).toBeGreaterThan(note.updatedAt)
		expect(updated?.html).toBe('<p>Updated</p>')
	})

	it('deleting a folder moves its notes to root instead of deleting notes', async () => {
		const folder = await notesModule.createFolder('Work')
		const note = await notesModule.createNote({
			title: 'In folder',
			content: 'Body',
			html: '<p>Body</p>',
			folderId: folder.id,
			favorite: false,
		})

		await notesModule.deleteFolder(folder.id)

		const folders = await notesModule.getFolders()
		expect(folders.find((item) => item.id === folder.id)).toBeUndefined()

		const notes = await notesModule.getNotes()
		const moved = notes.find((item) => item.id === note.id)
		expect(moved?.folderId).toBeNull()
	})

	it('serializes per-note mutations for favorite toggles', async () => {
		const note = await notesModule.createNote({
			title: 'Favorite test',
			content: 'Body',
			html: '<p>Body</p>',
			folderId: null,
			favorite: false,
		})

		await Promise.all([
			notesModule.toggleNoteFavorite(note.id),
			notesModule.toggleNoteFavorite(note.id),
		])

		const latest = (await notesModule.getNotes()).find(
			(item) => item.id === note.id,
		)
		expect(latest?.favorite).toBe(false)
	})

	it('recovers notes when primary index read fails', async () => {
		const note = await notesModule.createNote({
			title: 'Recover me',
			content: 'Body',
			html: '<p>Body</p>',
			folderId: null,
			favorite: false,
		})

		storageMock.state.failKeys.add('notes:index')
		const recovered = await notesModule.getNotes()

		expect(recovered).toHaveLength(1)
		expect(recovered[0].id).toBe(note.id)
	})

	it('recovers folders when primary folder read fails', async () => {
		const folder = await notesModule.createFolder('Recovered folder')

		storageMock.state.failKeys.add('noteFolders')
		const recoveredFolders = await notesModule.getFolders()

		expect(
			recoveredFolders.find((item) => item.id === folder.id),
		).toBeTruthy()
	})
})
