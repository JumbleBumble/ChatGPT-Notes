import DOMPurify from 'dompurify'

export function formatDate(timestamp: number): string {
	const date = new Date(timestamp)
	const now = new Date()
	const diff = now.getTime() - date.getTime()

	if (diff < 60_000) {
		return 'Just now'
	}

	if (diff < 3_600_000) {
		return `${Math.floor(diff / 60_000)}m ago`
	}

	if (diff < 86_400_000) {
		return `${Math.floor(diff / 3_600_000)}h ago`
	}

	if (diff < 604_800_000) {
		return `${Math.floor(diff / 86_400_000)}d ago`
	}

	return date.toLocaleDateString(undefined, {
		month: 'short',
		day: 'numeric',
		year: date.getFullYear() === now.getFullYear() ? undefined : 'numeric',
	})
}

export function textToHtml(text: string): string {
	const escaped = text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;')

	return escaped
		.split(/\n{2,}/)
		.map((block) => {
			const lines = block.split('\n')

			if (
				lines.length > 0 &&
				lines.every((line) => /^\s*[-*]\s+/.test(line))
			) {
				return `<ul>${lines
					.map(
						(line) =>
							`<li>${line.replace(/^\s*[-*]\s+/, '')}</li>`,
					)
					.join('')}</ul>`
			}

			if (
				lines.length > 0 &&
				lines.every((line) => /^\s*\d+\.\s+/.test(line))
			) {
				return `<ol>${lines
					.map(
						(line) =>
							`<li>${line.replace(/^\s*\d+\.\s+/, '')}</li>`,
					)
					.join('')}</ol>`
			}

			return `<p>${lines.join('<br />')}</p>`
		})
		.join('')
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

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function highlightHtml(html: string, query: string): string {
	const cleanHtml = sanitizeHtml(html)

	if (!query.trim()) {
		return cleanHtml
	}

	const container = document.createElement('div')
	container.innerHTML = cleanHtml

	const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT)

	const textNodes: Text[] = []
	let currentNode: Node | null = walker.nextNode()

	while (currentNode) {
		if (currentNode.nodeType === Node.TEXT_NODE) {
			textNodes.push(currentNode as Text)
		}

		currentNode = walker.nextNode()
	}

	const regex = new RegExp(`(${escapeRegExp(query)})`, 'gi')

	for (const textNode of textNodes) {
		const text = textNode.nodeValue ?? ''

		if (!regex.test(text)) {
			regex.lastIndex = 0
			continue
		}

		regex.lastIndex = 0

		const fragment = document.createDocumentFragment()
		let lastIndex = 0

		text.replace(regex, (match, _group, offset: number) => {
			fragment.appendChild(
				document.createTextNode(text.slice(lastIndex, offset)),
			)

			const mark = document.createElement('mark')
			mark.textContent = match
			fragment.appendChild(mark)

			lastIndex = offset + match.length

			return match
		})

		fragment.appendChild(document.createTextNode(text.slice(lastIndex)))

		textNode.parentNode?.replaceChild(fragment, textNode)
	}

	return container.innerHTML
}

export function getSearchMatchCount(text: string, query: string): number {
	if (!query.trim()) {
		return 0
	}

	const matches = text.match(new RegExp(escapeRegExp(query), 'gi'))

	return matches?.length ?? 0
}
