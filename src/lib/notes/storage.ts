import { Storage } from '@plasmohq/storage'

import type { Note, NoteFolder } from './types'
import { sanitizeHtml, textToHtml } from './utils'

const storage = new Storage({
	area: 'local',
})

const NOTES_INDEX_KEY = 'notes:index'
const NOTE_KEY_PREFIX = 'notes:item:'
const FOLDERS_KEY = 'noteFolders'

export const ROOT_FOLDER_ID = '__root__'

const noteMutationQueues = new Map<string, Promise<unknown>>()

function createId(): string {
	if (
		typeof crypto !== 'undefined' &&
		typeof crypto.randomUUID === 'function'
	) {
		return crypto.randomUUID()
	}

	return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function getNoteKey(noteId: string): string {
	return `${NOTE_KEY_PREFIX}${noteId}`
}

function normalizeNote(note: Note): Note {
	const content = note.content ?? ''
	const html = note.html ? sanitizeHtml(note.html) : textToHtml(content)
	const createdAt = Number(note.createdAt) || Date.now()
	const updatedAt = Number(note.updatedAt) || createdAt

	return {
		...note,
		content,
		html,
		folderId: note.folderId ?? null,
		favorite: Boolean(note.favorite),
		createdAt,
		updatedAt,
	}
}

function decodeStoredValue<T>(value: unknown): T | null {
	if (value === null || value === undefined) return null
	if (typeof value === 'string') {
		try {
			return JSON.parse(value) as T
		} catch {
			return null
		}
	}
	return value as T
}

async function getNoteIds(): Promise<string[]> {
	return (await storage.get<string[]>(NOTES_INDEX_KEY)) ?? []
}

async function setNoteIds(noteIds: string[]): Promise<void> {
	await storage.set(NOTES_INDEX_KEY, [...new Set(noteIds)])
}

async function getNoteById(noteId: string): Promise<Note | null> {
	const note = await storage.get<Note>(getNoteKey(noteId))
	return note ? normalizeNote(note) : null
}

async function saveNote(note: Note): Promise<void> {
	await storage.set(getNoteKey(note.id), normalizeNote(note))
}

async function recoverNotesFromStorage(): Promise<Note[]> {
	if (typeof chrome === 'undefined' || !chrome.storage?.local) return []

	const stored = (await (chrome.storage.local.get(
		null,
	) as unknown as Promise<Record<string, unknown>>)) as Record<
		string,
		unknown
	>
	const recovered: Note[] = []

	for (const [key, value] of Object.entries(stored)) {
		if (!key.startsWith(NOTE_KEY_PREFIX)) continue

		const note = decodeStoredValue<Note>(value)
		if (!note?.id) continue

		recovered.push(normalizeNote(note))
	}

	return recovered.sort(
		(a, b) => (b.updatedAt ?? b.createdAt) - (a.updatedAt ?? a.createdAt),
	)
}

async function recoverFoldersFromStorage(): Promise<NoteFolder[]> {
	if (typeof chrome === 'undefined' || !chrome.storage?.local) return []

	const stored = await chrome.storage.local.get(FOLDERS_KEY)
	const folders = decodeStoredValue<NoteFolder[]>(stored[FOLDERS_KEY])
	return Array.isArray(folders) ? folders : []
}

function withNoteMutation<T>(
	noteId: string,
	operation: () => Promise<T>,
): Promise<T> {
	const previous = noteMutationQueues.get(noteId) ?? Promise.resolve()
	const next = previous.catch(() => undefined).then(operation)

	noteMutationQueues.set(noteId, next)

	void next.finally(() => {
		if (noteMutationQueues.get(noteId) === next) {
			noteMutationQueues.delete(noteId)
		}
	})

	return next
}

async function updateNoteUnsafe(
	noteId: string,
	updates: Partial<Note>,
): Promise<Note | null> {
	const note = await getNoteById(noteId)
	if (!note) return null

	const updatedNote = normalizeNote({
		...note,
		...updates,
		updatedAt: Date.now(),
	})

	await saveNote(updatedNote)
	return updatedNote
}

export async function getNotes(): Promise<Note[]> {
	let noteIds: string[] = []

	try {
		noteIds = await getNoteIds()

		const notes = await Promise.all(
			noteIds.map((noteId) => getNoteById(noteId)),
		)
		const indexedNotes = notes.filter(
			(note): note is Note => note !== null,
		)

		if (indexedNotes.length === noteIds.length) {
			return indexedNotes.sort(
				(a, b) =>
					(b.updatedAt ?? b.createdAt) -
					(a.updatedAt ?? a.createdAt),
			)
		}
	} catch (error) {
		console.warn(
			'Primary note storage read failed; recovering notes:',
			error,
		)
	}

	try {
		const recoveredNotes = await recoverNotesFromStorage()

		if (recoveredNotes.length > 0) {
			await setNoteIds(recoveredNotes.map((note) => note.id))
		}

		return recoveredNotes
	} catch (error) {
		console.error('Failed to recover notes from extension storage:', error)
		return []
	}
}

export async function getFolders(): Promise<NoteFolder[]> {
	try {
		const folders = (await storage.get<NoteFolder[]>(FOLDERS_KEY)) ?? []
		if (folders.length > 0) return folders
	} catch (error) {
		console.warn(
			'Primary folder storage read failed; recovering folders:',
			error,
		)
	}

	try {
		return await recoverFoldersFromStorage()
	} catch (error) {
		console.error(
			'Failed to recover folders from extension storage:',
			error,
		)
		return []
	}
}

export async function saveFolders(folders: NoteFolder[]): Promise<void> {
	await storage.set(FOLDERS_KEY, folders)
}

export async function deleteFolder(folderId: string): Promise<void> {
	const folders = await getFolders()
	await saveFolders(folders.filter((folder) => folder.id !== folderId))

	const notes = await getNotes()
	await Promise.all(
		notes
			.filter((note) => note.folderId === folderId)
			.map((note) => updateNote(note.id, { folderId: null })),
	)
}

export async function createNote(
	note: Omit<Note, 'id' | 'createdAt'>,
): Promise<Note> {
	const now = Date.now()
	const newNote = normalizeNote({
		...note,
		id: createId(),
		createdAt: now,
		updatedAt: now,
	})

	await saveNote(newNote)
	const noteIds = await getNoteIds()
	await setNoteIds([
		newNote.id,
		...noteIds.filter((id) => id !== newNote.id),
	])

	return newNote
}

export async function createFolder(name: string): Promise<NoteFolder> {
	const folders = await getFolders()
	const folder: NoteFolder = {
		id: createId(),
		name: name.trim(),
		createdAt: Date.now(),
	}

	await saveFolders([...folders, folder])
	return folder
}

export async function updateNote(
	noteId: string,
	updates: Partial<Note>,
): Promise<Note | null> {
	return withNoteMutation(noteId, () => updateNoteUnsafe(noteId, updates))
}

export async function deleteNote(noteId: string): Promise<void> {
	return withNoteMutation(noteId, async () => {
		const noteIds = await getNoteIds()
		if (!noteIds.includes(noteId)) return

		await storage.remove(getNoteKey(noteId))
		await setNoteIds(noteIds.filter((id) => id !== noteId))
	})
}

export async function moveNote(
	noteId: string,
	folderId: string | null,
): Promise<Note | null> {
	return updateNote(noteId, { folderId })
}

export async function toggleNoteFavorite(
	noteId: string,
): Promise<Note | null> {
	return withNoteMutation(noteId, async () => {
		const note = await getNoteById(noteId)
		if (!note) return null

		return updateNoteUnsafe(noteId, {
			favorite: !note.favorite,
		})
	})
}
