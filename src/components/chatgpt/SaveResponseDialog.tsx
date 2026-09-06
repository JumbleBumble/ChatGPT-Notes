import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, Folder, X } from 'lucide-react'
import type { NoteFolder, ResponseData } from '../../lib/notes/types'
import {
	createNote,
	getFolders,
	ROOT_FOLDER_ID,
} from '../../lib/notes/storage'
import { Dropdown } from '../ui/Dropdown'
import './save-response-dialog.css'

type SaveResponseDialogProps = {
	open: boolean
	response: ResponseData | null
	onPickerRequired: () => Promise<ResponseData | null>
	onClose: () => void
}

const styles = {
	dialog: {
		boxSizing: 'border-box' as const,
		width: 'min(700px, calc(100vw - 32px))',
		maxWidth: '700px',
		height: 'min(760px, calc(100vh - 32px))',
		maxHeight: 'calc(100vh - 32px)',
		margin: 'auto',
		padding: 0,
		border: '1px solid rgba(0, 0, 0, 0.09)',
		borderRadius: '18px',
		background: '#ffffff',
		color: '#171717',
		outline: 'none',
		overflow: 'hidden',
		fontFamily:
			"Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
		boxShadow:
			'0 28px 90px rgba(0, 0, 0, 0.20), 0 10px 30px rgba(0, 0, 0, 0.10)',
		transition:
			'opacity 180ms ease, transform 220ms cubic-bezier(0.16, 1, 0.3, 1)',
	},

	shell: {
		display: 'flex',
		flexDirection: 'column' as const,
		width: '100%',
		height: '100%',
		minHeight: 0,
	},

	header: {
		display: 'flex',
		alignItems: 'flex-start',
		justifyContent: 'space-between',
		gap: '20px',
		flexShrink: 0,
		padding: '22px 24px 18px',
		borderBottom: '1px solid #ececef',
		background: '#ffffff',
	},

	title: {
		margin: 0,
		fontSize: '18px',
		lineHeight: 1.25,
		fontWeight: 650,
		letterSpacing: '-0.02em',
		color: '#171717',
	},

	subtitle: {
		marginTop: '5px',
		fontSize: '12px',
		lineHeight: 1.45,
		color: '#73737a',
	},

	closeButton: {
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		flexShrink: 0,
		width: '34px',
		height: '34px',
		padding: 0,
		border: 0,
		borderRadius: '10px',
		background: '#f4f4f5',
		color: '#66666c',
		transition:
			'background-color 140ms ease, color 140ms ease, transform 140ms ease',
	},

	content: {
		display: 'flex',
		flexDirection: 'column' as const,
		flex: '1 1 auto',
		minHeight: 0,
		overflowY: 'auto' as const,
		overflowX: 'visible' as const,
		padding: '22px 24px 24px',
		overscrollBehavior: 'contain' as const,
		scrollbarWidth: 'thin' as const,
	},

	label: {
		display: 'block',
		marginBottom: '8px',
		fontSize: '12px',
		lineHeight: 1.3,
		fontWeight: 650,
		color: '#3f3f44',
	},

	input: {
		boxSizing: 'border-box' as const,
		display: 'block',
		width: '100%',
		height: '44px',
		padding: '13px',
		border: '1px solid #d9d9dd',
		borderRadius: '10px',
		background: '#fafafa',
		color: '#171717',
		fontSize: '13px',
		lineHeight: 1,
		outline: 'none',
		transition:
			'border-color 140ms ease, box-shadow 140ms ease, background-color 140ms ease',
	},

	folderLabel: {
		marginTop: '18px',
	},

	folderWrapper: {
		position: 'relative' as const,
		display: 'flex',
		alignItems: 'center',
		flexShrink: 0,
	},

	folderIcon: {
		position: 'absolute' as const,
		left: '13px',
		zIndex: 10,
		pointerEvents: 'none' as const,
		color: '#818188',
	},

	preview: {
		display: 'flex',
		flexDirection: 'column' as const,
		flex: '1 1 auto',
		minHeight: '220px',
		marginTop: '18px',
		overflow: 'hidden',
		border: '1px solid #e5e5e8',
		borderRadius: '12px',
		background: '#f8f8f9',
		boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)',
	},

	previewLabel: {
		flexShrink: 0,
		padding: '10px 13px 6px',
		fontSize: '9px',
		lineHeight: 1.2,
		fontWeight: 750,
		textTransform: 'uppercase' as const,
		letterSpacing: '0.07em',
		color: '#8a8a91',
	},

	previewText: {
		flex: '1 1 auto',
		minHeight: 0,
		overflowY: 'auto' as const,
		padding: '0 13px 13px',
		whiteSpace: 'pre-wrap' as const,
		overflowWrap: 'anywhere' as const,
		fontSize: '11px',
		lineHeight: 1.6,
		color: '#4b4b50',
		scrollbarWidth: 'thin' as const,
	},

	pickerNotice: {
		marginTop: '18px',
		padding: '12px 13px',
		border: '1px solid #e5e5e7',
		borderRadius: '10px',
		background: '#fafafa',
		fontSize: '11px',
		lineHeight: 1.5,
		color: '#73737a',
	},

	error: {
		marginTop: '14px',
		padding: '11px 12px',
		border: '1px solid #ffd2d2',
		borderRadius: '10px',
		background: '#fff5f5',
		fontSize: '11px',
		lineHeight: 1.45,
		color: '#b42323',
		animation: 'none',
	},

	footer: {
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'flex-end',
		gap: '8px',
		flexShrink: 0,
		padding: '14px 24px 18px',
		borderTop: '1px solid #ececef',
		background: 'rgba(252, 252, 252, 0.96)',
	},

	cancelButton: {
		boxSizing: 'border-box' as const,
		height: '38px',
		padding: '0 15px',
		border: '1px solid #d2d2d5',
		borderRadius: '9px',
		background: '#ffffff',
		color: '#45454a',
		fontSize: '11px',
		fontWeight: 650,
		transition:
			'background-color 140ms ease, border-color 140ms ease, transform 140ms ease, box-shadow 140ms ease',
	},

	saveButton: {
		display: 'inline-flex',
		alignItems: 'center',
		justifyContent: 'center',
		boxSizing: 'border-box' as const,
		minWidth: '100px',
		height: '38px',
		gap: '6px',
		padding: '0 15px',
		border: '1px solid #171717',
		borderRadius: '9px',
		background: '#171717',
		color: '#ffffff',
		fontSize: '11px',
		fontWeight: 650,
		transition:
			'background-color 180ms ease, opacity 140ms ease, transform 140ms ease, box-shadow 140ms ease',
	},
}

