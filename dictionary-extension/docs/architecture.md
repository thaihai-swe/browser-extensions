# Architecture

## Overview

This extension is built as a plain JavaScript Chrome Manifest V3 project.

The main execution layers are:

- content script
- background service worker
- options page
- provider modules

## Runtime Flow

1. The user selects text, double-clicks, uses `Alt+G`, or clicks the context-menu action.
2. `src/content.js` opens the popup and requests data for the active tab source.
3. `src/background.js` receives the lookup request.
4. The background worker loads settings from `chrome.storage.sync`.
5. The selected provider module performs the remote lookup.
6. The normalized provider result is returned to the content script.
7. The popup renders the result.

## Main Files

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
- `{% if word_count > 1 %}...{% endif %}`

## Current Constraints

- The content script in already-open tabs becomes stale after extension reload and requires a page refresh.
- The popup renderer only supports lightweight markdown-style formatting.
- Dictionary results are limited by the current fallback provider quality.
