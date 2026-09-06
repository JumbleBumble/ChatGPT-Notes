import {
	formatDate,
	getSearchMatchCount,
	highlightHtml,
	sanitizeHtml,
	textToHtml,
} from '../../../src/lib/notes/utils'

describe('formatDate', () => {
	it('returns relative time for recent timestamps', () => {
		const now = Date.now()

		expect(formatDate(now - 20_000)).toBe('Just now')
		expect(formatDate(now - 2 * 60_000)).toBe('2m ago')
		expect(formatDate(now - 2 * 3_600_000)).toBe('2h ago')
		expect(formatDate(now - 2 * 86_400_000)).toBe('2d ago')
	})
})

describe('textToHtml', () => {
	it('escapes unsafe characters', () => {
		const html = textToHtml('<script>alert("x")</script> & "quote"')

		expect(html).toContain(
			'&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;',
		)
		expect(html).toContain('&amp;')
	})

	it('converts unordered list blocks', () => {
		const html = textToHtml('- first\n- second')
		expect(html).toBe('<ul><li>first</li><li>second</li></ul>')
	})

	it('converts ordered list blocks', () => {
		const html = textToHtml('1. one\n2. two')
		expect(html).toBe('<ol><li>one</li><li>two</li></ol>')
	})

	it('converts paragraphs and line breaks', () => {
		const html = textToHtml('line 1\nline 2\n\nnext paragraph')
		expect(html).toBe('<p>line 1<br />line 2</p><p>next paragraph</p>')
	})
})

describe('sanitizeHtml', () => {
	it('removes executable tags and handler/style attributes', () => {
		const dirty =
			'<p style="color:red" onclick="x()">Hello</p><script>alert(1)</script>'
		const clean = sanitizeHtml(dirty)

		expect(clean).toBe('<p>Hello</p>')
	})
})

describe('highlightHtml', () => {
	it('sanitizes and returns html when query is empty', () => {
		const output = highlightHtml(
			'<p onclick="boom()">safe</p><script>bad()</script>',
			'',
		)

		expect(output).toBe('<p>safe</p>')
	})

	it('adds mark tags for case-insensitive matches', () => {
		const output = highlightHtml(
			'<p>ChatGPT notes and chatgpt snippets</p>',
			'chatgpt',
		)

		expect(output).toBe(
			'<p><mark>ChatGPT</mark> notes and <mark>chatgpt</mark> snippets</p>',
		)
	})
})

describe('getSearchMatchCount', () => {
	it('counts case-insensitive matches', () => {
		expect(getSearchMatchCount('Alpha beta ALPHA', 'alpha')).toBe(2)
	})

	it('returns zero for empty query', () => {
		expect(getSearchMatchCount('Alpha beta', '   ')).toBe(0)
	})
})
