# Agents Guide

This project is a plain JavaScript Chrome extension inspired by Definer.

## Goal

Build a lightweight popup dictionary/translator with:

- Google Translate
- Dictionary lookup
- AI provider support

## Current Architecture

- `manifest.json`: Chrome MV3 manifest
- `src/background.js`: background service worker, provider routing, context menu handling
- `src/content.js`: page selection handling, popup UI mounting, tab switching
- `src/providers/`: provider implementations
- `src/shared/storage.js`: settings defaults and normalization
- `src/ui/popup.css`: popup styling
- `options/`: settings page UI
- `providers/`: reference provider implementations from another extension

## Key Product Rules

- Keep the extension simple and fast.
- Prefer plain JavaScript over TypeScript.
- Do not add unnecessary frameworks.
- Match the Definer interaction model where useful, but keep scope controlled.
- AI prompt/template docs must only mention syntax that is actually supported.

## Current Trigger Features

- Text selection trigger
- Double-click trigger
- `Alt+G` shortcut trigger
- Context menu trigger
- Optional modifier requirement for selection and double-click

## Current Popup Features

- Configurable width and height
- Source tabs for Translate, Dictionary, and AI
- Basic markdown-style rendering for AI output

## Known Constraints

- Google Dictionary is not backed by an official public Google API.
- Gemini requests use the native Gemini API path when a Google base URL is detected.
- Content scripts in already-open tabs must be refreshed after extension reload.

## Implementation Notes

- When editing code, keep storage defaults, settings UI, and content-script behavior in sync.
- If you add a new setting, update:
  - `src/shared/storage.js`
  - `options/options.html`
  - `options/options.js`
  - any runtime usage in `src/content.js` or `src/background.js`
- If you add a new provider, keep the response shape compatible with the popup renderer:
  - `title`
  - `subtitle`
  - `sourceLabel`
  - `sections`

## Next Good Improvements

- Per-site blacklist/whitelist
- Manual text input lookup
- Configurable keyboard shortcut
- Resizable popup by drag
- Better structured AI result rendering
- Better dictionary data source strategy
