import { motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { FilePlus2, Folder, X } from 'lucide-react'
import type { NoteFolder } from '../../lib/notes/types'
import { Dropdown } from '../ui/Dropdown'

type CreateNoteDialogProps = {
	open: boolean
	folders: NoteFolder[]
	initialFolderId: string | null
	onClose: () => void
	onCreate: (title: string, content: string, folderId: string | null) => void
}

export function CreateNoteDialog({
	open,
	folders,
	initialFolderId,
	onClose,
	onCreate,
}: CreateNoteDialogProps) {
	const dialogRef = useRef<HTMLDialogElement>(null)

	const [title, setTitle] = useState('')
	const [content, setContent] = useState('')
	const [folderId, setFolderId] = useState<string>(
		initialFolderId ?? '__root__',
	)
	const [submitting, setSubmitting] = useState(false)

	useEffect(() => {
		if (!open) return
		setTitle('')
		setContent('')
		setFolderId(initialFolderId ?? '__root__')
		setSubmitting(false)
	}, [open, initialFolderId])

	useEffect(() => {
		const dialog = dialogRef.current
		if (!dialog) return

		if (open) {
			if (!dialog.open) dialog.showModal()
		} else if (dialog.open) {
			dialog.close()
		}
	}, [open])

	const close = () => {
		if (submitting) return
		onClose()
	}

	const submit = async () => {
		if (submitting) return
		setSubmitting(true)

		try {
			await onCreate(
				title.trim() || 'Untitled Note',
				content.trim(),
				folderId === '__root__' ? null : folderId,
			)
		} finally {
			setSubmitting(false)
		}
	}

	if (!open) return null

	return (
		<dialog
			ref={dialogRef}
			className="modal-backdrop w-full h-full max-w-none max-h-none m-0 p-0 border-0 bg-transparent"
			aria-labelledby="create-note-dialog-title"
			aria-modal="true"
			onCancel={(event) => {
				event.preventDefault()
				close()
			}}
			onMouseDown={(event) => {
				if (event.target === event.currentTarget) close()
			}}
		>
			<motion.div
				className="modal-card create-note-modal"
				role="document"
				initial={{ opacity: 0, y: 18, scale: 0.96 }}
				animate={{ opacity: 1, y: 0, scale: 1 }}
				transition={{ type: 'spring', stiffness: 420, damping: 30 }}
				onMouseDown={(event) => event.stopPropagation()}
			>
				<motion.div
					className="modal-header"
					initial={{ opacity: 0, y: -8 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.04 }}
				>
					<motion.div
						className="modal-icon"
						whileHover={{ rotate: -6, scale: 1.08 }}
						whileTap={{ scale: 0.94 }}
					>
						<FilePlus2 size={19} />
					</motion.div>
					<motion.button
						type="button"
						className="icon-button"
						aria-label="Close"
						onClick={close}
						disabled={submitting}
						whileHover={{ scale: 1.08 }}
						whileTap={{ scale: 0.9 }}
					>
						<X size={15} />
					</motion.button>
				</motion.div>

				<motion.div
					id="create-note-dialog-title"
					className="modal-title"
					initial={{ opacity: 0, y: 8 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.08 }}
				>
					New note
				</motion.div>
				<motion.div
					className="modal-description"
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ delay: 0.12 }}
				>
					Create a note directly in your notes library.
				</motion.div>

				<motion.div
					className="modal-field"
					initial={{ opacity: 0, x: -8 }}
					animate={{ opacity: 1, x: 0 }}
					transition={{ delay: 0.16 }}
				>
					<label htmlFor="create-note-title">Title</label>
					<input
						id="create-note-title"
						className="modal-input"
						value={title}
						autoFocus
						disabled={submitting}
						onChange={(event) => setTitle(event.target.value)}
						onKeyDown={(event) => {
							if (event.key === 'Enter') {
								event.preventDefault()
								void submit()
							}
							if (event.key === 'Escape') {
								event.preventDefault()
								close()
							}
						}}
						placeholder="Note title"
					/>
				</motion.div>

				<motion.div
					className="modal-field"
					initial={{ opacity: 0, x: -8 }}
					animate={{ opacity: 1, x: 0 }}
					transition={{ delay: 0.2 }}
				>
					<label htmlFor="create-note-folder">Folder</label>
					<div className="modal-select-wrap">
						<Folder size={14} />
						<Dropdown
							id="create-note-folder"
							value={folderId}
							disabled={submitting}
							onValueChange={setFolderId}
							options={[
								{ value: '__root__', label: 'All Notes' },
								...folders.map((folder) => ({
									value: folder.id,
									label: folder.name,
								})),
							]}
							ariaLabel="Folder"
							className="modal-dropdown"
						/>
					</div>
				</motion.div>

				<motion.div
					className="modal-field"
					initial={{ opacity: 0, x: -8 }}
					animate={{ opacity: 1, x: 0 }}
					transition={{ delay: 0.24 }}
				>
					<label htmlFor="create-note-content">Content</label>
					<textarea
						id="create-note-content"
						className="modal-textarea"
						value={content}
						disabled={submitting}
						onChange={(event) => setContent(event.target.value)}
						placeholder="Write something..."
					/>
				</motion.div>

				<motion.div
					className="modal-actions"
					initial={{ opacity: 0, y: 8 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.28 }}
				>
					<motion.button
						type="button"
						className="secondary-button"
						onClick={close}
						disabled={submitting}
						whileHover={{ y: -1 }}
						whileTap={{ scale: 0.97 }}
					>
						Cancel
					</motion.button>
					<motion.button
						type="button"
						className="primary-button"
						onClick={() => void submit()}
						disabled={submitting}
						whileHover={{ y: -1, scale: 1.01 }}
						whileTap={{ scale: 0.97 }}
					>
						{submitting ? 'Creating...' : 'Create note'}
					</motion.button>
				</motion.div>
			</motion.div>
		</dialog>
	)
}
