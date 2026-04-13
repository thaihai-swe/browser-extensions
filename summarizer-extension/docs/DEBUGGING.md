# Debugging Guide

This guide helps you diagnose and fix issues in the Summarizer extension.

## Opening the Developer Console

### Background Script Console

View logs from the background worker:

1. Open `chrome://extensions/`
2. Find "Summarizer" extension
3. Click **Inspect views** > **background page**
4. Browser DevTools opens with background worker console
5. All extension logs appear here

### Content Script Console

View logs from the content script (runs on page):

1. Open any web page
2. Right-click > **Inspect** (or F12)
3. Go to **Console** tab
4. Logs from content script appear here

### Side Panel Console

View logs from side panel:

1. Click extension icon to open side panel
2. Right-click inside side panel > **Inspect**
3. Go to **Console** tab
4. Side panel logs appear here

## Reading Debug Logs

All extension logs are prefixed with `[Summarizer]` to make them easy to find.

### Log Categories

```
[Summarizer] Extraction: ...    // Content extraction events
[Summarizer] Provider: ...      // API calls and responses
[Summarizer] Workflow: ...      // Summary generation workflow
[Summarizer] Storage: ...       // Data storage events
[Summarizer] UI: ...            // Side panel updates
[Summarizer] Tab: ...           // Tab management
```

### Example Debug Logs

**Normal extraction and summary generation:**

```
[Summarizer] Extraction: Detected YouTube page
[Summarizer] Extraction: Extracting transcript...
[Summarizer] Extraction: Found 2500 tokens of transcript
[Summarizer] Provider: Calling Gemini API with 2500 tokens
[Summarizer] Provider: API response: 180 tokens summary
[Summarizer] UI: Summary rendered in side panel
```

**Error case:**

```
[Summarizer] Extraction: Could not extract content
[Summarizer] Provider: Error: API rate limit exceeded
[Summarizer] UI: Showing error message to user
```

## Common Debug Scenarios

### Debugging Extraction

**Problem:** "No content extracted" or empty summary

**Steps:**

1. Open page you want to summarize
2. Open background page console
3. Look for `[Summarizer] Extraction:` logs
4. Check what was detected:
   ```
   [Summarizer] Extraction: Detected YouTube page
   // Good! Extraction should work
   ```
   or
   ```
   [Summarizer] Extraction: Detected generic webpage
   // Might extract less content
   ```

5. Check extraction result in console:
   ```js
   // In background console, run:
   chrome.runtime.getBackgroundPage(bg => {
     console.log(bg.lastExtraction);
   });
   ```

**To debug specific extractor:**

Edit [lib/extractors.js](/lib/extractors.js) or specific extractor file and add temporary logs:

```js
// In lib/extractors/youtube.js
console.log('[Summarizer] YouTube: Checking for transcript...');
const transcript = document.querySelector('...');
console.log('[Summarizer] YouTube: Found transcript:', transcript);
```

### Debugging API Calls

**Problem:** "API error" or "Rate limit exceeded"

**Steps:**

1. Open background page console
2. Look for `[Summarizer] Provider:` logs
3. Check API provider logs:
   ```
   [Summarizer] Provider: Calling Gemini API
   [Summarizer] Provider: Request payload: { ... }
   [Summarizer] Provider: API response: { ok: true, text: "..." }
   ```

**To debug provider:**

Edit [lib/providers/gemini.js](/lib/providers/gemini.js) (or relevant provider) and add logs:

```js
console.log('[Summarizer] Provider: API Key:', apiKey.substring(0, 10) + '...');
console.log('[Summarizer] Provider: Request:', { systemPrompt, userPrompt });
```

### Debugging Storage

**Problem:** Settings not saving or results not persisting

**Steps:**

1. Open background page console
2. Run:
   ```js
   // View all stored data
   chrome.storage.local.get(null, (items) => {
     console.log('Stored data:', items);
   });
   ```

3. Look for `[Summarizer] Storage:` logs
4. Check specific tab result:
   ```js
   chrome.storage.local.get(['tab_123'], (items) => {
     console.log('Tab 123 data:', items);
   });
   ```

### Debugging UI Updates

**Problem:** Side panel not updating or buttons not responding

**Steps:**

1. Open side panel console
2. Look for `[Summarizer] UI:` logs
3. Check if summary is rendering:
   ```
   [Summarizer] UI: Rendering summary card
   [Summarizer] UI: Summary rendered successfully
   ```

4. To manually refresh UI, run in side panel console:
   ```js
   // Force side panel to update
   chrome.runtime.sendMessage({ type: 'GET_ACTIVE_TAB_RESULT' }, (result) => {
     window.renderResult(result);
   });
   ```

### Debugging Tab Management

**Problem:** Results not persisting across tab switches

**Steps:**

