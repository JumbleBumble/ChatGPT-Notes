# ChatGPT Notes

A small browser extension for saving ChatGPT responses as notes.

Save a response from ChatGPT, give it a title, put it in a folder, and come back to it later. Notes are stored locally in the browser.

## Features

-   Save ChatGPT responses from the response toolbar
-   Create notes manually
-   Edit notes with rich text
-   Keep headings, lists, links, code blocks, tables, and blockquotes
-   Export notes as Markdown (.md), PDF (.pdf), or CSV (.csv)
-   Markdown export preserves rich formatting from the note (headings, lists, links, tables, code blocks)
-   CSV export is only enabled when the note content can be parsed as valid CSV
-   Create folders and move notes between them
-   Favorite notes
-   Search notes and search within a note
-   Light and dark mode
-   Automatic response detection with an element-picker fallback

## Export notes

1. Open any note.
2. In the note toolbar, open the **Export** dropdown.
3. Choose one of the available formats:
    - **Markdown (.md):** exports sanitized rich note content as Markdown.
    - **PDF (.pdf):** exports the note title, timestamp, and content as a PDF file.
    - **CSV (.csv):** only available when the note contains valid CSV data with consistent columns.

If CSV export is disabled, the note content is not currently in a valid CSV format.

## Tech stack

-   Plasmo
-   React + TypeScript
-   Tailwind CSS
-   Tiptap
-   DOMPurify
-   `@plasmohq/storage`

## Development

### Requirements

-   Node.js
-   npm
-   Chrome or another Chromium-based browser

### Setup

```bash
git clone https://github.com/JumbleBumble/ChatGPT-Notes.git
cd ChatGPT-Notes
npm install
npm run dev
```

Then open `chrome://extensions`, enable **Developer mode**, click **Load unpacked**, and select the generated `build/chrome-mv3-dev` directory.

After code changes, reload the extension from the Chrome extensions page if needed.

## Production build

```bash
npm run build
```

The production extension is generated in `build/chrome-mv3-prod`.

## License

[GNU General Public License v3.0](./LICENSE.txt)
