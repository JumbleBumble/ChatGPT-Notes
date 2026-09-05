import { AnimatePresence, motion } from 'motion/react'
import { createPortal } from 'react-dom'
import { useEffect, useRef, useState } from 'react'
import { Edit3, MoreHorizontal, Trash2 } from 'lucide-react'
import type { NoteFolder } from '../../lib/notes/types'

type FolderMenuProps = {
	folder: NoteFolder
	onRename: () => void
	onDelete: () => void
}
const spring = {
	type: 'spring' as const,
	stiffness: 500,
	damping: 34,
	mass: 0.6,
}
export function FolderMenu({ folder, onRename, onDelete }: FolderMenuProps) {
	const [open, setOpen] = useState(false)
	const [menuPosition, setMenuPosition] = useState({ left: 0, top: 0 })
	const triggerRef = useRef<HTMLButtonElement>(null)

	useEffect(() => {
		if (!open || !triggerRef.current) return
		const trigger = triggerRef.current

		const updatePosition = () => {
			const bounds = trigger.getBoundingClientRect()
			setMenuPosition({
				left: Math.max(8, bounds.right - 130),
				top: bounds.bottom + 6,
			})
		}

		updatePosition()
		window.addEventListener('resize', updatePosition)
		window.addEventListener('scroll', updatePosition, true)
		return () => {
			window.removeEventListener('resize', updatePosition)
			window.removeEventListener('scroll', updatePosition, true)
		}
	}, [open])

	return (
		<div className="folder-menu">
			<motion.button
				ref={triggerRef}
				className="icon-button"
				type="button"
				aria-label={`Options for ${folder.name}`}
				onClick={(event) => {
					event.stopPropagation()
					setOpen((value) => !value)
				}}
				whileHover={{ scale: 1.08 }}
				whileTap={{ scale: 0.9 }}
				animate={{ rotate: open ? 90 : 0 }}
				transition={spring}
			>
				<MoreHorizontal size={16} />
			</motion.button>
			{open &&
				(createPortal(
					<AnimatePresence>
						<motion.div
							className="menu-backdrop"
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							onClick={() => setOpen(false)}
						/>
						<motion.div
							className="context-menu"
							style={menuPosition}
							initial={{ opacity: 0, scale: 0.94, y: -5 }}
							animate={{ opacity: 1, scale: 1, y: 0 }}
							exit={{ opacity: 0, scale: 0.96, y: -3 }}
							transition={spring}
						>
							<motion.button
								type="button"
								onClick={() => {
									setOpen(false)
									onRename()
								}}
								whileHover={{ x: 2 }}
								whileTap={{ scale: 0.98 }}
							>
								<Edit3 size={15} />
								Rename
							</motion.button>
							<motion.button
								className="danger"
								type="button"
								onClick={() => {
									setOpen(false)
									onDelete()
								}}
								whileHover={{ x: 2 }}
								whileTap={{ scale: 0.98 }}
							>
								<Trash2 size={15} />
								Delete
							</motion.button>
						</motion.div>
					</AnimatePresence>,
					document.body,
				) as React.ReactNode)}
		</div>
	)
}
