import { createRoot, type Root } from 'react-dom/client'
import { SaveResponseDialog } from '../components/chatgpt/SaveResponseDialog'
import {
	filterConversationTurns,
	getConversationTurnsCapture,
	type ConversationTurn,
} from '../lib/chatgpt/conversation'
import { getResponseData } from '../lib/chatgpt/response'
import { pickResponseData } from '../lib/chatgpt/picker'
import type { ResponseData } from '../lib/notes/types'

export const config = {
	matches: ['https://chatgpt.com/*'],
}

type DialogHost = {
	host: HTMLDivElement
	root: Root
}

type IncludeMode = 'both' | 'assistant'

const CONVERSATION_INCLUDE_MODE_KEY = 'chatgpt-notes:conversation-include-mode'

const dialogHosts = new WeakMap<Element, DialogHost>()

function getPreferredConversationIncludeMode(): IncludeMode {
	try {
		const saved = window.localStorage.getItem(
			CONVERSATION_INCLUDE_MODE_KEY,
		)

		return saved === 'assistant' ? 'assistant' : 'both'
	} catch {
		return 'both'
	}
}

function setPreferredConversationIncludeMode(mode: IncludeMode): void {
	try {
		window.localStorage.setItem(CONVERSATION_INCLUDE_MODE_KEY, mode)
	} catch {
		// ignore
	}
}

function getDialogHost(actionGroup: Element): DialogHost {
	const existing = dialogHosts.get(actionGroup)
	if (existing) return existing

	const host = document.createElement('div')
	host.setAttribute('data-chatgpt-notes-ui', 'true')
	host.style.display = 'contents'
	document.body.appendChild(host)

	const root = createRoot(host)
	const created = { host, root }
	dialogHosts.set(actionGroup, created)
	return created
}

function renderDialog(
	actionGroup: Element,
	open: boolean,
	mode: 'response' | 'conversation',
	response: ResponseData | null,
	suggestedTitle?: string,
	defaultIncludeMode?: IncludeMode,
	onResolveContent?: (options: { includeMode: IncludeMode }) => Promise<{
		response: ResponseData | null
		suggestedTitle?: string
	}>,
) {
	const { root } = getDialogHost(actionGroup)

	root.render(
		<SaveResponseDialog
			open={open}
			mode={mode}
			response={response}
			suggestedTitle={suggestedTitle}
			defaultIncludeMode={defaultIncludeMode}
			onIncludeModeChange={setPreferredConversationIncludeMode}
			onResolveContent={onResolveContent}
			onPickerRequired={() => pickResponseData()}
			onClose={() => renderDialog(actionGroup, false, mode, null)}
		/>,
	)
}

function injectSaveButton(actionGroup: Element) {
	if (actionGroup.querySelector('[data-chatgpt-notes-save-button="true"]'))
		return

	const copyButton = actionGroup.querySelector(
		'button[data-testid="copy-turn-action-button"]',
	)

	if (!(copyButton instanceof HTMLElement)) return

	const wrapper = document.createElement('span')
	wrapper.setAttribute('data-chatgpt-notes-save-button', 'true')
	wrapper.style.display = 'inline-flex'
	wrapper.style.alignItems = 'center'

	const button = document.createElement('button')
	button.type = 'button'
	button.setAttribute('aria-label', 'Save response')
	button.title = 'Save response'
	button.setAttribute('data-chatgpt-notes-button', 'true')
	button.className =
		'text-token-text-secondary hover:bg-token-surface-hover rounded-lg'

	const icon = document.createElement('span')
	icon.className = 'flex items-center justify-center touch:w-10 h-8 w-8'
	icon.innerHTML =
		'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3h12v18l-6-3-6 3z"></path></svg>'
	button.appendChild(icon)
	wrapper.appendChild(button)

	const conversationWrapper = document.createElement('span')
	conversationWrapper.setAttribute(
		'data-chatgpt-notes-save-conversation-button',
		'true',
	)
	conversationWrapper.style.display = 'inline-flex'
	conversationWrapper.style.alignItems = 'center'

	const conversationButton = document.createElement('button')
	conversationButton.type = 'button'
	conversationButton.setAttribute('aria-label', 'Save conversation')
	conversationButton.title = 'Save conversation'
	conversationButton.setAttribute('data-chatgpt-notes-button', 'true')
	conversationButton.className =
		'text-token-text-secondary hover:bg-token-surface-hover rounded-lg'

	const conversationIcon = document.createElement('span')
	conversationIcon.className =
		'flex items-center justify-center touch:w-10 h-8 w-8'
	conversationIcon.innerHTML =
		'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v12l-5-2.5L6 18V6z"></path><path d="M10 4h8a2 2 0 0 1 2 2v12l-4-2"></path></svg>'
	conversationButton.appendChild(conversationIcon)
	conversationWrapper.appendChild(conversationButton)

	button.addEventListener('click', (event) => {
		event.preventDefault()
		event.stopPropagation()
		renderDialog(
			actionGroup,
			true,
			'response',
			getResponseData(actionGroup),
		)
	})

	conversationButton.addEventListener('click', (event) => {
		event.preventDefault()
		event.stopPropagation()

		const defaultIncludeMode = getPreferredConversationIncludeMode()

		let capturePromise: Promise<{
			turns: ConversationTurn[]
			title: string
		}> | null = null

		const resolveContent = async ({
			includeMode,
		}: {
			includeMode: IncludeMode
		}) => {
			if (!capturePromise) {
				capturePromise = getConversationTurnsCapture().then(
					(capture) => ({
						turns: capture.turns,
						title: capture.title,
					}),
				)
			}

			const capture = await capturePromise

			return {
				response: filterConversationTurns(capture.turns, includeMode),
				suggestedTitle: capture.title,
			}
		}

		renderDialog(
			actionGroup,
			true,
			'conversation',
			null,
			'ChatGPT Conversation',
			defaultIncludeMode,
			resolveContent,
		)
	})

	actionGroup.insertBefore(conversationWrapper, copyButton)
	actionGroup.insertBefore(wrapper, copyButton)
}

function scanPage() {
	document
		.querySelectorAll('[aria-label="Response actions"]')
		.forEach(injectSaveButton)
}

let scanTimeout: number | undefined

function scheduleScan() {
	if (scanTimeout !== undefined) window.clearTimeout(scanTimeout)
	scanTimeout = window.setTimeout(() => {
		scanTimeout = undefined
		scanPage()
	}, 100)
}

const observer = new MutationObserver(scheduleScan)
scanPage()

if (document.body) {
	observer.observe(document.body, { childList: true, subtree: true })
}
