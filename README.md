# ChatGPT Notes

A small browser extension for saving ChatGPT responses as notes.

Save a response from ChatGPT, give it a title, put it in a folder, and come back to it later. Notes are stored locally in the browser.

## Features

- Save ChatGPT responses from the response toolbar
- Create notes manually
- Edit notes with rich text
- Keep headings, lists, links, code blocks, tables, and blockquotes
- Create folders and move notes between them
- Favorite notes
- Search notes and search within a note
- Light and dark mode
- Automatic response detection with an element-picker fallback

## Tech stack

- Plasmo
- React + TypeScript
- Tailwind CSS
- Tiptap
- DOMPurify
- `@plasmohq/storage`

## Development

### Requirements

- Node.js
- npm
- Chrome or another Chromium-based browser

### Setup

```bash
git clone https://github.com/JumbleBumble/ChatGPT-Notes.git
cd ChatGPT-Notes-Private
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
