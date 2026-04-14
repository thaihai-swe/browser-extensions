# Development Guide

## Stack

- JavaScript
- Chrome Extension Manifest V3
- HTML and CSS
- No framework

## Local Development

1. Load the project as an unpacked extension in Chrome.
2. Make code changes locally.
3. Reload the extension in `chrome://extensions`.
4. Refresh any already-open webpage tabs when testing content-script behavior.
5. Reopen the toolbar popup after reload when testing browser-action UI changes.

## Files To Update Together

When adding or changing a setting, update all of:

- `src/shared/storage.js`
- `options/options.html`
- `options/options.js`
- `src/content.js` or `src/background.js` if the setting changes behavior

When adding a new provider:

- add a file under `src/providers/`
- wire it in `src/background.js`
- keep the returned data shape compatible with the popup renderer

## Debugging Tips

### Popup keeps loading

Check the extension service worker console in `chrome://extensions`.

Common causes:

- service worker startup error
- missing permission in `manifest.json`
- provider request failure

If the issue only happens in the toolbar popup, also inspect the popup page console from the extension inspector.

### Extension context invalidated

This usually happens after reloading the extension while testing on an already-open tab.

Fix:

- reload the extension
- refresh the test tab

### AI request issues

- confirm the base URL, API key, and model are saved
- check whether the provider path is using Gemini-native or OpenAI-compatible mode
- inspect the extension service worker console

## Current Default Behaviors

- default translate target language: `en`
- default popup width: `380`
- default popup height: `420`
- default AI model: `gemini-2.5-flash-lite`
- default shortcut: `Alt+G`

## Good Next Improvements

- per-site enable/disable rules
- configurable keyboard shortcut
- drag resizing
- more structured AI rendering
- improved dictionary backend
