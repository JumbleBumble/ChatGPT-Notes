import type { ResponseData } from '../notes/types'
import { textToHtml } from '../notes/utils'
import { cleanResponseClone, sanitizeHtml } from './response'

export type ConversationTurn = {
	role: 'user' | 'assistant'
	text: string
}

type CollectedTurn = ConversationTurn & {
	key: string
	orderHint: number | null
	seenOrder: number
}

type ConversationIncludeMode = 'both' | 'assistant'

export type ConversationCaptureResult = {
	data: ResponseData | null
	title: string
	source: 'dom' | 'none'
}

export type ConversationCaptureOptions = {
	includeMode?: ConversationIncludeMode
}

function parseConversationId(url: URL): string | null {
	const parts = url.pathname.split('/').filter(Boolean)
	const chatIndex = parts.findIndex((part) => part === 'c')

	if (chatIndex < 0) return null

	const possibleId = parts[chatIndex + 1]

	if (!possibleId) return null

	return /^[0-9a-f-]{8,}$/i.test(possibleId) ? possibleId : null
}

function getPageConversationId(): string | null {
	try {
		return parseConversationId(new URL(window.location.href))
	} catch {
		return null
	}
}

function buildConversationPayload(
	turns: ConversationTurn[],
): ResponseData | null {
	if (turns.length === 0) return null

	const text = turns
		.map(
			(turn) =>
				`${turn.role === 'user' ? 'User' : 'Assistant'}:\n${turn.text}`,
		)
		.join('\n\n')

	const html = sanitizeHtml(
		turns
			.map((turn) => {
				const role = turn.role === 'user' ? 'User' : 'Assistant'
				return `<section><h3>${role}</h3>${textToHtml(turn.text)}</section>`
			})
			.join(''),
	)

	return {
		text,
		html,
	}
}

function filterTurnsByMode(
	turns: ConversationTurn[],
	includeMode: ConversationIncludeMode,
): ConversationTurn[] {
	if (includeMode === 'assistant') {
		return turns.filter((turn) => turn.role === 'assistant')
	}

	return turns
}

function measureRenderedText(html: string): string {
	const container = document.createElement('div')
	container.setAttribute('aria-hidden', 'true')
	container.style.position = 'fixed'
	container.style.top = '0'
	container.style.left = '0'
	container.style.width = '0'
	container.style.height = '0'
	container.style.overflow = 'hidden'
	container.style.opacity = '0'
	container.style.pointerEvents = 'none'
	container.innerHTML = html

	document.body.appendChild(container)

	try {
		return container.innerText.trim()
	} finally {
		container.remove()
	}
}

function pickTurnContent(turnElement: HTMLElement): HTMLElement | null {
	const selectors = [
		'.markdown',
		'[data-message-content="true"]',
		'[data-testid*="message-content"]',
		'[data-testid*="conversation-turn-content"]',
		'[dir="auto"]',
	]

	for (const selector of selectors) {
		const candidates = turnElement.querySelectorAll(selector)

		for (const candidate of candidates) {
			if (!(candidate instanceof HTMLElement)) continue

			if (candidate.closest('[aria-label="Response actions"]')) {
				continue
			}

			if (candidate.closest('[data-chatgpt-notes-ui="true"]')) {
				continue
			}

			if (candidate.textContent?.trim()) {
				return candidate
			}
		}
	}

	if (turnElement.textContent?.trim()) {
		return turnElement
	}

	return null
}

function isHiddenForCapture(element: HTMLElement): boolean {
	if (element.getAttribute('aria-hidden') === 'true') return true
	if (element.hidden) return true

	const style = window.getComputedStyle(element)
	return style.display === 'none' || style.visibility === 'hidden'
}

