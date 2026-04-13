# Dictionary

Dictionary is a lightweight Chrome extension. It opens a floating popup when the user selects text, double-clicks a word, uses a shortcut, or triggers a context-menu action.

The current project focuses on a smaller feature set:

- Google Translate
- Dictionary lookup
- AI provider support with configurable base URL, API key, model, and prompt template

## Current Features

- Popup lookup on text selection
- Popup lookup on double-click
- `Alt+G` shortcut trigger
- Context menu trigger for selected text
- Modifier-based trigger requirements for selection and double-click
- Configurable popup width and height
- Google Translate tab
- Dictionary tab
- AI tab with markdown-style output rendering
- Settings stored with `chrome.storage.sync`

## Project Structure

- `manifest.json`: MV3 extension manifest
- `src/background.js`: background service worker and provider routing
- `src/content.js`: popup behavior, trigger handling, and rendering
- `src/providers/`: translate, dictionary, and AI provider logic
- `src/shared/storage.js`: settings defaults and normalization
- `src/ui/popup.css`: popup styles
- `options/`: settings page
- `docs/`: implementation documents
- `wiki/`: product and contributor reference pages

## Install Locally

1. Open `chrome://extensions`
2. Enable Developer mode
3. Click `Load unpacked`
4. Select this project folder
5. Reload the extension after code changes
6. Refresh any already-open webpage tabs after reloading the extension

## Important Notes

- Google Translate target language should use standard codes like `en`, `vi`, `ja`, `ko`, or `zh-CN`.
- Common aliases such as `vn` are normalized automatically.
- The dictionary tab currently uses `dictionaryapi.dev` as a lightweight first-pass source because Google Dictionary does not expose a stable public API.
- When a Google Gemini base URL is detected, the AI provider uses the native Gemini API request path.
- AI prompt-template documentation only lists syntax currently supported by the code.

## Documentation

- [Architecture](docs/architecture.md)
- [Development Guide](docs/development.md)
- [Features Wiki](wiki/features.md)
- [Settings Wiki](wiki/settings.md)
- [Roadmap Wiki](wiki/roadmap.md)
- [Agents Guide](agents.md)

## Current Default AI Setup

- Base URL: `https://generativelanguage.googleapis.com/v1beta/openai/`
- Model: `gemini-2.5-flash-lite`

## Known Gaps

- No official Google Dictionary backend
- No per-site blacklist/whitelist yet
- No manual query input yet
- No drag-to-resize popup yet
- Shortcut key is fixed to `Alt+G`

## License

No license has been added yet.
