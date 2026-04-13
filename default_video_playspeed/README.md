# Default Video Speed Setter

A Chrome extension that automatically sets a default playback speed for all videos across the web, with keyboard shortcuts, per-domain presets, and zero memory leaks.

## Overview

Default Video Speed Setter is a lightweight, high-performance browser extension that automatically applies your preferred playback speed to video players on any website. Whether you're watching YouTube, Udemy, Netflix, or any other video platform, this extension ensures all videos play at your desired speed by default. Optimized for memory efficiency and performance.

## Features

- **Universal Support** - Works with videos on any website
- **Customizable Speed** - Set a default playback speed (0.25x to 5x)
- **Per-Domain Presets** - Different speeds for YouTube, Netflix, Udemy, etc.
- **Keyboard Shortcuts** - Quick speed adjustments:
  - `Alt + Up` - Increase speed by 0.25x
  - `Alt + Down` - Decrease speed by 0.25x
  - `Alt + R` - Reset to default speed
  - `Alt + .` - Show current speed
- **Persistent Settings** - Your preferences are synced across all devices
- **Automatic Reapplication** - Prevents websites from resetting your speed
- **Smart Detection** - Catches dynamically loaded videos on single-page applications
- **Lightweight & Optimized** - Zero memory leaks, minimal performance impact
- **Fast & Responsive** - Instant speed changes with visual feedback

## Installation

### Manual Installation (Developer Mode)
1. Clone or download this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked"
5. Select the `default_video_playspeed` folder

## Usage

### Setting Your Default Speed

1. Click the extension icon in your Chrome toolbar
2. A settings panel will open
3. Enter your preferred playback speed or click a preset button
4. Click "Save Settings"

### Using Keyboard Shortcuts

Make sure the video player or page is in focus, then:
- Press `Alt + Up` to increase speed
- Press `Alt + Down` to decrease speed
- Press `Alt + R` to reset to your default
- Press `Alt + .` to see the current speed

Shortcuts can be disabled in the settings if needed.

### Creating Per-Domain Presets

1. Open the extension settings
2. Go to "Per-Domain Settings" section
3. Enter a domain (e.g., `youtube.com`, `netflix.com`)
4. The extension will use the current default speed for that domain
5. Edit the speed for that domain anytime
6. The custom speed applies only when visiting that domain

### Supported Speed Range

- Minimum: 0.25x
- Maximum: 5x
- Default: 1.25x
- Increment: 0.25x steps

## How It Works

The extension uses an optimized Content Script that:

1. **Efficient DOM Monitoring** - Uses debounced MutationObserver to detect new videos without performance impact
2. **Smart Event Management** - Tracks all event listeners with AbortController for proper cleanup
3. **Memory Optimization** - Prevents memory leaks through:
   - Proper cleanup of removed video elements
   - Cached storage values (5-second TTL)
   - Debounced ratechange event handlers
   - Tracked and cleared timeout operations
4. **Multi-Point Detection** - Applies speed at critical stages:
   - Immediate application on element detection
   - On playback start (`play` event)
   - On metadata load (`loadedmetadata` event - crucial for YouTube)
   - On speed reset attempts (`ratechange` event)
5. **Per-Domain Support** - Checks domain settings first, falls back to default
6. **Real-time Configuration** - Listens for settings changes from other tabs/windows

## Performance Improvements (v1.2)

### Memory Leak Fixes
- Event listeners now properly cleaned up when videos are removed
- AbortController used for all DOM event handlers
- WeakMap for video element tracking (auto-garbage collected)
- Proper cleanup of setTimeout operations

### CPU/Memory Optimization
- MutationObserver debounced (100ms) to reduce callback firing
- Storage values cached (5-second TTL) to reduce I/O
- Ratechange events debounced (50ms) to prevent rapid updates
- Content script runs only on http/https (not all URLs)
- Removed flag-based tracking in favor of WeakMap

## Project Structure