function extractCollectedTurnsFromDom(
	processedLengths?: Map<string, number>,
	capturedKeys?: ReadonlySet<string>,
): { turns: CollectedTurn[]; passKeys: string[] } {
	const seen = new Map<string, CollectedTurn>()
	const passKeys: string[] = []
	const sections = Array.from(
		document.querySelectorAll(
			'section[data-testid^="conversation-turn-"]',
		),
	).filter(
		(element): element is HTMLElement => element instanceof HTMLElement,
	)

	const pushTurn = (
		role: 'user' | 'assistant',
		text: string,
		key: string,
		orderHint: number | null,
	) => {
		passKeys.push(key)

		if (seen.has(key)) return

		seen.set(key, {
			role,
			text,
			key,
			orderHint,
			seenOrder: seen.size,
		})
	}

	if (sections.length > 0) {
		for (const section of sections) {
			const turnRole = section.getAttribute('data-turn')
			const role =
				turnRole === 'user' || turnRole === 'assistant'
					? turnRole
					: ((section.getAttribute('data-message-author-role') ??
							section
								.querySelector('[data-message-author-role]')
								?.getAttribute('data-message-author-role') ??
							null) as 'user' | 'assistant' | null)

			if (role !== 'user' && role !== 'assistant') continue

			const candidateMessageElements = Array.from(
				section.querySelectorAll(
					`[data-message-author-role="${role}"]`,
				),
			).filter(
				(element): element is HTMLElement =>
					element instanceof HTMLElement,
			)

			const messageElement =
				candidateMessageElements.find(
					(element) => !isHiddenForCapture(element),
				) ??
				candidateMessageElements[0] ??
				(!isHiddenForCapture(section) ? section : null)

			if (!messageElement) continue

			const contentElement = pickTurnContent(messageElement)

			if (!contentElement) continue

			const stableId =
				section.getAttribute('data-turn-id') ??
				messageElement.getAttribute('data-message-id')

			if (stableId && processedLengths && capturedKeys?.has(stableId)) {
				const fingerprint = contentElement.textContent?.length ?? 0
				if (processedLengths.get(stableId) === fingerprint) {
					passKeys.push(stableId)
					continue
				}
			}

			const clone = cleanResponseClone(contentElement)
			const html = sanitizeHtml(clone.innerHTML)
			const text = measureRenderedText(html)

			if (!text) continue

			if (stableId && processedLengths) {
				processedLengths.set(
					stableId,
					contentElement.textContent?.length ?? 0,
				)
			}

			const testId = section.getAttribute('data-testid') ?? ''
			const turnIndex = Number(
				(testId.match(/conversation-turn-(\d+)/)?.[1] ?? '').trim(),
			)
			const orderHint = Number.isFinite(turnIndex) ? turnIndex : null
			const turnId =
				section.getAttribute('data-turn-id') ??
				messageElement.getAttribute('data-message-id') ??
				(orderHint !== null
					? `turn-index:${orderHint}`
					: `${role}:${text.slice(0, 80)}`)

			pushTurn(role, text, turnId, orderHint)
		}
	} else {
		const turnElements = Array.from(
			document.querySelectorAll('[data-message-author-role]'),
		).filter(
			(element): element is HTMLElement =>
				element instanceof HTMLElement,
		)

		turnElements.forEach((turnElement, index) => {
			const role = turnElement.getAttribute('data-message-author-role')

			if (role !== 'user' && role !== 'assistant') {
				return
			}

			if (isHiddenForCapture(turnElement)) return

			const contentElement = pickTurnContent(turnElement)

			if (!contentElement) return

			const clone = cleanResponseClone(contentElement)
			const html = sanitizeHtml(clone.innerHTML)
			const text = measureRenderedText(html)

			if (!text) return

			const key =
				turnElement.getAttribute('data-message-id') ??
				`turn-index:${index}`

			pushTurn(role, text, key, index)
		})
	}

	return { turns: Array.from(seen.values()), passKeys }
}

