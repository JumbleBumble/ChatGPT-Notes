import { createRoot, type Root } from 'react-dom/client'
import { SaveResponseDialog } from '../components/chatgpt/SaveResponseDialog'
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

const dialogHosts = new WeakMap<Element, DialogHost>()

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
	response: ResponseData | null,
) {
	const { root } = getDialogHost(actionGroup)

	root.render(
		<SaveResponseDialog
			open={open}
			response={response}
			onPickerRequired={() => pickResponseData()}
			onClose={() => renderDialog(actionGroup, false, null)}
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

	button.addEventListener('click', (event) => {
		event.preventDefault()
		event.stopPropagation()
		renderDialog(actionGroup, true, getResponseData(actionGroup))
	})

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
