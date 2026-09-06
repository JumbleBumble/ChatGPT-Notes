import { getCsvRows, getMarkdownContent } from '../../../src/lib/notes/export'
import type { Note } from '../../../src/lib/notes/types'

const baseNote: Note = {
	id: 'note-1',
	title: 'Release Notes',
	content: 'alpha\nbeta',
	html: '<h2>Summary</h2><p>alpha</p><ul><li>one</li><li>two</li></ul><script>bad()</script>',
	createdAt: 1_700_000_000_000,
	updatedAt: 1_700_000_000_500,
	folderId: null,
	favorite: false,
}

describe('getMarkdownContent', () => {
	it('creates markdown with title, timestamps, and rich markdown body', () => {
		const markdown = getMarkdownContent(baseNote)

		expect(markdown).toContain('# Release Notes')
		expect(markdown).toContain('Created: 2023-11-14T22:13:20.000Z')
		expect(markdown).toContain('Updated: 2023-11-14T22:13:20.500Z')
		expect(markdown).toContain('## Summary')
		expect(markdown).toContain('-   one')
		expect(markdown).toContain('-   two')
		expect(markdown).not.toContain('<script>')
	})

	it('falls back to plain text content when html is empty', () => {
		const markdown = getMarkdownContent({
			...baseNote,
			html: '   ',
		})

		expect(markdown).toContain('alpha\nbeta')
	})
})

describe('getCsvRows', () => {
	it('returns rows for valid csv', () => {
		const rows = getCsvRows('name,age\nAlice,31\nBob,29')
		expect(rows).toEqual([
			['name', 'age'],
			['Alice', '31'],
			['Bob', '29'],
		])
	})

	it('supports quoted fields with commas', () => {
		const rows = getCsvRows('name,summary\nAlice,"hello, world"')
		expect(rows).toEqual([
			['name', 'summary'],
			['Alice', 'hello, world'],
		])
	})

	it('rejects invalid csv with uneven columns', () => {
		const rows = getCsvRows('name,age\nAlice,31,extra')
		expect(rows).toBeNull()
	})

	it('rejects plain text that cannot be extracted as csv', () => {
		const rows = getCsvRows('This is not csv data')
		expect(rows).toBeNull()
	})
})
