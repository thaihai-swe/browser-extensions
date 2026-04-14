# Architecture

## Overview

This extension is built as a plain JavaScript Chrome Manifest V3 project.

The main execution layers are:

- action popup
- content script
- background service worker
- options page
- provider modules

## Runtime Flow

1. The user either opens the toolbar popup for manual lookup, or triggers an in-page lookup by selection, double-click, `Alt+G`, or the context-menu action.
2. `action/popup.js` or `src/content.js` requests data for the active source tab.
3. `src/background.js` receives the lookup request.
4. The background worker loads settings from `chrome.storage.sync`.
5. The selected provider module performs the remote lookup.
6. The normalized provider result is returned to the caller.
7. The toolbar popup or in-page popup renders the result.

## Main Files

### `action/`

Responsible for:

- toolbar popup layout
- manual query input
- source tab switching inside the browser action popup
- reusing the shared background lookup flow

### `src/content.js`

Responsible for:

- page triggers
- popup mounting and teardown
- tab switching
- AI markdown-style rendering
- reacting to settings changes

### `src/background.js`

Responsible for:

- central request routing
- provider dispatch
- context menu registration
- sending selected text from the context menu into the content script
- serving lookup requests for both the toolbar popup and the in-page popup

### `src/shared/storage.js`

Responsible for:

- default settings
- normalization
- settings persistence helpers

This file must stay aligned with both the options UI and the content/background runtime usage.

### `src/providers/`

Current providers:

- `google-translate.js`
- `google-dictionary.js`
- `ai-provider.js`

Provider output should stay compatible with the popup renderer:

- `title`
- `subtitle`
- `sourceLabel`
- `sections`

## Settings Model

The extension currently stores settings for:

- trigger enable/disable flags
- trigger modifier requirements
- popup width and height
- source enable/disable flags
- default active tab
- translate target language
- AI provider base URL
- AI API key
- AI model
- AI prompt template

## AI Provider Strategy

The AI provider supports two paths:

- Google Gemini path when a Google base URL is detected
- generic OpenAI-compatible path for other providers

The current prompt-template engine only supports:

- `{{str}}`
- `{{text}}`
- `{{word_count}}`
- `{{targetLang}}`

## Current Constraints

- The content script in already-open tabs becomes stale after extension reload and requires a page refresh.
- The popup renderer only supports lightweight markdown-style formatting.
- The toolbar popup only picks up manifest changes after the extension is reloaded in `chrome://extensions`.
- Dictionary results are limited by the current fallback provider quality.
