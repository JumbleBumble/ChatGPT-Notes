import { AnimatePresence, motion } from 'motion/react'
import { BookOpen, FilePlus2, Folder, Star } from 'lucide-react'
import type { Note, NoteFolder } from '../../lib/notes/types'
import { formatDate } from '../../lib/notes/utils'

type NoteListProps = {
	notes: Note[]
	folders: NoteFolder[]
	selectedNoteId: string | null
	loading: boolean
	title: string
	globalSearch: string
	onSelectNote: (note: Note) => void
	onCreateNote: () => void
}
const spring = {
	type: 'spring' as const,
	stiffness: 420,
	damping: 32,
	mass: 0.65,
}

export function NoteList({
	notes,
	folders,
	selectedNoteId,
	loading,
	title,
	globalSearch,
	onSelectNote,
	onCreateNote,
}: NoteListProps) {
	return (
		<motion.section className="note-list-panel" layout transition={spring}>
			<motion.div className="list-header" layout="position">
				<div>
					<motion.div className="list-title" layout="position">
						{globalSearch
							? `${notes.length} result${notes.length === 1 ? '' : 's'}`
							: title}
					</motion.div>
					<motion.div className="list-subtitle" layout="position">
						{notes.length > 0
							? 'Your saved knowledge'
							: 'Nothing here yet'}
					</motion.div>
				</div>
			</motion.div>
			<div className="notes-scroll">
				<AnimatePresence mode="popLayout" initial={false}>
					{loading ? (
						<motion.div
							key="loading"
							className="loading-state"
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
						>
							<div className="spinner" />
							Loading notes
						</motion.div>
					) : notes.length === 0 ? (
						<motion.div
							key="empty"
							className="empty-state"
							initial={{ opacity: 0, y: 8, scale: 0.98 }}
							animate={{ opacity: 1, y: 0, scale: 1 }}
							exit={{ opacity: 0, y: -6 }}
							transition={spring}
						>
							<motion.div
								className="empty-icon"
								whileHover={{ y: -3, scale: 1.04 }}
								transition={spring}
							>
								<BookOpen size={20} />
							</motion.div>
							<div className="empty-title">
								{globalSearch
									? 'No matches'
									: 'No notes found'}
							</div>
							<div className="empty-description">
								{globalSearch
									? 'Try another search term.'
									: 'Save a ChatGPT response or create a note to get started.'}
							</div>
							{!globalSearch && (
								<motion.button
									type="button"
									className="empty-button"
									onClick={onCreateNote}
									whileHover={{ y: -2, scale: 1.02 }}
									whileTap={{ scale: 0.97 }}
									transition={spring}
								>
									<FilePlus2 size={15} />
									Create note
								</motion.button>
							)}
						</motion.div>
					) : (
						<motion.div className="notes-list" layout>
							<AnimatePresence mode="popLayout" initial={false}>
								{notes.map((note, index) => {
									const folderName = note.folderId
										? folders.find(
												(folder) =>
													folder.id ===
													note.folderId,
											)?.name
										: undefined
									return (
										<motion.button
											key={note.id}
											type="button"
											className={`note-card ${selectedNoteId === note.id ? 'selected' : ''}`}
											onClick={() => onSelectNote(note)}
											layout
											initial={{
												opacity: 0,
												y: 12,
												scale: 0.985,
											}}
											animate={{
												opacity: 1,
												y: 0,
												scale: 1,
											}}
											exit={{
												opacity: 0,
												y: -8,
												scale: 0.98,
											}}
											transition={{
												...spring,
												delay: Math.min(
													index * 0.025,
													0.18,
												),
											}}
											whileHover={{
												y: -1,
												scale: 1.006,
											}}
											whileTap={{ scale: 0.992 }}
										>
											<div className="flex items-center gap-[7px]">
												<div className="note-card-title">
													{note.title}
												</div>
												{note.favorite && (
													<Star
														className="shrink-0 text-[#e7a91b]"
														size={13}
														fill="currentColor"
													/>
												)}
											</div>
											<div className="note-card-preview">
												{note.content}
											</div>
											<div className="note-card-bottom">
												<span>
													{formatDate(
														note.updatedAt ??
															note.createdAt,
													)}
												</span>
												{folderName && (
													<span className="flex max-w-[110px] items-center gap-[3px] overflow-hidden text-ellipsis whitespace-nowrap">
														<Folder size={11} />
														{folderName}
													</span>
												)}
											</div>
										</motion.button>
									)
								})}
							</AnimatePresence>
						</motion.div>
					)}
				</AnimatePresence>
			</div>
		</motion.section>
	)
}