```
default_video_playspeed/
├── manifest.json          # Extension configuration (Manifest V3)
├── content.js             # Main content script with optimizations
├── options.html           # Enhanced settings UI
├── options.js             # Settings handler with validation
├── icon-16.png            # 16px icon
├── icon-48.png            # 48px icon
├── icon-128.png           # 128px icon
├── README.md              # This file
└── EXTENSION_REVIEW.md    # Detailed technical review
```

## Technical Details

### Manifest Version
- **Manifest V3** - Modern Chrome extension standard with enhanced security

### Permissions
- `storage` - Saves and syncs your playback speed preferences

### Content Script Scope
- Runs on `http://*/*` and `https://*/*` - All web pages
- Runs at `document_end` - After page content is loaded
- Initializes only once per frame to prevent duplicates

### Architecture Highlights
- **Caching System** - 5-second TTL for storage values
- **Event Lifecycle** - AbortController for all listeners
- **WeakMap Tracking** - Automatic garbage collection
- **Debouncing** - MutationObserver (100ms) and ratechange (50ms)
- **Domain Detection** - Hostname parsing and override checking
- **Visual Feedback** - Toast notifications for speed changes

## Troubleshooting

### Speed not applying to a specific website?
- Some video players might have additional protection. Try refreshing the page.
- Check that the extension is enabled in your extensions menu (`chrome://extensions/`).
- Verify the website isn't blocking content scripts.

### Settings not saving?
- Ensure you're signed into your Google account (required for Chrome sync).
- Try opening the extension settings again and resaving.
- Check if your sync is enabled: Chrome Menu > Settings > Sync and Google Services.

### Keyboard shortcuts not working?
- Make sure shortcuts are enabled in the settings panel.
- The page or video element must be in focus for shortcuts to work.
- Some websites might have conflicting shortcuts. Disable theirs or ours as needed.

### Performance issues?
- This extension is heavily optimized for performance.
- If you experience issues, try disabling and re-enabling the extension.
- Check the browser's Task Manager (Shift+Esc) to verify memory usage is reasonable.
- Report issues on GitHub with your browser version.

## Browser Compatibility

- **Chrome** 90+ (recommended)
- **Edge** 90+ (Chromium-based)
- **Brave** 1.0+
- **Opera** 76+
- **Vivaldi** 4.0+
- Firefox (would require different manifest format)
- Safari (requires App Store submission and different API)

## Version History

### v1.2 (Current)
- FIXED: Fixed memory leaks in event listeners
- FIXED: Optimized MutationObserver with debouncing
- ADDED: Added keyboard shortcuts (Alt+Up/Down/R/.)
- ADDED: Added per-domain speed presets
- ADDED: Added preset speed buttons in popup
- IMPROVED: Full input validation with error messages
- IMPROVED: Visual speed indicator (toast notification)
- IMPROVED: Storage event listener for cross-tab sync
- IMPROVED: Updated icons (SVG format)
- IMPROVED: Refactored options.html with modern UI

### v1.1
- Fixed initialization guard to prevent duplicate observers
- Added try-catch blocks for video speed setting

### v1.0
- Initial release with basic speed setting functionality

## Contributing

Contributions are welcome! Areas for improvement:
- Additional player-specific optimizations
- More keyboard shortcut options
- Statistics and usage tracking
- Theme customization
- Internationalization (i18n)

See EXTENSION_REVIEW.md for detailed technical notes and feature suggestions.

## License

MIT - Feel free to use, modify, and distribute

## Support

If you encounter any issues:
1. Check the Troubleshooting section above
2. Verify you have the latest version installed
3. Try disabling other extensions that might conflict
4. Report bugs with your Chrome version and affected websites

## Privacy

This extension:
- Does NOT collect any personal data
- Does NOT track your browsing history
- Uses only Chrome's sync storage (encrypted, optional)
- Has no external servers or analytics
- All operations happen locally in your browser

Made with care for better video watching

## Contributing

Feel free to fork this project and submit pull requests for improvements, bug fixes, or new features.

## License

This project is open source and available under the MIT License.

## Support

If you encounter any issues or have feature requests, please open an issue in this repository.

---

Enjoy faster video playback across the web!
