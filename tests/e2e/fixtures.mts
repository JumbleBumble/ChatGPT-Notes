import { test as base, expect } from '@playwright/test'
import { build } from 'esbuild'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(here, '..', '..')

let bundleCache: string | null = null

async function captureBundle(): Promise<string> {
	if (bundleCache) return bundleCache

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

	bundleCache = result.outputFiles[0].text
	return bundleCache
}

export type MockThreadOptions = {
	/** Total number of turns (user + assistant interleaved). */
	turnCount: number
	/** How many turns are mounted in the DOM at once (virtualization window). */
	windowSize: number
	/** How many older turns are prepended per backfill when scrolling to the top. */
	backfillChunk: number
	/** ms delay before a backfill chunk is inserted (simulates network). */
	backfillDelayMs: number
	/** If true, the first backfill is delayed a long time (simulates the "stall" bug). */
	slowFirstBackfillMs?: number
	/** If true, emit assistant turns with no data-message-id (regenerated-turn shape). */
	omitMessageIds?: boolean
	/** If true, the earliest assistant turn starts empty and streams text in
	 *  after a delay, simulating a turn caught mid-stream at the top. */
	streamFirstAssistant?: boolean
	/** If true, the newest (end-of-thread) turn collapses to empty text shortly
	 *  after the crawl begins, simulating the composer losing focus when the
	 *  save dialog opens and ChatGPT reflowing the active turn. The crawl must
	 *  still save that turn's original text. */
	collapseLastTurnAfterMs?: number
}

function turnHtml(index: number, options: MockThreadOptions): string {
	const role = index % 2 === 0 ? 'user' : 'assistant'
	const turnId = `turn-${index}`
	const messageIdAttr = options.omitMessageIds
		? ''
		: ` data-message-id="msg-${index}"`
	const body =
		role === 'user'
			? `<div class="markdown"><p>User question ${index}: please summarise item ${index}.</p></div>`
			: `<div class="markdown"><p>Assistant answer ${index}: here is detail ${index}.</p><ul><li>point ${index}a</li><li>point ${index}b</li></ul></div>`

	const streamAttr =
		options.streamFirstAssistant && index === 1
			? ' data-stream-pending="true"'
			: ''
	const streamedBody =
		options.streamFirstAssistant && index === 1
			? '<div class="markdown"></div>'
			: body

	return `
		<section data-testid="conversation-turn-${index + 1}" data-turn="${role}" data-turn-id="${turnId}" data-is-intersecting="true"${streamAttr}>
			<div data-message-author-role="${role}"${messageIdAttr}>
				${streamedBody}
			</div>
		</section>`
}

