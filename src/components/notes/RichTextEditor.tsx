import { createPortal } from 'react-dom'
import { useEffect, useState } from 'react'
import {
	Bold,
	Code2,
	Heading1,
	Heading2,
	Italic,
	List,
	ListOrdered,
	Minus,
	Quote,
	Redo2,
	Table2,
	Undo2,
} from 'lucide-react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { TableKit } from '@tiptap/extension-table'

type RichTextEditorProps = {
	initialHtml: string
	initialText: string
	onSave: (html: string, text: string) => void
	onCancel: () => void
}

type ToolbarButtonProps = {
	active?: boolean
	disabled?: boolean
	label: string
	onClick: () => void
	children: React.ReactNode
}

function ToolbarButton({
	active = false,
	disabled = false,
	label,
	onClick,
	children,
}: ToolbarButtonProps) {
	return (
		<button
			type="button"
			className={`rich-toolbar-button ${active ? 'active' : ''}`}
			disabled={disabled}
			aria-label={label}
			title={label}
			onClick={onClick}
		>
			{children}
		</button>
	)
}

export function RichTextEditor({
	initialHtml,
	initialText,
	onSave,
	onCancel,
}: RichTextEditorProps) {
	const [editorReady, setEditorReady] = useState(false)
	const [footerTarget, setFooterTarget] = useState<HTMLElement | null>(null)

	const editor = useEditor({
		extensions: [
			StarterKit.configure({
				heading: {
					levels: [1, 2, 3],
				},
				codeBlock: {
					HTMLAttributes: {
						class: 'note-code-block',
					},
				},
			}),
			TableKit.configure({
				table: {
					resizable: true,
				},
			}),
		],
		content:
			initialHtml ||
			(initialText
				? `<p>${initialText
						.replace(/&/g, '&amp;')
						.replace(/</g, '&lt;')
						.replace(/>/g, '&gt;')
						.replace(/\n/g, '<br />')}</p>`
				: '<p></p>'),
		immediatelyRender: false,
		onCreate: () => {
			setEditorReady(true)
		},
	})

	useEffect(() => {
		if (!editor) {
			return
		}

		const currentHtml = editor.getHTML()

		if (initialHtml && currentHtml !== initialHtml) {
			editor.commands.setContent(initialHtml, {
				emitUpdate: false,
			})
		}
	}, [editor, initialHtml])

	useEffect(() => {
		if (!editorReady) {
			return
		}

		const editorElement = document.querySelector('.rich-editor')
		const panel = editorElement?.closest('.note-editor-panel')
		const footer = panel?.querySelector(':scope > .editor-footer')

		if (!panel || !footer) {
			return
		}

		const target = document.createElement('div')
		target.className = 'rich-editor-footer'
		panel.insertBefore(target, footer)
		setFooterTarget(target)

		return () => {
			target.remove()
			setFooterTarget(null)
		}
	}, [editorReady])

	if (!editor || !editorReady) {
		return (
			<div className="rich-editor-loading">
				<div className="spinner" />
				Loading editor
			</div>
		)
	}

	const save = () => {
		const html = editor.getHTML()
		const text = editor
			.getText({
				blockSeparator: '\n\n',
			})
			.trim()

		onSave(html, text)
	}

	const actions = footerTarget
		? createPortal(
				<>
					<div className="rich-editor-hint">
						Markdown-style shortcuts work while typing
					</div>

					<div className="edit-actions">
						<button
							type="button"
							className="secondary-button"
							onClick={onCancel}
						>
							Cancel
						</button>

						<button
							type="button"
							className="primary-button"
							onClick={save}
						>
							Save changes
						</button>
					</div>
				</>,
				footerTarget,
			)
		: null

	return (
		<>
			<div
				className="rich-editor"
				style={{ height: '100%', minHeight: 0 }}
			>
				<div className="rich-editor-toolbar">
					<div className="rich-toolbar-group">
						<ToolbarButton
							label="Bold"
							active={editor.isActive('bold')}
							onClick={() =>
								editor.chain().focus().toggleMark('bold').run()
							}
						>
							<Bold size={15} />
						</ToolbarButton>

						<ToolbarButton
							label="Italic"
							active={editor.isActive('italic')}
							onClick={() =>
								editor.chain().focus().toggleItalic().run()
							}
						>
							<Italic size={15} />
						</ToolbarButton>

						<ToolbarButton
							label="Heading 1"
							active={editor.isActive('heading', { level: 1 })}
							onClick={() =>
								editor
									.chain()
									.focus()
									.toggleHeading({
										level: 1,
									})
									.run()
							}
						>
							<Heading1 size={15} />
						</ToolbarButton>

						<ToolbarButton
							label="Heading 2"
							active={editor.isActive('heading', { level: 2 })}
							onClick={() =>
								editor
									.chain()
									.focus()
									.toggleHeading({
										level: 2,
									})
									.run()
							}
						>
							<Heading2 size={15} />
						</ToolbarButton>
					</div>

					<div className="rich-toolbar-divider" />

					<div className="rich-toolbar-group">
						<ToolbarButton
							label="Bullet list"
							active={editor.isActive('bulletList')}
							onClick={() =>
								editor.chain().focus().toggleBulletList().run()
							}
						>
							<List size={15} />
						</ToolbarButton>

						<ToolbarButton
							label="Numbered list"
							active={editor.isActive('orderedList')}
							onClick={() =>
								editor
									.chain()
									.focus()
									.toggleOrderedList()
									.run()
							}
						>
							<ListOrdered size={15} />
						</ToolbarButton>

						<ToolbarButton
							label="Blockquote"
							active={editor.isActive('blockquote')}
							onClick={() =>
								editor.chain().focus().toggleBlockquote().run()
							}
						>
							<Quote size={15} />
						</ToolbarButton>

						<ToolbarButton
							label="Code block"
							active={editor.isActive('codeBlock')}
							onClick={() =>
								editor.chain().focus().toggleCodeBlock().run()
							}
						>
							<Code2 size={15} />
						</ToolbarButton>
					</div>

					<div className="rich-toolbar-divider" />

					<div className="rich-toolbar-group">
						<ToolbarButton
							label="Insert table"
							onClick={() =>
								editor
									.chain()
									.focus()
									.insertTable({
										rows: 3,
										cols: 3,
										withHeaderRow: true,
									})
									.run()
							}
						>
							<Table2 size={15} />
						</ToolbarButton>

						<ToolbarButton
							label="Horizontal rule"
							onClick={() =>
								editor
									.chain()
									.focus()
									.setHorizontalRule()
									.run()
							}
						>
							<Minus size={15} />
						</ToolbarButton>
					</div>

					<div className="rich-toolbar-spacer" />

					<div className="rich-toolbar-group">
						<ToolbarButton
							label="Undo"
							disabled={!editor.can().undo()}
							onClick={() => editor.chain().focus().undo().run()}
						>
							<Undo2 size={15} />
						</ToolbarButton>

						<ToolbarButton
							label="Redo"
							disabled={!editor.can().redo()}
							onClick={() => editor.chain().focus().redo().run()}
						>
							<Redo2 size={15} />
						</ToolbarButton>
					</div>
				</div>

				<div className="rich-editor-content">
					<EditorContent editor={editor} />
				</div>
			</div>

			{actions}
		</>
	)
}