function topologicalOrder(
	turns: CollectedTurn[],
	edges: Map<string, Set<string>>,
): CollectedTurn[] {
	const byKey = new Map(turns.map((turn) => [turn.key, turn]))
	const keys = turns.map((turn) => turn.key)
	const keySet = new Set(keys)
	const indegree = new Map<string, number>(keys.map((key) => [key, 0]))

	for (const [from, tos] of edges) {
		if (!keySet.has(from)) continue
		for (const to of tos) {
			if (!keySet.has(to)) continue
			indegree.set(to, (indegree.get(to) ?? 0) + 1)
		}
	}

	const tieBreak = (key: string): number => {
		const turn = byKey.get(key)
		if (!turn) return 0
		return turn.orderHint ?? turn.seenOrder + 1_000_000
	}

	const ready = new Set(keys.filter((key) => indegree.get(key) === 0))
	const result: string[] = []

	while (ready.size > 0) {
		let bestKey: string | null = null
		let bestTie = Number.POSITIVE_INFINITY

		for (const key of ready) {
			const tie = tieBreak(key)
			if (tie < bestTie) {
				bestTie = tie
				bestKey = key
			}
		}

		if (bestKey === null) break

		ready.delete(bestKey)
		result.push(bestKey)

		for (const to of edges.get(bestKey) ?? []) {
			if (!keySet.has(to)) continue
			const remaining = (indegree.get(to) ?? 0) - 1
			indegree.set(to, remaining)
			if (remaining === 0) ready.add(to)
		}
	}

	if (result.length < keys.length) {
		const placed = new Set(result)
		const leftover = keys
			.filter((key) => !placed.has(key))
			.sort((a, b) => tieBreak(a) - tieBreak(b))
		result.push(...leftover)
	}

	return result
		.map((key) => byKey.get(key))
		.filter((turn): turn is CollectedTurn => turn !== undefined)
}

function toConversationTurns(
	turns: CollectedTurn[],
	edges: Map<string, Set<string>>,
): ConversationTurn[] {
	return topologicalOrder(turns, edges).map(({ role, text }) => ({
		role,
		text,
	}))
}

function isScrollableCandidate(element: HTMLElement): boolean {
	if (element.scrollHeight > element.clientHeight + 2) {
		return true
	}

	return element.scrollTop > 1
}

function getScrollTargets(): HTMLElement[] {
	const targets: HTMLElement[] = []
	const seen = new Set<HTMLElement>()

	const root = document.scrollingElement
	if (root instanceof HTMLElement) {
		targets.push(root)
		seen.add(root)
	}

	const anchor = document.querySelector(
		'section[data-testid^="conversation-turn-"]',
	)

	if (!(anchor instanceof HTMLElement)) {
		return targets
	}

	let parent: HTMLElement | null = anchor.parentElement

	while (parent) {
		if (!seen.has(parent) && isScrollableCandidate(parent)) {
			targets.push(parent)
			seen.add(parent)
		}

		parent = parent.parentElement
	}

	const range = (el: HTMLElement) =>
		Math.max(0, el.scrollHeight - el.clientHeight)
	const topOf = (el: HTMLElement) =>
		el === root ? window.scrollY : el.scrollTop

	const deduped: HTMLElement[] = []

	for (const target of targets.sort((a, b) => range(b) - range(a))) {
		const twinIndex = deduped.findIndex(
			(kept) =>
				Math.abs(range(kept) - range(target)) <= 8 &&
				(kept.contains(target) || target.contains(kept)),
		)

		if (twinIndex === -1) {
			deduped.push(target)
			continue
		}

		if (topOf(target) > topOf(deduped[twinIndex])) {
			deduped[twinIndex] = target
		}
	}

	return deduped
}

function waitForRender(ms = 80): Promise<void> {
	return new Promise((resolve) => {
		window.setTimeout(resolve, ms)
	})
}

function isLoadingIndicatorVisible(): boolean {
	const indicators = document.querySelectorAll(
		'[class*="animate-spin"], [role="status"], [aria-busy="true"], [class*="animate-pulse"], [class*="loading"], [class*="skeleton"]',
	)

	for (const indicator of indicators) {
		if (!(indicator instanceof HTMLElement)) continue

		const rect = indicator.getBoundingClientRect()
		if (rect.width >= 8 && rect.height >= 8) {
			return true
		}
	}

	return false
}

const MAX_CRAWL_MS = 5 * 60_000
const MUTATION_DEBOUNCE_MS = 120
const IDLE_AT_TOP_MS = 4_000
const INDICATOR_GRACE_MS = 30_000
const SCROLL_SETTLE_MS = 180
const TOP_SETTLE_MS = 220
const NUDGE_SETTLE_MS = 60

