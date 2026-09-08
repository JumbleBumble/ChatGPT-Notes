import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
	filterConversationTurns,
	getConversationCapture,
	getConversationTurnsCapture,
	type ConversationTurn,
} from '../../../src/lib/chatgpt/conversation'

beforeEach(() => {
	document.body.innerHTML = ''
	document.title = 'ChatGPT'
	window.history.replaceState(
		{},
		'',
		'/c/6a8d24b8-510c-83ea-a792-552ef3271d55',
	)
	vi.restoreAllMocks()
})

afterEach(() => {
	document.body.innerHTML = ''
})

describe('getConversationCapture', () => {
	it('captures full conversation from DOM sections', async () => {
		document.title = 'Sample Conversation - ChatGPT'

		document.body.innerHTML = `
			<main>
				<section data-testid="conversation-turn-2" data-turn="assistant" data-turn-id="turn-2">
					<div data-message-author-role="assistant" data-message-id="m-2">
						<div class="markdown">
							<p>Here is the summary.</p>
							<button>Ignore this button</button>
						</div>
					</div>
				</section>
				<section data-testid="conversation-turn-1" data-turn="user" data-turn-id="turn-1">
					<div data-message-author-role="user" data-message-id="m-1">
						<div class="markdown">What is the summary?</div>
					</div>
				</section>
			</main>
		`

		const result = await getConversationCapture()

		expect(result.source).toBe('dom')
		expect(result.title).toBe('Sample Conversation')
		expect(result.data?.text).toContain('User:\nWhat is the summary?')
		expect(result.data?.text).toContain('Assistant:\nHere is the summary.')
		expect(result.data?.text).not.toContain('Ignore this button')
	})

	it('supports assistant-only capture mode for DOM capture', async () => {
		document.body.innerHTML = `
			<main>
				<div data-message-author-role="user">
					<div class="markdown">User line</div>
				</div>
				<div data-message-author-role="assistant">
					<div class="markdown">Assistant line</div>
				</div>
			</main>
		`

		const result = await getConversationCapture({
			includeMode: 'assistant',
		})

		expect(result.source).toBe('dom')
		expect(result.data?.text).toContain('Assistant:\nAssistant line')
		expect(result.data?.text).not.toContain('User:\nUser line')
	})

	it('returns none when no conversation turns are available', async () => {
		document.body.innerHTML = '<main><p>No chat content yet</p></main>'

		const result = await getConversationCapture()

		expect(result.source).toBe('none')
		expect(result.data).toBeNull()
	})
})

describe('getConversationTurnsCapture + filterConversationTurns', () => {
	const turnDom = `
		<main>
			<section data-testid="conversation-turn-1" data-turn="user" data-turn-id="turn-1">
				<div data-message-author-role="user" data-message-id="m-1">
					<div class="markdown">First question</div>
				</div>
			</section>
			<section data-testid="conversation-turn-2" data-turn="assistant" data-turn-id="turn-2">
				<div data-message-author-role="assistant" data-message-id="m-2">
					<div class="markdown"><p>First answer</p></div>
				</div>
			</section>
			<section data-testid="conversation-turn-3" data-turn="user" data-turn-id="turn-3">
				<div data-message-author-role="user" data-message-id="m-3">
					<div class="markdown">Second question</div>
				</div>
			</section>
		</main>
	`

	it('returns raw turns so include mode can be re-filtered without re-crawling', async () => {
		document.body.innerHTML = turnDom

		const capture = await getConversationTurnsCapture()

		expect(capture.source).toBe('dom')
		expect(capture.turns).toHaveLength(3)

		const both = filterConversationTurns(capture.turns, 'both')
		const assistantOnly = filterConversationTurns(
			capture.turns,
			'assistant',
		)

		expect(both?.text).toContain('User:\nFirst question')
		expect(both?.text).toContain('Assistant:\nFirst answer')
		expect(assistantOnly?.text).toContain('Assistant:\nFirst answer')
		expect(assistantOnly?.text).not.toContain('User:\nFirst question')
	})

	it('filterConversationTurns preserves order and returns null for empty turns', () => {
		const turns: ConversationTurn[] = [
			{ role: 'user', text: 'Q1' },
			{ role: 'assistant', text: 'A1' },
			{ role: 'user', text: 'Q2' },
		]

		const filtered = filterConversationTurns(turns, 'assistant')
		expect(filtered?.text).toBe('Assistant:\nA1')

		expect(filterConversationTurns([], 'both')).toBeNull()
	})
})
