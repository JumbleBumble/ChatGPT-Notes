import DOMPurify from 'dompurify'
import type { ResponseData } from '../notes/types'

export function getAssistantMessage(actionGroup: Element): HTMLElement | null {
	const directMessage = actionGroup.closest(
		'[data-message-author-role="assistant"]',
	)

	if (directMessage instanceof HTMLElement) {
		return directMessage
	}

	let ancestor: Element | null = actionGroup.parentElement

	while (ancestor) {
		const assistantMessage = ancestor.querySelector(
			'[data-message-author-role="assistant"]',
		)

		if (assistantMessage instanceof HTMLElement) {
			return assistantMessage
		}

		ancestor = ancestor.parentElement
	}

	return null
}

export function getResponseContent(
	assistantMessage: HTMLElement,
): HTMLElement | null {
	const selectors = [
		'.markdown',
		'[data-message-content="true"]',
		'[data-testid*="conversation-turn-content"]',
		'[data-testid*="message-content"]',
		'[data-testid*="assistant-message"]',
		'[data-testid*="response-content"]',
		'.whitespace-pre-wrap',
		'.prose',
		'div[class*="markdown"]',
		'div[class*="prose"]',
		'main article',
		'article [dir="auto"]',
		'[data-message-author-role="assistant"] > div',
	]

	for (const selector of selectors) {
		const elements = assistantMessage.querySelectorAll(selector)

		for (const element of elements) {
			if (!(element instanceof HTMLElement)) {
				continue
			}

			const text = element.innerText.trim()

			if (text.length > 0) {
				return element
			}
		}
	}

	const candidates = Array.from(
		assistantMessage.querySelectorAll('div, section, article, main'),
	).filter((element): element is HTMLElement => {
		if (!(element instanceof HTMLElement)) {
			return false
		}

		if (element.closest('[aria-label="Response actions"]')) {
			return false
		}

		if (element.querySelector('[aria-label="Response actions"]')) {
			return false
		}

		if (element.closest('[data-chatgpt-notes-ui="true"]')) {
			return false
		}

		const text = element.innerText.trim()

		return text.length > 80
	})

	candidates.sort((a, b) => a.innerText.length - b.innerText.length)

	return candidates[0] ?? null
}

export function isExcludedElement(element: Element): boolean {
	return Boolean(
		element.closest(
			[
				'[aria-label="Response actions"]',
				'[data-chatgpt-notes-ui="true"]',
				'[data-chatgpt-notes-picker="true"]',
				'[data-chatgpt-notes-button="true"]',
				'button',
				'input',
				'textarea',
				'select',
				'[role="button"]',
			].join(','),
		),
	)
}

export function cleanResponseClone(element: HTMLElement): HTMLElement {
	const clone = element.cloneNode(true) as HTMLElement

	const selectorsToRemove = [
		'[aria-label="Response actions"]',
		'[data-chatgpt-notes-ui="true"]',
		'[data-chatgpt-notes-button="true"]',
		'[data-chatgpt-notes-picker="true"]',
		'button',
		'input',
		'textarea',
		'select',
		'[role="button"]',
		'[aria-hidden="true"]',
		'video',
		'audio',
		'script',
		'style',
		'noscript',
	]

	for (const selector of selectorsToRemove) {
		clone.querySelectorAll(selector).forEach((node) => {
			node.remove()
		})
	}

	return clone
}

export function sanitizeHtml(html: string): string {
	return DOMPurify.sanitize(html, {
		USE_PROFILES: {
			html: true,
		},
		FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed'],
		FORBID_ATTR: [
			'onerror',
			'onload',
			'onclick',
			'onmouseover',
			'onmousedown',
			'onmouseup',
			'onfocus',
			'onblur',
			'style',
		],
	})
}

export function buildResponseData(element: HTMLElement): ResponseData {
	const clone = cleanResponseClone(element)
	const html = sanitizeHtml(clone.innerHTML)

	const container = document.createElement('div')
	container.innerHTML = html

	return {
		text: container.innerText.trim(),
		html,
	}
}

export function getResponseData(actionGroup: Element): ResponseData | null {
	const assistantMessage = getAssistantMessage(actionGroup)

	if (!assistantMessage) {
		return null
	}

	const responseContent = getResponseContent(assistantMessage)

	if (!responseContent) {
		return null
	}

	const response = buildResponseData(responseContent)

	return response.text ? response : null
}

export function scorePickedCandidate(
	element: HTMLElement,
	originalElement: HTMLElement,
): number {
	if (isExcludedElement(element)) {
		return -Infinity
	}

	const text = element.innerText.trim()

	if (text.length < 20) {
		return -Infinity
	}

	let score = 0

	const tag = element.tagName.toLowerCase()
	const className =
		typeof element.className === 'string'
			? element.className.toLowerCase()
			: ''
	const id = element.id.toLowerCase()
	const testId = element.getAttribute('data-testid')?.toLowerCase() ?? ''

	if (tag === 'article') score += 40
	if (tag === 'section') score += 25
	if (tag === 'main') score += 25

	if (className.includes('markdown') || className.includes('prose')) {
		score += 50
	}

	if (id.includes('message') || id.includes('response')) {
		score += 30
	}

	if (
		testId.includes('message') ||
		testId.includes('response') ||
		testId.includes('conversation')
	) {
		score += 40
	}

	if (element.getAttribute('data-message-author-role') === 'assistant') {
		score += 40
	}

	if (element.querySelector('pre, code, ol, ul, table')) {
		score += 15
	}

	if (text.length > 120) {
		score += 10
	}

	if (text.length > 500) {
		score += 10
	}

	if (originalElement === element) {
		score += 5
	}

	return score
}
