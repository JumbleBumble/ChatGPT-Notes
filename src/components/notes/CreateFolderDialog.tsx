import { motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { FolderPlus, X } from 'lucide-react'

type CreateFolderDialogProps = {
	open: boolean
	onClose: () => void
	onCreate: (name: string) => void | Promise<void>
}
const spring = {
	type: 'spring' as const,
	stiffness: 420,
	damping: 30,
	mass: 0.65,
}
export function CreateFolderDialog({
	open,
	onClose,
	onCreate,
}: CreateFolderDialogProps) {
	const dialogRef = useRef<HTMLDialogElement>(null)
	const [name, setName] = useState('')
	const [submitting, setSubmitting] = useState(false)
	useEffect(() => {
		if (open) {
			setName('')
			setSubmitting(false)
		}
	}, [open])
	useEffect(() => {
		const dialog = dialogRef.current
		if (!dialog) return
		if (open) {
			if (!dialog.open) dialog.showModal()
		} else if (dialog.open) dialog.close()
	}, [open])
	const close = () => {
		if (!submitting) onClose()
	}
	const submit = async () => {
		const value = name.trim()
		if (!value || submitting) return
		setSubmitting(true)
		try {
			await onCreate(value)
		} finally {
			setSubmitting(false)
		}
	}
	if (!open) return null
	return (
		<dialog
			ref={dialogRef}
			className="modal-backdrop w-full h-full max-w-none max-h-none m-0 p-0 border-0 bg-transparent"
			aria-labelledby="create-folder-dialog-title"
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
				className="modal-card"
				role="document"
				onMouseDown={(event) => event.stopPropagation()}
				initial={{ opacity: 0, y: 14, scale: 0.96 }}
				animate={{ opacity: 1, y: 0, scale: 1 }}
				exit={{ opacity: 0, y: 8, scale: 0.97 }}
				transition={spring}
			>
				<motion.div
					className="modal-header"
					initial={{ opacity: 0, y: -5 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ ...spring, delay: 0.04 }}
				>
					<motion.div
						className="modal-icon"
						whileHover={{ rotate: -4, scale: 1.05 }}
						transition={spring}
					>
						<FolderPlus size={19} />
					</motion.div>
					<motion.button
						type="button"
						className="icon-button"
						aria-label="Close"
						onClick={close}
						disabled={submitting}
						whileHover={{ scale: 1.08, rotate: 3 }}
						whileTap={{ scale: 0.9 }}
					>
						<X size={15} />
					</motion.button>
				</motion.div>
				<motion.div
					id="create-folder-dialog-title"
					className="modal-title"
					initial={{ opacity: 0, y: 5 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ ...spring, delay: 0.07 }}
				>
					Create folder
				</motion.div>
				<motion.div
					className="modal-description"
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ delay: 0.1 }}
				>
					Keep related ChatGPT notes together.
				</motion.div>
				<motion.div
					className="modal-field"
					initial={{ opacity: 0, y: 5 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ ...spring, delay: 0.11 }}
				>
					<label htmlFor="create-folder-name">Folder name</label>
					<input
						id="create-folder-name"
						autoFocus
						className="modal-input"
						value={name}
						disabled={submitting}
						onChange={(event) => setName(event.target.value)}
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
						placeholder="e.g. React, Work, Ideas"
					/>
				</motion.div>
				<motion.div
					className="modal-actions"
					initial={{ opacity: 0, y: 5 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ ...spring, delay: 0.14 }}
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
						disabled={!name.trim() || submitting}
						whileHover={{ y: -1, scale: 1.01 }}
						whileTap={{ scale: 0.97 }}
					>
						{submitting ? 'Creating...' : 'Create folder'}
					</motion.button>
				</motion.div>
			</motion.div>
		</dialog>
	)
}
