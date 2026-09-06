---
description: 'Use when editing ChatGPT Notes extension code in TypeScript, React, Tailwind, Plasmo, or Tiptap. Provides default guidance for note storage, HTML sanitization, and popup/content UI consistency in this repo.'
name: 'ChatGPT Notes Conventions'
applyTo: 'src/**/*.ts, src/**/*.tsx, src/**/*.css'
---

# ChatGPT Notes Conventions

-   Default preferences: deviate only when correctness or task constraints require it.
-   Style: tabs, single quotes, no unnecessary semicolons.
-   TypeScript: keep types explicit for props, IO, and storage payloads.
-   Prefer small composable changes; avoid broad refactors unless requested.

## Notes Storage Invariants

-   Preserve key schema: notes:index, notes:item:<id>, noteFolders.
-   Keep normalization behavior from src/lib/notes/storage.ts (content/html/folderId/favorite/timestamps).
-   Preserve createdAt; only bump updatedAt on mutations.
-   Keep per-note mutation queue semantics (no parallel write path).
-   Keep fallback recovery behavior when primary storage reads fail.
-   Keep **root** as UI sentinel and persist root notes with folderId null.
-   Deleting a folder moves notes to root; do not hard-delete notes.

## HTML Safety Invariants

-   Treat note and response HTML as untrusted.
-   Sanitize before persistence, rendering, and search highlighting.
-   Keep sanitizer policy aligned with current DOMPurify restrictions (no executable tags/attrs).
-   Only use dangerouslySetInnerHTML with sanitized content.
-   Keep rich-text output compatible with current sanitizeHtml and text extraction behavior.

## UI Invariants

-   Preserve accessibility for icon-only controls (aria-label and title).
-   Preserve popup/content layout behavior for constrained extension dimensions.
-   Reuse existing tokens/class patterns before adding new global styles.

## Behavior and Validation

-   Keep public behavior stable unless change is explicitly requested.
-   If behavior/data semantics change, call out migration/data impact in summary or PR notes.
-   Add focused tests for logic-heavy changes when nearby test coverage exists.