export function SaveResponseDialog({
	open,
	response: initialResponse,
	onPickerRequired,
	onClose,
}: SaveResponseDialogProps): JSX.Element | null {
	const dialogRef = useRef<HTMLDialogElement>(null)
	const closeTimerRef = useRef<number | null>(null)

	const [mounted, setMounted] = useState(false)
	const [entered, setEntered] = useState(false)
	const [response, setResponse] = useState<ResponseData | null>(
		initialResponse,
	)
	const [title, setTitle] = useState('')
	const [folders, setFolders] = useState<NoteFolder[]>([])
	const [folderId, setFolderId] = useState(ROOT_FOLDER_ID)
	const [saving, setSaving] = useState(false)
	const [saved, setSaved] = useState(false)
	const [error, setError] = useState('')

	useEffect(() => {
		if (open) {
			setMounted(true)
			setResponse(initialResponse)
			setTitle('')
			setFolderId(ROOT_FOLDER_ID)
			setSaving(false)
			setSaved(false)
			setError('')

			void getFolders()
				.then(setFolders)
				.catch((folderError) => {
					console.error('Failed to load folders:', folderError)
					setFolders([])
				})
		}
	}, [open, initialResponse])

	useEffect(() => {
		const dialog = dialogRef.current

		if (!dialog || !mounted) return

		if (open && !dialog.open) {
			try {
				dialog.showModal()

				requestAnimationFrame(() => {
					requestAnimationFrame(() => {
						setEntered(true)
					})
				})
			} catch (error) {
				console.error('Failed to open save dialog:', error)
			}
		} else if (!open && dialog.open) {
			setEntered(false)
			window.setTimeout(() => {
				if (dialog.open) {
					dialog.close()
				}
			}, 180)
		}
	}, [open, mounted])

	useEffect(() => {
		if (!open) return

		const previousOverflow = document.documentElement.style.overflow
		document.documentElement.style.overflow = 'hidden'

		return () => {
			document.documentElement.style.overflow = previousOverflow
		}
	}, [open])

	useEffect(() => {
		return () => {
			if (closeTimerRef.current !== null) {
				window.clearTimeout(closeTimerRef.current)
			}
		}
	}, [])

	const close = () => {
		if (saving) return

		setEntered(false)

		if (closeTimerRef.current !== null) {
			window.clearTimeout(closeTimerRef.current)
		}

		closeTimerRef.current = window.setTimeout(() => {
			onClose()
		}, 180)
	}

	const ensureResponse = async () => {
		if (response?.text.trim()) return response

		const picked = await onPickerRequired()

		if (picked?.text.trim()) {
			setResponse(picked)
			return picked
		}

		return null
	}

	const handleSave = async () => {
		if (saving || saved) return

		setError('')
		setSaving(true)

		try {
			const responseToSave = await ensureResponse()

			if (!responseToSave) {
				setError(
					'Could not find any response content. Please try selecting the response again.',
				)
				return
			}

			await createNote({
				title: title.trim() || 'Untitled Note',
				content: responseToSave.text.trim(),
				html: responseToSave.html,
				folderId: folderId === ROOT_FOLDER_ID ? null : folderId,
				favorite: false,
			})

			setSaved(true)

			window.setTimeout(() => {
				onClose()
			}, 650)
		} catch (saveError) {
			console.error('Failed to save note:', saveError)

			setError(
				saveError instanceof Error
					? saveError.message
					: 'Failed to save note. Please try again.',
			)
		} finally {
			setSaving(false)
		}
	}

	if (!mounted) return null

	const dialogStyle = {
		...styles.dialog,
		opacity: entered ? 1 : 0,
		transform: entered ? 'scale(1)' : 'scale(0.97)',
	}

	return createPortal(
		<dialog
			ref={dialogRef}
			aria-labelledby="chatgpt-notes-dialog-title"
			data-chatgpt-notes-ui="true"
			onCancel={(event) => {
				event.preventDefault()
				close()
			}}
			onMouseDown={(event) => {
				if (event.target === event.currentTarget) {
					close()
				}
			}}
			style={dialogStyle}
		>
			<div
				onMouseDown={(event) => event.stopPropagation()}
				style={styles.shell}
			>
				<header style={styles.header}>
					<div style={{ minWidth: 0 }}>
						<div
							id="chatgpt-notes-dialog-title"
							style={styles.title}
						>
							Save response
						</div>

						<div style={styles.subtitle}>
							Save this ChatGPT response to your notes library.
						</div>
					</div>

					<button
						type="button"
						aria-label="Close"
						disabled={saving}
						onClick={close}
						onMouseEnter={(event) => {
							if (!saving) {
								event.currentTarget.style.background =
									'#eaeaec'
								event.currentTarget.style.color = '#333338'
							}
						}}
						onMouseLeave={(event) => {
							event.currentTarget.style.background = '#f4f4f5'
							event.currentTarget.style.color = '#66666c'
						}}
						onMouseDown={(event) => {
							if (!saving) {
								event.currentTarget.style.transform =
									'scale(0.94)'
							}
						}}
						onMouseUp={(event) => {
							event.currentTarget.style.transform = 'scale(1)'
						}}
						style={{
							...styles.closeButton,
							cursor: saving ? 'default' : 'pointer',
							opacity: saving ? 0.6 : 1,
						}}
					>
						<X size={16} />
					</button>
				</header>

				<div style={styles.content}>
					<label htmlFor="chatgpt-notes-title" style={styles.label}>
						Title
					</label>

					<input
						id="chatgpt-notes-title"
						autoFocus
						value={title}
						disabled={saving}
						onChange={(event) => setTitle(event.target.value)}
						onFocus={(event) => {
							event.currentTarget.style.borderColor = '#a1a1aa'
							event.currentTarget.style.background = '#ffffff'
							event.currentTarget.style.boxShadow =
								'0 0 0 3px rgba(0, 0, 0, 0.06)'
						}}
						onBlur={(event) => {
							event.currentTarget.style.borderColor = '#d9d9dd'
							event.currentTarget.style.background = '#fafafa'
							event.currentTarget.style.boxShadow = 'none'
						}}
						onKeyDown={(event) => {
							if (event.key === 'Enter') {
								event.preventDefault()
								void handleSave()
							}

							if (event.key === 'Escape') {
								event.preventDefault()
								close()
							}
						}}
						placeholder="Give this note a title"
						style={{
							...styles.input,
							opacity: saving ? 0.65 : 1,
						}}
					/>

					<label
						htmlFor="chatgpt-notes-folder"
						style={{
							...styles.label,
							...styles.folderLabel,
						}}
					>
						Folder
					</label>

					<div style={styles.folderWrapper}>
						<Folder size={15} style={styles.folderIcon} />

						<Dropdown
							id="chatgpt-notes-folder"
							value={folderId}
							disabled={saving}
							onValueChange={setFolderId}
							options={[
								{
									value: ROOT_FOLDER_ID,
									label: 'All Notes',
								},
								...folders.map((folder) => ({
									value: folder.id,
									label: folder.name,
								})),
							]}
							ariaLabel="Folder"
							className="modal-dropdown"
						/>
					</div>

					{response?.text ? (
						<div style={styles.preview}>
							<div style={styles.previewLabel}>
								Response preview
							</div>

							<div style={styles.previewText}>
								{response.text}
							</div>
						</div>
					) : (
						<div style={styles.pickerNotice}>
							The response could not be detected automatically.
							Clicking save will open the element picker.
						</div>
					)}

					{error && (
						<div
							role="alert"
							style={{
								...styles.error,
								animation: 'none',
							}}
						>
							{error}
						</div>
					)}
				</div>

				<footer style={styles.footer}>
					<button
						type="button"
						disabled={saving}
						onClick={close}
						onMouseEnter={(event) => {
							if (!saving) {
								event.currentTarget.style.background =
									'#f7f7f8'
								event.currentTarget.style.borderColor =
									'#bdbdc2'
								event.currentTarget.style.boxShadow =
									'0 2px 5px rgba(0, 0, 0, 0.05)'
							}
						}}
						onMouseLeave={(event) => {
							event.currentTarget.style.background = '#ffffff'
							event.currentTarget.style.borderColor = '#d2d2d5'
							event.currentTarget.style.boxShadow = 'none'
						}}
						onMouseDown={(event) => {
							if (!saving) {
								event.currentTarget.style.transform =
									'translateY(1px)'
							}
						}}
						onMouseUp={(event) => {
							event.currentTarget.style.transform =
								'translateY(0)'
						}}
						style={{
							...styles.cancelButton,
							cursor: saving ? 'default' : 'pointer',
							opacity: saving ? 0.55 : 1,
						}}
					>
						Cancel
					</button>

					<button
						type="button"
						disabled={saving || saved}
						onClick={() => void handleSave()}
						onMouseEnter={(event) => {
							if (!saving && !saved) {
								event.currentTarget.style.background =
									'#2b2b2b'
								event.currentTarget.style.boxShadow =
									'0 4px 12px rgba(0, 0, 0, 0.16)'
							}
						}}
						onMouseLeave={(event) => {
							if (!saved) {
								event.currentTarget.style.background =
									'#171717'
								event.currentTarget.style.boxShadow = 'none'
							}
						}}
						onMouseDown={(event) => {
							if (!saving && !saved) {
								event.currentTarget.style.transform =
									'translateY(1px) scale(0.99)'
							}
						}}
						onMouseUp={(event) => {
							event.currentTarget.style.transform =
								'translateY(0) scale(1)'
						}}
						style={{
							...styles.saveButton,
							cursor: saving || saved ? 'default' : 'pointer',
							background: saved ? '#10a37f' : '#171717',
							borderColor: saved ? '#10a37f' : '#171717',
							opacity: saving ? 0.7 : 1,
						}}
					>
						{saved ? (
							<>
								<Check size={15} />
								Saved
							</>
						) : saving ? (
							'Saving…'
						) : (
							'Save note'
						)}
					</button>
				</footer>
			</div>
		</dialog>,
		document.body,
	)
}