function mockPageHtml(options: MockThreadOptions): string {
	const initial: string[] = []
	const firstMounted = Math.max(0, options.turnCount - options.windowSize)
	for (let i = firstMounted; i < options.turnCount; i++) {
		initial.push(turnHtml(i, options))
	}

	return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Mock ChatGPT Thread</title>
<style>
	html, body { margin: 0; padding: 0; }
	#thread { width: 100%; }
	/* Ensure every mounted turn contributes real height so the page scrolls. */
	.turn { box-sizing: border-box; padding: 24px; border-bottom: 1px solid #ddd; min-height: 200px; }
	#spinner { display: none; position: sticky; top: 0; padding: 12px; background: #ffe; text-align: center; }
	#spinner.visible { display: block; }
	.spin { display: inline-block; width: 16px; height: 16px; border: 2px solid #999; border-top-color: transparent; border-radius: 50%; animation: spin 1s linear infinite; }
	@keyframes spin { to { transform: rotate(360deg); } }
</style>
</head>
<body>
<div id="spinner"><span class="spin animate-spin"></span> Loading earlier messages…</div>
<div id="thread">${initial.join('\n')}</div>
<!-- Spacer below the thread so the window stays scrollable even when the
     mounted window is small relative to the viewport. -->
<div style="height: 2000px"></div>
<script>
	window.__TURN_COUNT = ${options.turnCount};
	(function () {
		var oldestMounted = ${firstMounted};
		var backfillChunk = ${options.backfillChunk};
		var backfillDelayMs = ${options.backfillDelayMs};
		var slowFirstBackfillMs = ${options.slowFirstBackfillMs ?? 0};
		var backfills = 0;
		var pending = false;

		function makeTurn(i) {
			var role = i % 2 === 0 ? 'user' : 'assistant';
			var section = document.createElement('section');
			section.setAttribute('data-testid', 'conversation-turn-' + (i + 1));
			section.setAttribute('data-turn', role);
			section.setAttribute('data-turn-id', 'turn-' + i);
			section.setAttribute('data-is-intersecting', 'true');
			section.className = 'turn';
			var msg = document.createElement('div');
			msg.setAttribute('data-message-author-role', role);
			${options.omitMessageIds ? '' : "msg.setAttribute('data-message-id', 'msg-' + i);"}
			msg.innerHTML = role === 'user'
				? '<div class="markdown"><p>User question ' + i + ': please summarise item ' + i + '.</p></div>'
				: '<div class="markdown"><p>Assistant answer ' + i + ': here is detail ' + i + '.</p></div><ul><li>point ' + i + 'a</li><li>point ' + i + 'b</li></ul>';
			section.appendChild(msg);
			return section;
		}

		// A turn caught mid-stream: after a delay, populate the pending turn's
		// empty markdown body (simulates an assistant response still rendering
		// when the crawl begins).
		var pendingStream = document.querySelector('[data-stream-pending="true"]');
		if (pendingStream) {
			setTimeout(function () {
				var md = pendingStream.querySelector('.markdown');
				if (md) {
					md.innerHTML = '<p>Assistant answer 1: here is detail 1.</p><ul><li>point 1a</li><li>point 1b</li></ul>';
				}
				pendingStream.removeAttribute('data-stream-pending');
			}, 2500);
		}

		// End-of-thread collapse: shortly after the crawl starts, the newest
		// turn's markdown empties out (simulating ChatGPT reflowing the active
		// turn when the save dialog steals composer focus). The crawl must have
		// already captured this turn's text and must not lose it.
		var collapseAfter = ${options.collapseLastTurnAfterMs ?? 0};
		if (collapseAfter > 0) {
			setTimeout(function () {
				var sections = document.querySelectorAll('section[data-testid^="conversation-turn-"]');
				var last = sections[sections.length - 1];
				if (last) {
					var md = last.querySelector('.markdown');
					if (md) md.innerHTML = '';
				}
			}, collapseAfter);
		}

		window.__oldestMounted = function () { return oldestMounted; };
		window.__backfills = function () { return backfills; };

		window.addEventListener('scroll', function () {
			window.__SCROLL_EVENTS = (window.__SCROLL_EVENTS || 0) + 1;
			(window.__SCROLL_LOG = window.__SCROLL_LOG || []).push(
				'y=' + window.scrollY + ' pending=' + pending + ' oldest=' + oldestMounted
			);
			if (pending || oldestMounted <= 0) return;
			if (window.scrollY > 40) return;
			pending = true;
			document.getElementById('spinner').classList.add('visible');
			var delay = backfills === 0 && slowFirstBackfillMs > 0 ? slowFirstBackfillMs : backfillDelayMs;
			setTimeout(function () {
				var thread = document.getElementById('thread');
				var added = 0;
				for (var i = oldestMounted - 1; i >= 0 && added < backfillChunk; i--, added++) {
					thread.insertBefore(makeTurn(i), thread.firstChild);
				}
				oldestMounted = Math.max(0, oldestMounted - added);
				backfills++;
				document.getElementById('spinner').classList.remove('visible');
				pending = false;
			}, delay);
		});
	})();
</script>
</body>
</html>`
}

export type CaptureResult = {
	source: string
	title: string
	data: { text: string; html: string } | null
	turnCount: number
	missingTurns: number[]
	ordering: 'ok' | 'broken'
}

export const test = base.extend<{
	mockThread: (options: MockThreadOptions) => Promise<void>
	runCapture: (includeMode?: 'both' | 'assistant') => Promise<CaptureResult>
}>({
	mockThread: async ({ page }, use) => {
		await use(async (options) => {
			const bundle = await captureBundle()
			await page.setContent(mockPageHtml(options))
			await page.addScriptTag({ content: bundle })
			await page.evaluate(() => {
				window.scrollTo(0, document.documentElement.scrollHeight)
			})
		})
	},
	runCapture: async ({ page }, use) => {
		await use(async (includeMode = 'both') => {
			return page.evaluate(async (mode) => {
				const capture = await (
					window as unknown as {
						__capture: {
							getConversationCapture: (o: {
								includeMode: 'both' | 'assistant'
							}) => Promise<{
								source: string
								title: string
								data: { text: string; html: string } | null
							}>
						}
					}
				).__capture.getConversationCapture({ includeMode: mode })

				const text = capture.data?.text ?? ''
				const total =
					(window as unknown as { __TURN_COUNT?: number })
						.__TURN_COUNT ?? 0

				const foundOrder: number[] = []
				const re = /(?:User question|Assistant answer) (\d+):/g
				let m: RegExpExecArray | null
				while ((m = re.exec(text)) !== null) {
					foundOrder.push(Number(m[1]))
				}

				const found = new Set(foundOrder)
				const missingTurns: number[] = []
				for (let i = 0; i < total; i++) {
					if (!found.has(i)) missingTurns.push(i)
				}

				const sorted = [...foundOrder].sort((a, b) => a - b)
				const ordering =
					JSON.stringify(sorted) === JSON.stringify(foundOrder)
						? 'ok'
						: 'broken'

				return {
					source: capture.source,
					title: capture.title,
					data: capture.data,
					turnCount: found.size,
					missingTurns,
					ordering,
				}
			}, includeMode)
		})
	},
})

export { expect }
