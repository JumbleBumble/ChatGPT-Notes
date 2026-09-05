import { useEffect, useMemo, useState } from 'react'
import { Archive, FilePlus2, Search, X } from 'lucide-react'

import { CreateFolderDialog } from './components/notes/CreateFolderDialog'
import { CreateNoteDialog } from './components/notes/CreateNoteDialog'
import { NoteEditor } from './components/notes/NoteEditor'
import { NoteList } from './components/notes/NoteList'
import { Sidebar } from './components/notes/Sidebar'
import {
	createFolder as createFolderInStorage,
	createNote as createNoteInStorage,
	deleteFolder,
	deleteNote,
	getFolders,
	getNotes,
	moveNote,
	saveFolders,
	toggleNoteFavorite,
	updateNote,
} from './lib/notes/storage'
import type { Note, NoteFolder } from './lib/notes/types'
import { textToHtml } from './lib/notes/utils'

import './index.css'
import './popup-layout.css'

type View = 'all' | 'favorites' | 'recent' | 'folder'

function IndexPopup() {
	const [notes, setNotes] = useState<Note[]>([])
	const [folders, setFolders] = useState<NoteFolder[]>([])
	const [loading, setLoading] = useState(true)
	const [view, setView] = useState<View>('all')
	const [selectedFolderId, setSelectedFolderId] = useState<string | null>(
		null,
	)
	const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null)
	const [globalSearch, setGlobalSearch] = useState('')
	const [newFolderOpen, setNewFolderOpen] = useState(false)
	const [newNoteOpen, setNewNoteOpen] = useState(false)

	useEffect(() => {
		let mounted = true

		const load = async () => {
			if (!mounted) return
			setLoading(true)
			try {
				const [storedNotes, storedFolders] = await Promise.all([
					getNotes(),
					getFolders(),
				])
				if (!mounted) return
				setNotes(storedNotes)
				setFolders(storedFolders)
				setSelectedNoteId(null)
			} catch (error) {
				console.error('Failed to load notes:', error)
			} finally {
				if (mounted) setLoading(false)
			}
		}

		void load()

		const handleStorageChange = (
			changes: Record<string, chrome.storage.StorageChange>,
			areaName: string,
		) => {
			if (areaName !== 'local') return
			const relevantChange = Object.keys(changes).some(
				(key) =>
					key === 'notes:index' ||
					key === 'noteFolders' ||
					key.startsWith('notes:item:'),
			)
			if (relevantChange) void load()
		}

		chrome.storage.onChanged.addListener(handleStorageChange)
		return () => {
			mounted = false
			chrome.storage.onChanged.removeListener(handleStorageChange)
		}
	}, [])

	const selectedNote = useMemo(
		() => notes.find((note) => note.id === selectedNoteId) ?? null,
		[notes, selectedNoteId],
	)

	const selectedFolder = useMemo(
		() => folders.find((folder) => folder.id === selectedFolderId) ?? null,
		[folders, selectedFolderId],
	)

	const visibleNotes = useMemo(() => {
		const query = globalSearch.trim().toLowerCase()
		let result: Note[]

		if (query) {
			result = notes.filter((note) =>
				`${note.title}\n${note.content}`.toLowerCase().includes(query),
			)
		} else if (view === 'folder') {
			result = notes.filter((note) => note.folderId === selectedFolderId)
		} else if (view === 'favorites') {
			result = notes.filter((note) => note.favorite)
		} else if (view === 'recent') {
			result = notes
				.slice()
				.sort(
					(a, b) =>
						(b.updatedAt ?? b.createdAt) -
						(a.updatedAt ?? a.createdAt),
				)
				.slice(0, 20)
		} else {
			result = [...notes]
		}

		return result.sort(
			(a, b) =>
				(b.updatedAt ?? b.createdAt) - (a.updatedAt ?? a.createdAt),
		)
	}, [globalSearch, notes, selectedFolderId, view])

	const setNoteState = (note: Note) => {
		setNotes((current) =>
			current.map((item) => (item.id === note.id ? note : item)),
		)
	}

	const selectAll = () => {
		setGlobalSearch('')
		setView('all')
		setSelectedFolderId(null)
		setSelectedNoteId(null)
	}

	const selectFavorites = () => {
		setGlobalSearch('')
		setView('favorites')
		setSelectedFolderId(null)
		setSelectedNoteId(null)
	}

	const selectRecent = () => {
		setGlobalSearch('')
		setView('recent')
		setSelectedFolderId(null)
		setSelectedNoteId(null)
	}

	const selectFolder = (folderId: string) => {
		setGlobalSearch('')
		setView('folder')
		setSelectedFolderId(folderId)
		setSelectedNoteId(null)
	}

	const handleCreateNote = async (
		title: string,
		content: string,
		folderId: string | null,
	) => {
		try {
			const note = await createNoteInStorage({
				title,
				content,
				html: textToHtml(content),
				folderId,
				favorite: false,
			})
			setNotes((current) => [
				note,
				...current.filter((item) => item.id !== note.id),
			])
			setSelectedNoteId(note.id)
			setNewNoteOpen(false)
			setGlobalSearch('')
			setView(folderId ? 'folder' : 'all')
			setSelectedFolderId(folderId)
		} catch (error) {
			console.error('Failed to create note:', error)
		}
	}

	const handleCreateFolder = async (name: string) => {
		try {
			const folder = await createFolderInStorage(name)
			setFolders((current) => [...current, folder])
			setNewFolderOpen(false)
			setView('folder')
			setSelectedFolderId(folder.id)
			setSelectedNoteId(null)
		} catch (error) {
			console.error('Failed to create folder:', error)
		}
	}

	const handleRenameFolder = async (folder: NoteFolder) => {
		const name = window.prompt('Folder name', folder.name)?.trim()
		if (!name || name === folder.name) return
		const updatedFolders = folders.map((item) =>
			item.id === folder.id ? { ...item, name } : item,
		)
		try {
			await saveFolders(updatedFolders)
			setFolders(updatedFolders)
		} catch (error) {
			console.error('Failed to rename folder:', error)
		}
	}

	const handleDeleteFolder = async (folder: NoteFolder) => {
		if (
			!window.confirm(
				`Delete "${folder.name}"? Notes in this folder will be moved to All Notes.`,
			)
		)
			return
		try {
			await deleteFolder(folder.id)
			const [updatedNotes, updatedFolders] = await Promise.all([
				getNotes(),
				getFolders(),
			])
			setNotes(updatedNotes)
			setFolders(updatedFolders)
			setSelectedFolderId(null)
			setView('all')
			setSelectedNoteId(null)
		} catch (error) {
			console.error('Failed to delete folder:', error)
		}
	}

	const handleDeleteNote = async () => {
		if (!selectedNote) return
		try {
			await deleteNote(selectedNote.id)
			setNotes((current) =>
				current.filter((note) => note.id !== selectedNote.id),
			)
			setSelectedNoteId(null)
		} catch (error) {
			console.error('Failed to delete note:', error)
		}
	}

	const handleToggleFavorite = async () => {
		if (!selectedNote) return
		try {
			const updated = await toggleNoteFavorite(selectedNote.id)
			if (updated) setNoteState(updated)
		} catch (error) {
			console.error('Failed to update favorite:', error)
		}
	}

	const handleSaveTitle = async (title: string) => {
		if (!selectedNote) return
		try {
			const updated = await updateNote(selectedNote.id, { title })
			if (updated) setNoteState(updated)
		} catch (error) {
			console.error('Failed to save title:', error)
		}
	}

	const handleSaveContent = async (html: string, content: string) => {
		if (!selectedNote) return
		try {
			const updated = await updateNote(selectedNote.id, {
				content,
				html,
			})
			if (updated) setNoteState(updated)
		} catch (error) {
			console.error('Failed to save content:', error)
		}
	}

	const handleMoveNote = async (folderId: string | null) => {
		if (!selectedNote) return
		try {
			const updated = await moveNote(selectedNote.id, folderId)
			if (updated) setNoteState(updated)
		} catch (error) {
			console.error('Failed to move note:', error)
		}
	}

	const sectionTitle = globalSearch
		? 'Search results'
		: selectedFolder
			? selectedFolder.name
			: view === 'favorites'
				? 'Favorites'
				: view === 'recent'
					? 'Recent'
					: 'All Notes'

	return (
		<div className="notes-app">
			<Sidebar
				notes={notes}
				folders={folders}
				view={view}
				selectedFolderId={selectedFolderId}
				onCreateNote={() => setNewNoteOpen(true)}
				onCreateFolder={() => setNewFolderOpen(true)}
				onSelectAll={selectAll}
				onSelectFavorites={selectFavorites}
				onSelectRecent={selectRecent}
				onSelectFolder={selectFolder}
				onRenameFolder={handleRenameFolder}
				onDeleteFolder={handleDeleteFolder}
			/>

			<main className="workspace">
				<header className="workspace-header">
					<div className="header-left">
						<div className="breadcrumb">
							{globalSearch ? (
								<>
									<Search size={15} />
									<span>Search</span>
								</>
							) : (
								<>
									<Archive size={15} />
									<span>{sectionTitle}</span>
								</>
							)}
						</div>
						<div className="global-search">
							<Search size={16} />
							<input
								value={globalSearch}
								onChange={(event) =>
									setGlobalSearch(event.target.value)
								}
								placeholder="Search all notes..."
							/>
							{globalSearch && (
								<button
									type="button"
									className="search-clear"
									aria-label="Clear search"
									onClick={() => setGlobalSearch('')}
								>
									<X size={14} />
								</button>
							)}
							<kbd>⌘ K</kbd>
						</div>
					</div>
					<button
						type="button"
						className="header-new-button"
						onClick={() => setNewNoteOpen(true)}
					>
						<FilePlus2 size={15} />
						New
					</button>
				</header>

				<div
					className={`workspace-body ${selectedNote ? 'note-open' : ''}`}
				>
					<NoteList
						notes={visibleNotes}
						folders={folders}
						selectedNoteId={selectedNoteId}
						loading={loading}
						title={sectionTitle}
						globalSearch={globalSearch}
						onSelectNote={(note) => setSelectedNoteId(note.id)}
						onCreateNote={() => setNewNoteOpen(true)}
					/>
					{selectedNote && (
						<NoteEditor
							note={selectedNote}
							folders={folders}
							onClose={() => setSelectedNoteId(null)}
							onToggleFavorite={handleToggleFavorite}
							onDelete={handleDeleteNote}
							onMove={handleMoveNote}
							onSaveTitle={handleSaveTitle}
							onSaveContent={handleSaveContent}
							onCreateNote={() => setNewNoteOpen(true)}
						/>
					)}
				</div>
			</main>

			<CreateFolderDialog
				open={newFolderOpen}
				onClose={() => setNewFolderOpen(false)}
				onCreate={handleCreateFolder}
			/>
			<CreateNoteDialog
				open={newNoteOpen}
				folders={folders}
				initialFolderId={selectedFolderId}
				onClose={() => setNewNoteOpen(false)}
				onCreate={handleCreateNote}
			/>
		</div>
	)
}

export default IndexPopup
