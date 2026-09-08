import { test, expect } from '@playwright/test'
import { build } from 'esbuild'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

//   CHATGPT_LIVE_URL="https://chatgpt.com/share/<id>" npx playwright test

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(here, '..', '..')

function loadLiveUrl(): string | undefined {
	if (process.env.CHATGPT_LIVE_URL) return process.env.CHATGPT_LIVE_URL

	try {
		const envText = readFileSync(join(repoRoot, '.env'), 'utf8')
		const match = envText.match(
			/^\s*CHATGPT_LIVE_URL\s*=\s*"?([^"\r\n]+)"?\s*$/m,
		)
		return match?.[1]
	} catch {
		return undefined
	}
}

const liveUrl = loadLiveUrl()

test.skip(!liveUrl, 'Set CHATGPT_LIVE_URL to a public share URL to run')

test('captures a real public ChatGPT share conversation', async ({ page }) => {
	test.setTimeout(240_000)

	const result = await build({
		entryPoints: [join(repoRoot, 'src/lib/chatgpt/conversation.ts')],
		bundle: true,
		write: false,
		format: 'iife',
		globalName: '__capture',
		platform: 'browser',
		target: 'es2020',
		footer: {
			js: 'window.__capture = { getConversationCapture: __capture.getConversationCapture };',
		},
	})

	await page.goto(liveUrl!, { waitUntil: 'domcontentloaded' })
	await page.waitForSelector('section[data-testid^="conversation-turn-"]', {
		timeout: 30_000,
	})
	await page.addScriptTag({ content: result.outputFiles[0].text })

	const mountedSections = await page.evaluate(
		() =>
			document.querySelectorAll(
				'section[data-testid^="conversation-turn-"]',
			).length,
	)
	console.log('mounted turn sections before capture:', mountedSections)

	const capture = await page.evaluate(async () => {
		const c = await (
			window as unknown as {
				__capture: {
					getConversationCapture: () => Promise<{
						source: string
						data: { text: string } | null
					}>
				}
			}
		).__capture.getConversationCapture()
		return { source: c.source, text: c.data?.text ?? '' }
	})

	console.log('live capture source:', capture.source)
	console.log('live capture length:', capture.text.length)

	expect(capture.source).toBe('dom')
	expect(capture.text.length).toBeGreaterThan(5_000)
})
