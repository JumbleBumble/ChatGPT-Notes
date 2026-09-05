import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState } from 'react'
import {
	Archive,
	BookOpen,
	Clock3,
	Folder,
	FolderOpen,
	FolderPlus,
	Moon,
	Plus,
	Star,
	Sun,
} from 'lucide-react'
import { FolderMenu } from './FolderMenu'
import type { Note, NoteFolder } from '../../lib/notes/types'
import '../../dark-mode.css'

type View = 'all' | 'favorites' | 'recent' | 'folder'
type SidebarProps = {
	notes: Note[]
	folders: NoteFolder[]
	view: View
	selectedFolderId: string | null
	onCreateNote: () => void
	onCreateFolder: () => void
	onSelectAll: () => void
	onSelectFavorites: () => void
	onSelectRecent: () => void
	onSelectFolder: (folderId: string) => void
	onRenameFolder: (folder: NoteFolder) => void
	onDeleteFolder: (folder: NoteFolder) => void
}
const spring = {
	type: 'spring' as const,
	stiffness: 420,
	damping: 32,
	mass: 0.65,
}
const press = { whileHover: { x: 2 }, whileTap: { scale: 0.985 } }

export function Sidebar({
	notes,
	folders,
	view,
	selectedFolderId,
	onCreateNote,
	onCreateFolder,
	onSelectAll,
	onSelectFavorites,
	onSelectRecent,
	onSelectFolder,
	onRenameFolder,
	onDeleteFolder,
}: SidebarProps) {
	const [darkMode, setDarkMode] = useState(() => {
		try {
			return localStorage.getItem('chatgpt-notes-dark-mode') === 'true'
		} catch {
			return false
		}
	})
	useEffect(() => {
		document.body.classList.toggle('dark-mode', darkMode)
		try {
			localStorage.setItem('chatgpt-notes-dark-mode', String(darkMode))
		} catch {}
	}, [darkMode])
	const favoriteCount = notes.filter((note) => note.favorite).length
	const folderCounts = new Map<string, number>()
	for (const note of notes) {
		if (note.folderId)
			folderCounts.set(
				note.folderId,
				(folderCounts.get(note.folderId) ?? 0) + 1,
			)
	}
	return (
		<motion.aside className="sidebar" layout transition={spring}>
			<motion.div
				className="sidebar-top"
				initial={{ opacity: 0, y: -8 }}
				animate={{ opacity: 1, y: 0 }}
				transition={spring}
			>
				<div className="brand">
					<motion.div
						className="brand-mark"
						whileHover={{ rotate: -4, scale: 1.06 }}
						whileTap={{ scale: 0.94 }}
						transition={spring}
					>
						<BookOpen size={17} />
					</motion.div>
					<div className="brand-name">Notes</div>
				</div>
			</motion.div>
			<motion.button
				type="button"
				className="new-note-button"
				onClick={onCreateNote}
				whileHover={{ y: -2, scale: 1.01 }}
				whileTap={{ scale: 0.97 }}
				transition={spring}
			>
				<Plus size={17} />
				New note
			</motion.button>
			<nav className="sidebar-section">
				<motion.button
					{...press}
					type="button"
					className={`nav-item ${view === 'all' && selectedFolderId === null ? 'active' : ''}`}
					onClick={onSelectAll}
				>
					<Archive size={16} />
					<span>All Notes</span>
					<motion.span className="nav-count" layout>
						{notes.length}
					</motion.span>
				</motion.button>
				<motion.button
					{...press}
					type="button"
					className={`nav-item ${view === 'favorites' ? 'active' : ''}`}
					onClick={onSelectFavorites}
				>
					<motion.span
						animate={{ scale: view === 'favorites' ? 1.08 : 1 }}
					>
						<Star size={16} />
					</motion.span>
					<span>Favorites</span>
					<motion.span className="nav-count" layout>
						{favoriteCount}
					</motion.span>
				</motion.button>
				<motion.button
					{...press}
					type="button"
					className={`nav-item ${view === 'recent' ? 'active' : ''}`}
					onClick={onSelectRecent}
				>
					<Clock3 size={16} />
					<span>Recent</span>
				</motion.button>
			</nav>
			<motion.div className="sidebar-heading" layout="position">
				<span>Folders</span>
				<motion.button
					type="button"
					className="icon-button"
					aria-label="Create folder"
					onClick={onCreateFolder}
					whileHover={{ rotate: 6, scale: 1.08 }}
					whileTap={{ scale: 0.9 }}
					transition={spring}
				>
					<FolderPlus size={15} />
				</motion.button>
			</motion.div>
			<motion.div className="folder-list" layout>
				<AnimatePresence initial={false} mode="popLayout">
					{folders.map((folder, index) => {
						const active =
							view === 'folder' && selectedFolderId === folder.id
						return (
							<motion.div
								key={folder.id}
								layout
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								exit={{ opacity: 0 }}
								transition={{
									...spring,
									delay: Math.min(index * 0.025, 0.15),
								}}
								className={`folder-row ${active ? 'active' : ''}`}
							>
								<motion.button
									{...press}
									type="button"
									className="folder-button"
									onClick={() => onSelectFolder(folder.id)}
								>
									<motion.span
										animate={{ rotate: active ? 0 : -3 }}
										transition={spring}
									>
										{active ? (
											<FolderOpen size={15} />
										) : (
											<Folder size={15} />
										)}
									</motion.span>
									<span>{folder.name}</span>
									<motion.span className="nav-count" layout>
										{folderCounts.get(folder.id) ?? 0}
									</motion.span>
								</motion.button>
								<FolderMenu
									folder={folder}
									onRename={() => onRenameFolder(folder)}
									onDelete={() => onDeleteFolder(folder)}
								/>
							</motion.div>
						)
					})}
				</AnimatePresence>
				{folders.length === 0 && (
					<motion.div
						className="empty-sidebar"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
					>
						No folders yet
					</motion.div>
				)}
			</motion.div>
			<motion.button
				type="button"
				className="theme-toggle"
				aria-label={
					darkMode ? 'Switch to light mode' : 'Switch to dark mode'
				}
				aria-pressed={darkMode}
				title={
					darkMode ? 'Switch to light mode' : 'Switch to dark mode'
				}
				onClick={() => setDarkMode((current) => !current)}
				whileHover={{ scale: 1.08, rotate: darkMode ? -6 : 6 }}
				whileTap={{ scale: 0.9 }}
				transition={spring}
			>
				{darkMode ? <Moon size={16} /> : <Sun size={16} />}
			</motion.button>
		</motion.aside>
	)
}
