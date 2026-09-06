import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const responseMocks = vi.hoisted(() => ({
	buildResponseData: vi.fn(),
	getAssistantMessage: vi.fn(),
	getResponseContent: vi.fn(),
	isExcludedElement: vi.fn(),
	scorePickedCandidate: vi.fn(),
}))

vi.mock('../../../src/lib/chatgpt/response', () => ({
	buildResponseData: responseMocks.buildResponseData,
	getAssistantMessage: responseMocks.getAssistantMessage,
	getResponseContent: responseMocks.getResponseContent,
	isExcludedElement: responseMocks.isExcludedElement,
	scorePickedCandidate: responseMocks.scorePickedCandidate,
}))

type PickerModule = typeof import('../../../src/lib/chatgpt/picker')
let pickerModule: PickerModule

function mouseEvent(type: string, target: HTMLElement): MouseEvent {
	const event = new MouseEvent(type, {
		bubbles: true,
		cancelable: true,
	})

	Object.defineProperty(event, 'target', {
		value: target,
		enumerable: true,
	})

	return event
}

function keyboardEvent(key: string): KeyboardEvent {
	return new KeyboardEvent('keydown', {
		key,
		bubbles: true,
		cancelable: true,
	})
}

beforeEach(async () => {
	document.body.innerHTML = ''
	vi.resetModules()

	responseMocks.buildResponseData.mockReset()
	responseMocks.getAssistantMessage.mockReset()
	responseMocks.getResponseContent.mockReset()
	responseMocks.isExcludedElement.mockReset()
	responseMocks.scorePickedCandidate.mockReset()

	responseMocks.isExcludedElement.mockReturnValue(false)
	responseMocks.scorePickedCandidate.mockReturnValue(0)

	pickerModule = await import('../../../src/lib/chatgpt/picker')
})

afterEach(() => {
	document.body.innerHTML = ''
})

describe('pickElement', () => {
	it('returns promoted known response content on click', async () => {
		document.body.innerHTML = `
			<div data-message-author-role="assistant" id="assistant">
				<div id="response">Response text <span id="target">Pick this</span></div>
			</div>
		`

		const assistant = document.querySelector('#assistant') as HTMLElement
		const response = document.querySelector('#response') as HTMLElement
		const target = document.querySelector('#target') as HTMLElement

		responseMocks.getAssistantMessage.mockReturnValue(assistant)
		responseMocks.getResponseContent.mockReturnValue(response)

		const pickedPromise = pickerModule.pickElement()
		document.dispatchEvent(mouseEvent('mousemove', target))
		document.dispatchEvent(mouseEvent('click', target))

		await expect(pickedPromise).resolves.toBe(response)
		expect(
			document.querySelector('[data-chatgpt-notes-picker="true"]'),
		).toBeNull()
	})

	it('ignores excluded targets and resolves when a valid target is clicked', async () => {
		document.body.innerHTML = `
			<div data-message-author-role="assistant" id="assistant">
				<div id="excluded" data-excluded="true">Nope</div>
				<div id="valid">Valid pickable text</div>
			</div>
		`

		const excluded = document.querySelector('#excluded') as HTMLElement
		const valid = document.querySelector('#valid') as HTMLElement

		responseMocks.isExcludedElement.mockImplementation(
			(element: Element) => element.hasAttribute('data-excluded'),
		)
		responseMocks.getAssistantMessage.mockReturnValue(null)

		const pickedPromise = pickerModule.pickElement()
		let resolved = false
		void pickedPromise.then(() => {
			resolved = true
		})

		document.dispatchEvent(mouseEvent('mousemove', excluded))
		document.dispatchEvent(mouseEvent('click', excluded))
		await Promise.resolve()
		expect(resolved).toBe(false)

		document.dispatchEvent(mouseEvent('mousemove', valid))
		document.dispatchEvent(mouseEvent('click', valid))
		await expect(pickedPromise).resolves.toBe(valid)
	})

	it('returns highest-scored ancestor candidate when ranking is used', async () => {
		document.body.innerHTML = `
			<div data-message-author-role="assistant" id="assistant">
				<section id="middle">
					<div id="target">Target long enough to be scored safely</div>
				</section>
			</div>
		`

		const assistant = document.querySelector('#assistant') as HTMLElement
		const middle = document.querySelector('#middle') as HTMLElement
		const target = document.querySelector('#target') as HTMLElement

		responseMocks.getAssistantMessage.mockReturnValue(assistant)
		responseMocks.getResponseContent.mockReturnValue(null)
		responseMocks.scorePickedCandidate.mockImplementation(
			(candidate: HTMLElement) => {
				if (candidate.id === 'middle') return 100
				if (candidate.id === 'assistant') return 10
				return 1
			},
		)

		const pickedPromise = pickerModule.pickElement()
		document.dispatchEvent(mouseEvent('mousemove', target))
		document.dispatchEvent(mouseEvent('click', target))

		await expect(pickedPromise).resolves.toBe(middle)
	})

	it('returns null when escape is pressed', async () => {
		const pickedPromise = pickerModule.pickElement()
		document.dispatchEvent(keyboardEvent('Escape'))

		await expect(pickedPromise).resolves.toBeNull()
	})
})

describe('pickResponseData', () => {
	it('returns response payload for selected element', async () => {
		document.body.innerHTML = '<div id="target">Select me</div>'
		const target = document.querySelector('#target') as HTMLElement

		responseMocks.getAssistantMessage.mockReturnValue(null)
		responseMocks.buildResponseData.mockReturnValue({
			text: 'Selected response',
			html: '<p>Selected response</p>',
		})

		const responsePromise = pickerModule.pickResponseData()
		document.dispatchEvent(mouseEvent('mousemove', target))
		document.dispatchEvent(mouseEvent('click', target))

		await expect(responsePromise).resolves.toEqual({
			text: 'Selected response',
			html: '<p>Selected response</p>',
		})
	})

	it('returns null when selected response has empty text', async () => {
		document.body.innerHTML = '<div id="target">Select me</div>'
		const target = document.querySelector('#target') as HTMLElement

		responseMocks.getAssistantMessage.mockReturnValue(null)
		responseMocks.buildResponseData.mockReturnValue({
			text: '',
			html: '<p></p>',
		})

		const responsePromise = pickerModule.pickResponseData()
		document.dispatchEvent(mouseEvent('mousemove', target))
		document.dispatchEvent(mouseEvent('click', target))

		await expect(responsePromise).resolves.toBeNull()
	})
})
