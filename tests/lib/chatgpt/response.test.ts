import {
	buildResponseData,
	cleanResponseClone,
	getAssistantMessage,
	getResponseContent,
	getResponseData,
	scorePickedCandidate,
} from '../../../src/lib/chatgpt/response'

function createRoot(html: string): HTMLElement {
	const root = document.createElement('div')
	root.innerHTML = html
	document.body.innerHTML = ''
	document.body.appendChild(root)
	return root
}

describe('getAssistantMessage', () => {
	it('finds closest assistant message element', () => {
		const root = createRoot(`
			<div data-message-author-role="assistant" id="assistant">
				<div aria-label="Response actions"><button id="save">Save</button></div>
			</div>
		`)
		const actionGroup = root.querySelector('#save') as HTMLElement
		const result = getAssistantMessage(actionGroup)

		expect(result?.id).toBe('assistant')
	})

	it('finds assistant message in ancestor subtree fallback', () => {
		const root = createRoot(`
			<section>
				<div id="container">
					<div id="action-wrap"><button id="save">Save</button></div>
					<div data-message-author-role="assistant" id="assistant">Answer text</div>
				</div>
			</section>
		`)
		const actionGroup = root.querySelector('#save') as HTMLElement
		const result = getAssistantMessage(actionGroup)

		expect(result?.id).toBe('assistant')
	})
})

describe('getResponseContent', () => {
	it('prefers markdown-like selectors with text', () => {
		const root = createRoot(`
			<div data-message-author-role="assistant">
				<div class="markdown" id="content">Useful answer content</div>
			</div>
		`)
		const assistant = root.querySelector(
			'[data-message-author-role="assistant"]',
		) as HTMLElement
		const result = getResponseContent(assistant)

		expect(result?.id).toBe('content')
	})
})

describe('cleanResponseClone and buildResponseData', () => {
	it('removes extension controls and interactive elements', () => {
		const root = createRoot(`
			<div id="content">
				<p>Answer</p>
				<button>Ignored</button>
				<div data-chatgpt-notes-ui="true">Extension UI</div>
			</div>
		`)
		const content = root.querySelector('#content') as HTMLElement
		const clone = cleanResponseClone(content)

		expect(clone.querySelector('button')).toBeNull()
		expect(
			clone.querySelector('[data-chatgpt-notes-ui="true"]'),
		).toBeNull()
	})

	it('builds sanitized response text/html payload', () => {
		const root = createRoot(`
			<div id="content">
				<p onclick="boom()">Safe text</p>
				<script>alert('x')</script>
			</div>
		`)
		const content = root.querySelector('#content') as HTMLElement
		const response = buildResponseData(content)

		expect(response.html).toBe('<p>Safe text</p>')
		expect(response.text).toBe('Safe text')
	})
})

describe('getResponseData', () => {
	it('returns null when no assistant message is found', () => {
		const root = createRoot('<div><button id="save">Save</button></div>')
		const actionGroup = root.querySelector('#save') as HTMLElement

		expect(getResponseData(actionGroup)).toBeNull()
	})
})

describe('scorePickedCandidate', () => {
	it('rejects excluded and very short elements', () => {
		const root = createRoot(`
			<div>
				<button id="btn">short</button>
				<div id="tiny">small</div>
			</div>
		`)
		const btn = root.querySelector('#btn') as HTMLElement
		const tiny = root.querySelector('#tiny') as HTMLElement

		expect(scorePickedCandidate(btn, btn)).toBe(-Infinity)
		expect(scorePickedCandidate(tiny, tiny)).toBe(-Infinity)
	})

	it('scores likely response containers higher than plain wrappers', () => {
		const root = createRoot(`
			<div id="plain">${'a'.repeat(140)}</div>
			<article class="markdown" data-testid="response-content" id="rich">${'b'.repeat(140)}</article>
		`)
		const plain = root.querySelector('#plain') as HTMLElement
		const rich = root.querySelector('#rich') as HTMLElement

		expect(scorePickedCandidate(rich, rich)).toBeGreaterThan(
			scorePickedCandidate(plain, plain),
		)
	})
})