async function extractTurnsFromDomExhaustive(): Promise<ConversationTurn[]> {
	const collected = new Map<string, CollectedTurn>()
	const processedLengths = new Map<string, number>()

	const edges = new Map<string, Set<string>>()

	const recordAdjacency = (passKeys: string[]) => {
		for (let i = 1; i < passKeys.length; i += 1) {
			const from = passKeys[i - 1]
			const to = passKeys[i]

			if (from === to) continue

			let successors = edges.get(from)
			if (!successors) {
				successors = new Set()
				edges.set(from, successors)
			}
			successors.add(to)
		}
	}

	const initialByKey = new Map<string, string>()

	const collectSnapshot = () => {
		let added = 0
		const { turns: passTurns, passKeys } = extractCollectedTurnsFromDom(
			processedLengths,
			new Set(collected.keys()),
		)

		recordAdjacency(passKeys)

		for (const rawTurn of passTurns) {
			const floorText = initialByKey.get(rawTurn.key)
			const turn =
				floorText && floorText.length > rawTurn.text.length
					? { ...rawTurn, text: floorText }
					: rawTurn

			const existing = collected.get(turn.key)

			if (!existing) {
				collected.set(turn.key, {
					...turn,
					seenOrder: collected.size,
				})
				added += 1
				continue
			}

			const hasMoreText = turn.text.length > existing.text.length
			const hasNewOrderHint =
				existing.orderHint === null && turn.orderHint !== null

			if (hasMoreText || hasNewOrderHint) {
				collected.set(turn.key, {
					...existing,
					text: hasMoreText ? turn.text : existing.text,
					orderHint: hasNewOrderHint
						? turn.orderHint
						: existing.orderHint,
				})

				if (hasMoreText) added += 1
			}
		}

		return added
	}

	for (const turn of extractCollectedTurnsFromDom(
		processedLengths,
		new Set(),
	).turns) {
		initialByKey.set(turn.key, turn.text)
	}

	collectSnapshot()

	const rootScroller = document.scrollingElement
	const readTop = (target: HTMLElement) =>
		target === rootScroller ? window.scrollY : target.scrollTop
	const setTop = (target: HTMLElement, nextTop: number) => {
		if (target === rootScroller) {
			window.scrollTo({ top: nextTop, behavior: 'auto' })
			return
		}

		target.scrollTop = nextTop
	}

	const initialTops = new Map<HTMLElement, number>()
	const initialScrollAnchors = new Map<HTMLElement, string>()
	const refreshTargets = (): HTMLElement[] => {
		const latestTargets = getScrollTargets()

		for (const target of latestTargets) {
			if (!initialTops.has(target)) {
				initialTops.set(target, readTop(target))
			}

			if (!initialScrollAnchors.has(target)) {
				initialScrollAnchors.set(
					target,
					target.style.getPropertyValue('overflow-anchor'),
				)
				target.style.setProperty('overflow-anchor', 'none')
			}
		}

		return latestTargets
	}

	const hasScrollableRange = (targets: HTMLElement[]) =>
		targets.some(
			(target) =>
				target.scrollHeight - target.clientHeight > 8 ||
				readTop(target) > 1,
		)

	let targets = refreshTargets()

	if (targets.length === 0 || !hasScrollableRange(targets)) {
		return toConversationTurns(Array.from(collected.values()), edges)
	}

	let lastAddedAt = Date.now()
	let indicatorFirstSeenAt: number | null = null
	let mutationScheduled = false

	const observer = new MutationObserver(() => {
		if (mutationScheduled) return
		mutationScheduled = true

		window.setTimeout(() => {
			mutationScheduled = false

			if (collectSnapshot() > 0) {
				lastAddedAt = Date.now()
			}
		}, MUTATION_DEBOUNCE_MS)
	})

	observer.observe(document.body, {
		childList: true,
		subtree: true,
		characterData: true,
	})

	try {
		const crawlStartedAt = Date.now()
		const stepFor = (target: HTMLElement) =>
			Math.max(Math.floor(target.clientHeight * 0.6), 250)

		while (Date.now() - crawlStartedAt < MAX_CRAWL_MS) {
			targets = refreshTargets()

			if (!hasScrollableRange(targets)) {
				collectSnapshot()
				break
			}

			let guard = 0
			while (
				targets.some((target) => readTop(target) > 1) &&
				Date.now() - crawlStartedAt < MAX_CRAWL_MS &&
				guard < 10_000
			) {
				guard += 1

				for (const target of targets) {
					const currentTop = readTop(target)
					if (currentTop <= 1) continue
					setTop(target, Math.max(0, currentTop - stepFor(target)))
				}

				await waitForRender(SCROLL_SETTLE_MS)
				if (collectSnapshot() > 0) {
					lastAddedAt = Date.now()
				}

				targets = refreshTargets()
			}

			for (const target of targets) {
				setTop(target, stepFor(target))
			}
			await waitForRender(SCROLL_SETTLE_MS)

			let stepping = true
			while (stepping && Date.now() - crawlStartedAt < MAX_CRAWL_MS) {
				stepping = false

				for (const target of targets) {
					const currentTop = readTop(target)
					if (currentTop <= 1) continue
					setTop(
						target,
						Math.max(
							0,
							currentTop - Math.ceil(stepFor(target) / 2),
						),
					)
					stepping = true
				}

				if (stepping) {
					await waitForRender(NUDGE_SETTLE_MS)
				}
			}

			await waitForRender(TOP_SETTLE_MS)

			if (collectSnapshot() > 0) {
				lastAddedAt = Date.now()
			}

			if (isLoadingIndicatorVisible()) {
				const now = Date.now()
				if (indicatorFirstSeenAt === null) {
					indicatorFirstSeenAt = now
				}

				if (now - indicatorFirstSeenAt < INDICATOR_GRACE_MS) {
					lastAddedAt = now
					continue
				}
			} else {
				indicatorFirstSeenAt = null
			}

			if (Date.now() - lastAddedAt >= IDLE_AT_TOP_MS) {
				await waitForRender(TOP_SETTLE_MS)
				if (collectSnapshot() > 0) {
					lastAddedAt = Date.now()
					continue
				}
				break
			}

			await waitForRender(250)
		}
	} finally {
		observer.disconnect()
	}

	collectSnapshot()

	for (const [target, top] of initialTops) {
		setTop(target, top)
	}

	for (const [target, previousValue] of initialScrollAnchors) {
		if (previousValue) {
			target.style.setProperty('overflow-anchor', previousValue)
		} else {
			target.style.removeProperty('overflow-anchor')
		}
	}

	return toConversationTurns(Array.from(collected.values()), edges)
}

