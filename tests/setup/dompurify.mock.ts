import { vi } from 'vitest'

function sanitizeHtml(input: string): string {
	return input
		.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
		.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
		.replace(
			/<(iframe|object|embed)\b[^<]*(?:(?!<\/\1>)<[^<]*)*<\/\1>/gi,
			'',
		)
		.replace(
			/\s(onerror|onload|onclick|onmouseover|onmousedown|onmouseup|onfocus|onblur|style)=("[^"]*"|'[^']*'|[^\s>]+)/gi,
			'',
		)
		.trim()
}

vi.mock('dompurify', () => ({
	default: {
		sanitize: (html: string) => sanitizeHtml(html),
	},
}))
