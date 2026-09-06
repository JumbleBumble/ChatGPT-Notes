import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import {
	Archive,
	ArrowLeft,
	FilePlus2,
	Folder,
	Search,
	Star,
	Trash2,
	X,
} from 'lucide-react'
import type { Note, NoteFolder } from '../../lib/notes/types'
import {
	formatDate,
	getSearchMatchCount,
	highlightHtml,
	textToHtml,
} from '../../lib/notes/utils'
import { Dropdown } from '../ui/Dropdown'
import { RichTextEditor } from './RichTextEditor'

type NoteEditorProps = {
	note: Note | null
	folders: NoteFolder[]
	onClose: () => void
	onToggleFavorite: () => void
	onDelete: () => void
	onMove: (folderId: string | null) => void
	onSaveTitle: (title: string) => void
	onSaveContent: (html: string, content: string) => void
	onCreateNote: () => void
}

const spring = { type: 'spring' as const, stiffness: 420, damping: 32 }

export function NoteEditor({
	note,
	folders,
	onClose,
	onToggleFavorite,
	onDelete,
	onMove,
	onSaveTitle,
	onSaveContent,
	onCreateNote,
}: NoteEditorProps) {
	const [editingTitle, setEditingTitle] = useState(false)
	const [editingContent, setEditingContent] = useState(false)
	const [draftTitle, setDraftTitle] = useState('')
	const [noteSearch, setNoteSearch] = useState('')
	const noteId = note?.id
	const noteTitle = note?.title ?? ''

	useEffect(() => {
		if (!noteId) {
			setDraftTitle('')
			setEditingTitle(false)
			setEditingContent(false)
			setNoteSearch('')
			return
		}

		setDraftTitle(noteTitle)
		setEditingTitle(false)
		setEditingContent(false)
		setNoteSearch('')
	}, [noteId, noteTitle])

	const renderedHtml = useMemo(() => {
		if (!note) return ''
		return highlightHtml(note.html || textToHtml(note.content), noteSearch)
	}, [note, noteSearch])

	const searchMatches = note
		? getSearchMatchCount(note.content, noteSearch)
		: 0

	const saveTitle = () => {
		if (!note) return
		const title = draftTitle.trim() || 'Untitled Note'
		onSaveTitle(title)
		setDraftTitle(title)
		setEditingTitle(false)
	}

	return (
		<AnimatePresence mode="wait" initial={false}>
			{!note ? (
				<motion.section
					key="empty"
					className="note-editor-panel"
					initial={{ opacity: 0, x: 20, scale: 0.99 }}
					animate={{ opacity: 1, x: 0, scale: 1 }}
					exit={{ opacity: 0, x: -12 }}
					transition={spring}
				>
					<motion.div
						className="no-note-selected"
						initial={{ opacity: 0, y: 12 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.08 }}
					>
						<motion.div
							className="no-note-icon"
							whileHover={{ y: -4, rotate: -4, scale: 1.06 }}
						>
							<Archive size={28} />
						</motion.div>
						<h2>Select a note</h2>
						<p>Choose a note from the list or create a new one.</p>
						<motion.button
							type="button"
							className="primary-button"
							onClick={onCreateNote}
							whileHover={{ y: -2, scale: 1.02 }}
							whileTap={{ scale: 0.97 }}
						>
							<FilePlus2 size={16} />
							New note
						</motion.button>
					</motion.div>
				</motion.section>
			) : (
				<motion.section
					key={note.id}
					className="note-editor-panel"
					layout
					initial={{ opacity: 0, x: 24, scale: 0.985 }}
					animate={{ opacity: 1, x: 0, scale: 1 }}
					exit={{ opacity: 0, x: -18, scale: 0.99 }}
					transition={spring}
				>
					<motion.header className="editor-header" layout="position">
						<div className="min-w-0 flex-1">
							<div className="flex min-w-0 items-center gap-[9px]">
								<motion.button
									type="button"
									className="editor-back-button"
									onClick={onClose}
									aria-label="Back to notes"
									title="Back to notes"
									whileHover={{ x: -3 }}
									whileTap={{ scale: 0.9 }}
								>
									<ArrowLeft size={17} />
								</motion.button>
								<AnimatePresence mode="wait" initial={false}>
									{editingTitle ? (
										<motion.input
											key="title-input"
											className="title-input"
											value={draftTitle}
											autoFocus
											onChange={(event) =>
												setDraftTitle(
													event.target.value,
												)
											}
											onKeyDown={(event) => {
												if (event.key === 'Enter')
													saveTitle()
												if (event.key === 'Escape') {
													setDraftTitle(note.title)
													setEditingTitle(false)
												}
											}}
											onBlur={saveTitle}
											initial={{
												opacity: 0,
												y: 5,
												scale: 0.98,
											}}
											animate={{
												opacity: 1,
												y: 0,
												scale: 1,
											}}
											exit={{ opacity: 0, y: -5 }}
											transition={spring}
										/>
									) : (
										<motion.button
											key="title"
											type="button"
											className="editor-title"
											onClick={() =>
												setEditingTitle(true)
											}
											initial={{ opacity: 0, y: 5 }}
											animate={{ opacity: 1, y: 0 }}
											exit={{ opacity: 0, y: -5 }}
											whileHover={{ x: 2 }}
										>
											{note.title}
										</motion.button>
									)}
								</AnimatePresence>
							</div>
							<motion.div
								className="editor-meta"
								layout="position"
							>
								<span>
									{formatDate(
										note.updatedAt ?? note.createdAt,
									)}
								</span>
								<span>
									{note.content.length.toLocaleString()}{' '}
									characters
								</span>
							</motion.div>
						</div>

						<div className="flex items-center gap-[5px]">
							<motion.button
								type="button"
								className={`editor-icon-button ${note.favorite ? 'favorite' : ''}`}
								aria-label={
									note.favorite
										? 'Remove favorite'
										: 'Add favorite'
								}
								onClick={onToggleFavorite}
								whileHover={{ y: -2, scale: 1.08 }}
								whileTap={{ scale: 0.86, rotate: -8 }}
							>
								<motion.span
									animate={{
										scale: note.favorite
											? [1, 1.25, 1]
											: 1,
									}}
								>
									<Star
										size={17}
										fill={
											note.favorite
												? 'currentColor'
												: 'none'
										}
									/>
								</motion.span>
							</motion.button>
							<motion.button
								type="button"
								className="editor-icon-button danger-icon"
								aria-label="Delete note"
								onClick={onDelete}
								whileHover={{ y: -2, scale: 1.08 }}
								whileTap={{ scale: 0.88 }}
							>
								<Trash2 size={17} />
							</motion.button>
							<motion.button
								type="button"
								className="editor-icon-button ml-[3px]"
								aria-label="Close note"
								onClick={onClose}
								title="Back to notes"
								whileHover={{ y: -2, scale: 1.08 }}
								whileTap={{ scale: 0.9 }}
							>
								<X size={17} />
							</motion.button>
						</div>
					</motion.header>

					<motion.div className="editor-toolbar" layout="position">
						<motion.button
							type="button"
							className={`toolbar-tab ${!editingContent ? 'active' : ''}`}
							onClick={() => setEditingContent(false)}
							whileTap={{ scale: 0.96 }}
						>
							Read
						</motion.button>
						<motion.button
							type="button"
							className={`toolbar-tab ${editingContent ? 'active' : ''}`}
							onClick={() => setEditingContent(true)}
							whileTap={{ scale: 0.96 }}
						>
							Edit
						</motion.button>
						<div className="flex-1" />
						<motion.div className="note-find" layout>
							<Search size={14} />
							<input
								value={noteSearch}
								onChange={(event) =>
									setNoteSearch(event.target.value)
								}
								placeholder="Find in note..."
							/>
							<AnimatePresence initial={false}>
								{noteSearch && (
									<motion.span
										key="count"
										className="match-count"
										initial={{ opacity: 0, scale: 0.7 }}
										animate={{ opacity: 1, scale: 1 }}
										exit={{ opacity: 0, scale: 0.7 }}
									>
										{searchMatches}
									</motion.span>
								)}
							</AnimatePresence>
						</motion.div>
						<AnimatePresence initial={false}>
							{noteSearch && (
								<motion.button
									key="clear"
									type="button"
									className="icon-button"
									aria-label="Clear note search"
									onClick={() => setNoteSearch('')}
									initial={{ opacity: 0, scale: 0.7 }}
									animate={{ opacity: 1, scale: 1 }}
									exit={{ opacity: 0, scale: 0.7 }}
									whileHover={{ rotate: 90 }}
									whileTap={{ scale: 0.85 }}
								>
									<X size={14} />
								</motion.button>
							)}
						</AnimatePresence>
					</motion.div>

					<div className="editor-content">
						<AnimatePresence mode="wait" initial={false}>
							{editingContent ? (
								<motion.div
									key="edit"
									initial={{ opacity: 0, y: 8 }}
									animate={{ opacity: 1, y: 0 }}
									exit={{ opacity: 0, y: -8 }}
									transition={{ duration: 0.18 }}
								>
									<RichTextEditor
										initialHtml={note.html}
										initialText={note.content}
										onSave={(html, content) => {
											onSaveContent(html, content)
											setEditingContent(false)
										}}
										onCancel={() =>
											setEditingContent(false)
										}
									/>
								</motion.div>
							) : (
								<motion.article
									key="read"
									className="note-content"
									initial={{ opacity: 0, y: 6 }}
									animate={{ opacity: 1, y: 0 }}
									exit={{ opacity: 0, y: -6 }}
									transition={{ duration: 0.18 }}
									dangerouslySetInnerHTML={{
										__html: renderedHtml,
									}}
								/>
							)}
						</AnimatePresence>
					</div>

					<motion.div className="editor-footer" layout="position">
						<div className="footer-folder">
							<Folder size={13} />
							<Dropdown
								value={note.folderId ?? '__root__'}
								onValueChange={(value) =>
									onMove(value === '__root__' ? null : value)
								}
								options={[
									{ value: '__root__', label: 'All Notes' },
									...folders.map((folder) => ({
										value: folder.id,
										label: folder.name,
									})),
								]}
								ariaLabel="Note folder"
								className="footer-dropdown"
							/>
						</div>
						<div className="footer-hint">
							<span>Click title to rename</span>
							<span>·</span>
							<span>Search finds title + content</span>
						</div>
					</motion.div>
				</motion.section>
			)}
		</AnimatePresence>
	)
}