1. Open background page console
2. Look for `[Summarizer] Tab:` logs
3. Check active tab tracking:
   ```js
   chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
     console.log('Active tab:', tabs[0].id);
   });
   ```

4. Check if tab data is stored:
   ```js
   chrome.storage.local.get(['tab_' + tabId], (items) => {
     console.log('Tab result:', items);
   });
   ```

## Using Chrome DevTools

### Network Tab

Monitor API calls to LLM providers:

1. Open side panel
2. Right-click > Inspect > Network tab
3. Click Generate
4. Look for API requests to:
   - `api.gemini.google.com` (Gemini)
   - `api.openai.com` (OpenAI)
   - `localhost:11434` (Ollama)

Check request headers and response to debug API issues.

### Performance Tab

Profile extraction and rendering:

1. Open background page DevTools
2. Go to Performance tab
3. Click Record
4. Generate a summary
5. Stop recording
6. Analyze flame chart to find bottlenecks

### Storage Tab

View extension storage:

1. Open background page DevTools
2. Go to Storage > Local Storage
3. Select extension origin
4. View all stored data (results, settings, cache)

## Common Debugging Patterns

### Check if Content Script Ran

Run in page console:

```js
// Check if summarizer injected into page
console.log(window.SummarizerExtension);
// Should print object if injected
```

### Check if Background Worker is Running

Run in background console:

```js
console.log('Background worker is running');
console.log('Stored tabs:', chrome.storage.local.get(null, console.log));
```

### Verify Message Passing

Add temporary log to [lib/messages.js](/lib/messages.js):

```js
export function sendMessage(message, callback) {
  console.log('[Summarizer] Sending message:', message.type);
  chrome.runtime.sendMessage(message, (response) => {
    console.log('[Summarizer] Response:', response);
    callback(response);
  });
}
```

### Test Extraction Directly

Run in background console:

```js
// Extract content from current tab
chrome.tabs.query({ active: true }, (tabs) => {
  chrome.tabs.sendMessage(tabs[0].id,
    { type: 'EXTRACT_CONTENT' },
    (extraction) => {
      console.log('Extraction result:', extraction);
    }
  );
});
```

## Performance Debugging

### Slow Extraction

1. Open DevTools Performance tab on background page
2. Record extraction
3. Look for time spent in:
   - `extractSemanticContent()` - webpage content extraction
   - `extractTranscript()` - YouTube transcript fetching
   - DOM traversal operations

**Optimization tips:**
- Reduce DOM traversal selectors
- Cache extraction results
- Use more specific CSS selectors

### Slow API Calls

1. Check Network tab for API request time
2. Compare against provider's documented latency
3. Check system network speed: `ping api.gemini.google.com`

**Optimization tips:**
- Use smaller max token limits
- Check model selection (smaller models = faster)
- Use streaming if available

### Slow UI Rendering

1. Record Performance on side panel
2. Look for long paint/render tasks
3. Check for excessive DOM mutations

**Optimization tips:**
- Reduce number of DOM elements
- Use CSS transforms instead of repositioning
- Lazy-load large result sections

## Remote Debugging

### Debug on Mobile (Android)

1. Enable USB debugging on Android device
2. Connect Android to computer
3. Open `chrome://inspect`
4. Find extension in list
5. Inspect to open DevTools

### Debug Production Extension

1. Right-click extension icon
2. Go to **Manage extension**
3. Enable **Developer mode**
4. Errors logged to DevTools console
5. Same debugging techniques apply

## Debugging Tips & Tricks

**Reload extension quickly:**
```
Ctrl+Shift+R (or Cmd+Shift+R on Mac) when on chrome://extensions/
```

**Force garbage collection in console:**
```js
if (window.gc) gc();  // Requires running Chrome with --js-flags="--expose-gc"
```

**Log object changes:**
```js
const original = result.summary;
Object.defineProperty(result, 'summary', {
  get() { console.log('Reading summary'); return original; },
  set(v) { console.log('Setting summary:', v); return v; }
});
```

**Monitor all storage changes:**
```js
chrome.storage.onChanged.addListener((changes, area) => {
  console.log('[Summarizer] Storage changed:', changes, area);
});
```

**Watch for tab changes:**
```js
chrome.tabs.onActivated.addListener((activeInfo) => {
  console.log('[Summarizer] Tab changed to:', activeInfo.tabId);
});
```

## Getting Help

1. Check console for error messages
2. Review logs prefixed with `[Summarizer]`
3. See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for common issues
4. Check [WORKFLOW.md](WORKFLOW.md) to understand data flow
5. Review [ARCHITECTURE.md](ARCHITECTURE.md) to understand modules

## Next Steps

- **Still stuck?** See [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
- **Need testing help?** See [TESTING.md](TESTING.md)
- **Maintenance task?** See [MAINTENANCE.md](MAINTENANCE.md)
- **Understand the code?** See [ARCHITECTURE.md](ARCHITECTURE.md)
