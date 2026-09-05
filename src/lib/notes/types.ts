export type Note = {
	id: string
	title: string
	content: string
	html: string
	createdAt: number
	updatedAt?: number
	folderId?: string | null
	favorite?: boolean
}

export type NoteFolder = {
	id: string
	name: string
	createdAt: number
}

export type ResponseData = {
	text: string
	html: string
}
