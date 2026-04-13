# Browser Extensions

This repository contains a small collection of browser extension projects. Each extension lives in its own folder and can be loaded locally as an unpacked extension during development.

## Projects

### `default_video_playspeed`

Automatically applies your preferred playback speed across video websites, with per-site presets and keyboard shortcuts.

- Stack: Chrome extension, Manifest V3
- Entry docs: [default_video_playspeed/README.md](/Users/haint/Desktop/browser-extensions/default_video_playspeed/README.md)

### `dictionary-extension`

Shows a popup dictionary/translation/AI lookup when text is selected, double-clicked, or triggered from a shortcut or context menu.

- Stack: Chrome extension, Manifest V3
- Entry docs: [dictionary-extension/README.md](/Users/haint/Desktop/browser-extensions/dictionary-extension/README.md)

### `summarizer-extension`

Summarizes webpages, YouTube videos, selected text, and supported course content using OpenAI, Gemini, or local-model providers.

- Stack: Browser extension for Chrome and Firefox
- Entry docs: [summarizer-extension/README.md](/Users/haint/Desktop/browser-extensions/summarizer-extension/README.md)

## Repo Structure

```text
browser-extensions/
├── default_video_playspeed/
├── dictionary-extension/
├── summarizer-extension/
└── README.md
```

## Local Development

Most work in this repository follows the same basic flow:

1. Open the extension folder you want to work on.
2. Review that folder's `README.md` and any docs inside `docs/` or `wiki/`.
3. Open your browser's extension page:
   - Chrome: `chrome://extensions/`
   - Firefox: `about:debugging#/runtime/this-firefox`
4. Enable developer mode if needed.
5. Load the target folder as an unpacked or temporary extension.
6. Reload the extension after code changes.

## Notes

- This repo currently stores multiple independent extension projects rather than one shared app.
- Each project keeps its own manifest, assets, and documentation.
- Some extensions include provider settings or API configuration, so local secrets should stay out of git.