function getFallbackTitle(conversationId: string | null): string {
	const fromDocumentTitle = document.title
		.replace(/\s*[-|]\s*ChatGPT.*$/i, '')
		.trim()

	if (fromDocumentTitle) {
		return fromDocumentTitle
	}

	if (conversationId) {
		return `Conversation ${conversationId.slice(0, 8)}`
	}

	return 'ChatGPT Conversation'
}

export async function getConversationCapture(
	options: ConversationCaptureOptions = {},
): Promise<ConversationCaptureResult> {
	const includeMode = options.includeMode ?? 'both'
	const conversationId = getPageConversationId()

	const domTurns = await extractTurnsFromDomExhaustive()

	const domData = buildConversationPayload(
		filterTurnsByMode(domTurns, includeMode),
	)

	if (domData) {
		return {
			data: domData,
			title: getFallbackTitle(conversationId),
			source: 'dom',
		}
	}

	return {
		data: null,
		title: getFallbackTitle(conversationId),
		source: 'none',
	}
}

export type ConversationTurnsCaptureResult = ConversationCaptureResult & {
	turns: ConversationTurn[]
}

export async function getConversationTurnsCapture(): Promise<ConversationTurnsCaptureResult> {
	const conversationId = getPageConversationId()
	const domTurns = await extractTurnsFromDomExhaustive()
	const domData = buildConversationPayload(
		filterTurnsByMode(domTurns, 'both'),
	)

	return {
		data: domData,
		turns: domTurns,
		title: getFallbackTitle(conversationId),
		source: domData ? 'dom' : 'none',
	}
}

export function filterConversationTurns(
	turns: ConversationTurn[],
	includeMode: ConversationIncludeMode,
): ResponseData | null {
	return buildConversationPayload(filterTurnsByMode(turns, includeMode))
}
