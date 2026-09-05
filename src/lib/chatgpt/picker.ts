import {
	buildResponseData,
	getAssistantMessage,
	getResponseContent,
	isExcludedElement,
	scorePickedCandidate,
} from './response'
import type { ResponseData } from '../notes/types'

function promotePickedElement(element: HTMLElement): HTMLElement {
	const assistantMessage =
		getAssistantMessage(element) ??
		element.closest('[data-message-author-role="assistant"]')

	if (assistantMessage instanceof HTMLElement) {
		const knownResponse = getResponseContent(assistantMessage)

		if (
			knownResponse &&
			(knownResponse === element || knownResponse.contains(element))
		) {
			return knownResponse
		}

		const candidates: HTMLElement[] = []

		let current: HTMLElement | null = element

		for (let depth = 0; current && depth < 10; depth++) {
			if (!isExcludedElement(current)) {
				candidates.push(current)
			}

			if (current === assistantMessage) {
				break
			}

			current = current.parentElement
		}

		if (!candidates.includes(assistantMessage)) {
			candidates.push(assistantMessage)
		}

		const ranked = candidates
			.map((candidate) => ({
				element: candidate,
				score: scorePickedCandidate(candidate, element),
			}))
			.filter((candidate) => Number.isFinite(candidate.score))
			.sort((a, b) => b.score - a.score)

		return ranked[0]?.element ?? assistantMessage
	}

	const candidates: HTMLElement[] = []

	let current: HTMLElement | null = element

	for (let depth = 0; current && depth < 10; depth++) {
		if (!isExcludedElement(current)) {
			candidates.push(current)
		}

		current = current.parentElement
	}

	const ranked = candidates
		.map((candidate) => ({
			element: candidate,
			score: scorePickedCandidate(candidate, element),
		}))
		.filter((candidate) => Number.isFinite(candidate.score))
		.sort((a, b) => b.score - a.score)

	return ranked[0]?.element ?? element
}

export function pickElement(): Promise<HTMLElement | null> {
	return new Promise((resolve) => {
		let currentElement: HTMLElement | null = null
		let pickerRoot: HTMLDivElement | null = null
		let label: HTMLDivElement | null = null

		const cleanup = () => {
			document.removeEventListener('mousemove', onMouseMove, true)
			document.removeEventListener('click', onClick, true)
			document.removeEventListener('keydown', onKeyDown, true)

			pickerRoot?.remove()
			label?.remove()

			currentElement = null
			pickerRoot = null
			label = null
		}

		const finish = (element: HTMLElement | null) => {
			cleanup()
			resolve(element)
		}

		const onMouseMove = (event: MouseEvent) => {
			const target = event.target

			if (!(target instanceof HTMLElement)) {
				return
			}

			if (target.closest('[data-chatgpt-notes-ui="true"]')) {
				return
			}

			if (target.closest('[data-chatgpt-notes-picker="true"]')) {
				return
			}

			if (isExcludedElement(target)) {
				return
			}

			currentElement = target

			if (!pickerRoot) {
				pickerRoot = document.createElement('div')

				pickerRoot.setAttribute('data-chatgpt-notes-picker', 'true')

				Object.assign(pickerRoot.style, {
					position: 'fixed',
					pointerEvents: 'none',
					zIndex: '999998',
					border: '2px solid #10a37f',
					borderRadius: '5px',
					boxSizing: 'border-box',
				})

				document.body.appendChild(pickerRoot)

				label = document.createElement('div')

				Object.assign(label.style, {
					position: 'fixed',
					pointerEvents: 'none',
					zIndex: '999999',
					padding: '4px 7px',
					borderRadius: '5px',
					background: '#111827',
					color: 'white',
					fontFamily:
						'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
					fontSize: '12px',
					lineHeight: '1',
					whiteSpace: 'nowrap',
				})

				document.body.appendChild(label)
			}

			const promoted = promotePickedElement(target)
			const rect = promoted.getBoundingClientRect()

			pickerRoot.style.left = `${rect.left}px`
			pickerRoot.style.top = `${rect.top}px`
			pickerRoot.style.width = `${rect.width}px`
			pickerRoot.style.height = `${rect.height}px`

			if (label) {
				const tag = promoted.tagName.toLowerCase()

				const identifier = promoted.id ? `#${promoted.id}` : ''

				label.textContent = `${tag}${identifier}`

				const labelTop = Math.max(4, rect.top - 26)

				label.style.left = `${Math.max(
					4,
					Math.min(rect.left, window.innerWidth - 160),
				)}px`

				label.style.top = `${labelTop}px`
			}
		}

		const onClick = (event: MouseEvent) => {
			const target = event.target

			if (!(target instanceof HTMLElement)) {
				return
			}

			if (target.closest('[data-chatgpt-notes-ui="true"]')) {
				return
			}

			if (target.closest('[data-chatgpt-notes-picker="true"]')) {
				return
			}

			if (isExcludedElement(target)) {
				return
			}

			event.preventDefault()
			event.stopPropagation()

			const promoted = promotePickedElement(currentElement ?? target)

			finish(promoted)
		}

		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key !== 'Escape') {
				return
			}

			event.preventDefault()
			event.stopPropagation()

			finish(null)
		}

		document.addEventListener('mousemove', onMouseMove, true)

		document.addEventListener('click', onClick, true)

		document.addEventListener('keydown', onKeyDown, true)
	})
}

export async function pickResponseData(): Promise<ResponseData | null> {
	const element = await pickElement()

	if (!element) {
		return null
	}

	const response = buildResponseData(element)

	return response.text ? response : null
}
