import Papa from 'papaparse'
import { jsPDF } from 'jspdf'
import TurndownService from 'turndown'
import { gfm } from 'turndown-plugin-gfm'
import type { Note } from './types'
import { sanitizeHtml } from './utils'

const PDF_MARGIN = 40
const PDF_LINE_HEIGHT = 18
const PDF_FONT_SIZE = 11

type CsvRow = string[]

const markdownConverter = new TurndownService({
	headingStyle: 'atx',
	codeBlockStyle: 'fenced',
	bulletListMarker: '-',
})

markdownConverter.use(gfm)

function toSafeFilename(value: string): string {
	const normalized = value.trim() || 'untitled-note'
	return normalized
		.replace(/[\\/:*?"<>|]+/g, '-')
		.replace(/\s+/g, ' ')
		.slice(0, 96)
}

function downloadTextFile(
	filename: string,
	content: string,
	mimeType: string,
): void {
	const blob = new Blob([content], { type: mimeType })
	const url = URL.createObjectURL(blob)
	const anchor = document.createElement('a')
	anchor.href = url
	anchor.download = filename
	document.body.append(anchor)
	anchor.click()
	anchor.remove()
	setTimeout(() => URL.revokeObjectURL(url), 0)
}

export function getMarkdownContent(note: Note): string {
	const createdAt = new Date(note.createdAt).toISOString()
	const updatedAt = new Date(note.updatedAt ?? note.createdAt).toISOString()
	const html = note.html.trim()
	const markdownBody = html
		? markdownConverter.turndown(sanitizeHtml(html)).trim()
		: note.content.trim()
	const body = markdownBody || note.content.trim()

	return `# ${note.title}\n\nCreated: ${createdAt}\nUpdated: ${updatedAt}\n\n${body}\n`
}

export function getCsvRows(content: string): CsvRow[] | null {
	const trimmed = content.trim()
	if (!trimmed) return null
	if (!trimmed.includes(',') && !trimmed.includes('\n')) return null

	const parsed = Papa.parse<string[]>(trimmed, {
		skipEmptyLines: 'greedy',
	})

	if (parsed.errors.length > 0 || parsed.meta.aborted) {
		return null
	}

	const rows = parsed.data.filter((row) => row.length > 0)
	if (rows.length === 0) return null

	const columnCount = rows[0].length
	if (columnCount === 0) return null

	const validShape = rows.every((row) => row.length === columnCount)
	if (!validShape) return null

	return rows
}

export function exportNoteAsMarkdown(note: Note): void {
	const filename = `${toSafeFilename(note.title)}.md`
	downloadTextFile(
		filename,
		getMarkdownContent(note),
		'text/markdown;charset=utf-8',
	)
}

export function exportNoteAsCsv(note: Note): boolean {
	const rows = getCsvRows(note.content)
	if (!rows) return false

	const csv = Papa.unparse(rows)
	const filename = `${toSafeFilename(note.title)}.csv`
	downloadTextFile(filename, csv, 'text/csv;charset=utf-8')
	return true
}

export async function exportNoteAsPdf(note: Note): Promise<void> {
	const doc = new jsPDF({ unit: 'pt', format: 'a4' })
	const pageWidth = doc.internal.pageSize.getWidth()
	const pageHeight = doc.internal.pageSize.getHeight()
	const usableWidth = pageWidth - PDF_MARGIN * 2

	doc.setFont('helvetica', 'bold')
	doc.setFontSize(16)
	doc.text(note.title || 'Untitled Note', PDF_MARGIN, PDF_MARGIN)

	doc.setFont('helvetica', 'normal')
	doc.setFontSize(PDF_FONT_SIZE)
	let y = PDF_MARGIN + 24
	const timestamp = `Updated: ${new Date(note.updatedAt ?? note.createdAt).toLocaleString()}`
	doc.text(timestamp, PDF_MARGIN, y)
	y += 22

	const lines = doc.splitTextToSize(
		note.content || '',
		usableWidth,
	) as string[]

	for (const line of lines) {
		if (y > pageHeight - PDF_MARGIN) {
			doc.addPage()
			y = PDF_MARGIN
		}
		doc.text(line, PDF_MARGIN, y)
		y += PDF_LINE_HEIGHT
	}

	doc.save(`${toSafeFilename(note.title)}.pdf`)
}
