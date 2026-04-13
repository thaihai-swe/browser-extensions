# Troubleshooting Guide

Solutions to common issues with the Summarizer extension.

## General Issues

### Extension Not Loading

**Problem:** Extension doesn't appear in Chrome after loading

**Solutions:**

1. **Check manifest.json is valid:**
   ```bash
   # Make sure manifest.json exists in project root
   ls -la manifest.json
   ```

2. **Reload extension:**
   - Open `chrome://extensions/`
   - Find Summarizer extension
   - Click reload button (circular arrow)

3. **Clear corrupted data:**
   - Remove extension from `chrome://extensions/`
   - Clear cookies/cache (Settings > Privacy)
   - Reload extension

4. **Check Chrome version:**
   - Requires Chrome 90+
   - Check: Menu > About Google Chrome
   - Auto-updates if update available

**Still not working?**
- See [DEBUGGING.md](docs/DEBUGGING.md) for console debugging

### Extension Crashes or Freezes

**Problem:** Extension stops responding or crashes

**Solutions:**

1. **Reload extension:**
   - Open `chrome://extensions/`
   - Click reload on Summarizer extension
   - Try again

2. **Check browser resources:**
   - Open Task Manager (Shift+Esc)
   - Look for Chrome processes using high CPU/memory
   - Close other tabs to free resources

3. **Disable conflicting extensions:**
   - Open `chrome://extensions/`
   - Disable other extensions one by one
   - Reload Summarizer to test
   - Re-enable non-conflicting extensions

4. **Review console errors:**
   1. Open background page console
   2. Look for red error messages
   3. See [DEBUGGING.md](docs/DEBUGGING.md) for error analysis

**If still crashing:**
- Uninstall and reinstall extension
- Check Chrome for updates

## Extraction Issues

### No Content Extracted / Empty Summary

**Problem:** "Getting your summary..." message never disappears or summary is blank

**First check:**

1. Open console (F12)
2. Look for extraction logs:
   ```
   [Summarizer] Extraction: Detected [type] page
   [Summarizer] Extraction: Extracted [number] tokens
   ```

3. If no logs appear:
   - Extension content script didn't load
   - Try reloading page (F5)
   - Reload extension: `chrome://extensions/`

**Solution by page type:**

**YouTube:**
- [ ] Is it a watch page or live stream? (Other pages don't have transcripts)
- [ ] Does video have a transcript? (Check if CC button available)
- [ ] Are captions available? (Live streams may not have full transcripts)

**Fix:**
1. Open video with captions
2. Wait 5 seconds for captions to load
3. Click extension
4. Generate summary

**Webpages/Articles:**
- [ ] Is page still loading? (Wait for page to fully load)
- [ ] Is content behind paywall? (Can't extract paywalled content)
- [ ] Is page JavaScript-heavy? (Some SPAs need extra load time)

**Fix:**
1. Wait 3-5 seconds after page loads
2. Scroll to content area
3. Try generating summary
4. If still empty, try with different page

**Selected Text:**
- [ ] Did you highlight text before opening extension?
- [ ] Is highlighted text still selected? (Selection might be lost)

**Fix:**
1. Highlight at least 3 words
2. Immediately click extension
3. Click Generate

### "Could not establish connection. Receiving end does not exist."

**Problem:** Chrome shows a raw connection error instead of summarizing the page.

**Common causes:**

1. The extension was reloaded or updated while the tab stayed open
2. The current tab is a restricted browser page such as `chrome://extensions`
3. The tab finished navigating right as the summary request was sent

**Fix:**

1. Reload the current webpage tab and try again
2. If you are on a browser-owned page (`chrome://`, `edge://`, extension pages), switch to a normal website tab
3. Reload the extension from `chrome://extensions/` if the issue started right after a code change

### Extraction Quality is Poor

**Problem:** Summary doesn't match page content or misses important info

**Causes:**

1. **Webpage extraction imperfect:**
   - Semantic extraction works best on articles
   - Doesn't work well on: lists, galleries, doc sites
   - May include: navigation text, ads, sidebars

2. **YouTube transcript incomplete:**
   - Some videos have auto-generated captions
   - Auto-generated captions may have errors
   - Some live streams don't have full transcripts

3. **Course extraction missing content:**
   - Only extracts visible content (not scrolled areas)
   - Some course platforms have custom layouts

**Solutions:**

1. **For webpages:**
   - Try highlighting the main article text and using Selected Text mode
   - Works better than automatic extraction

2. **For YouTube:**
   - Check if transcript is available (click CC button)
   - Use videos with community-contributed transcripts (usually better)

3. **For courses:**
   - Scroll to see all content before generating summary
   - Course content may need platform-specific handling

**Workaround:**
- Manually select and copy the content you want
- Use Selected Text mode to summarize just that text

## API and Provider Issues

### "API Error" or "Failed to Fetch"

**Problem:** Error appears when trying to generate summary

**First check:**

1. Check network connection:
   ```bash
   ping google.com
   ```

2. Look at console error message - it usually indicates:
   - `[Summarizer] Provider: Error: [specific error]`

3. Check provider-specific errors below

**Solutions:**

1. **Reload extension:**
   - `chrome://extensions/` > reload

2. **Check settings:**
   - Click settings button
   - Verify provider is selected
   - Verify API key is entered
   - Try another provider if available

3. **Wait and retry:**
   - Sometimes API has temporary issues
   - Wait 30 seconds and try again

### Gemini / Google AI Errors

**"INVALID_ARGUMENT: Please ensure that only a single request is made per second"**
- You're sending requests too fast
- Wait 1+ second between requests

**"PERMISSION_DENIED: User must have Admin approval"**
- API not enabled in Google Cloud
- Solution:
  1. Go to Google Cloud Console
  2. Enable Generative Language API
  3. Add API key to extension settings

**"UNAUTHENTICATED: API key not valid"**
- API key is invalid or expired
- Solution:
  1. Go to Google Cloud Console
  2. Create new API key
  3. Add to extension settings

**"RESOURCE_EXHAUSTED: Quota exceeded"**
- Hit API usage limit
- Solution:
  1. Wait until tomorrow (quota resets daily)
  2. Or switch to different provider
  3. Or use local LLM

### OpenAI / ChatGPT Errors

**"Invalid API Key"**
- API key is wrong, expired, or revoked
- Solution:
  1. Go to platform.openai.com
  2. Get new API key
  3. Update extension settings

**"Insufficient quota"**
- No more API credits or hit rate limit
- Solution:
  1. Add credit card to OpenAI account
  2. Check usage at platform.openai.com
  3. Or switch provider

**"Rate limit exceeded"**
- Sending requests too fast
- Solution:
  1. Wait 60+ seconds
  2. Try again
  3. Use smaller summaries to hit limits less

**"Models endpoint not found"**
- Using wrong model name or endpoint
- Solution:
  1. Check [SETUP.md](docs/SETUP.md)
  2. Update model to `gpt-3.5-turbo` or `gpt-4`
  3. Verify endpoint URL if using Azure

### Local / Ollama Errors

**"Failed to connect"**
- Ollama server not running or wrong URL
- Solution:
  1. Start Ollama: `ollama serve`
  2. Check URL in settings (usually `localhost:11434`)
  3. Try `http://` not `https://`

**"Model not found"**
- Model not installed locally
- Solution:
  1. In terminal: `ollama list`
  2. Pull model: `ollama pull llama2`
  3. Try model from installed list

**"Connection timeout"**
- Server too slow or overloaded
- Solution:
  1. Check system resources (CPU, RAM)
  2. Close other applications
  3. Use smaller/faster model

## Storage and Settings Issues

### Settings Not Saving

**Problem:** API key or custom instructions disappear after restart

**Solutions:**

1. **Check Chrome storage permissions:**
   - `chrome://extensions/`
   - Find Summarizer
   - Click Details
   - Permissions should include "Storage"

2. **Clear corrupted cache:**
   1. Remove extension from `chrome://extensions/`
   2. Go to chrome://settings/privacy
   3. Clear cache and cookies
   4. Reload extension
   5. Re-enter settings

3. **Disable sync conflicts:**
   - Some browser sync settings interfere
   - Try disabling Chrome Sync temporarily
   - Re-enter settings
   - Re-enable Sync

**If still not working:**
- See [Storage.md](docs/STORAGE.md) for storage details

### Settings Lost After Update

**Problem:** Settings disappear after updating extension

**Solutions:**

1. **Check if version changed:**
   - `chrome://extensions/` > Summarizer details
   - Note the version number

2. **Restore from backup:**
   - If you exported settings before update
   - Copy JSON into settings
   - Click Save

3. **Re-enter settings:**
   - Usually only happens on major updates
   - Re-entering settings after update often fixes this

**Prevent future loss:**
- Export settings periodically (if export feature available)
- Keep notes of API keys in secure location

## UI and Display Issues

### Side Panel Not Showing

**Problem:** Clicking extension icon doesn't open side panel

**Solutions:**

1. **Check if extension loaded:**
   - `chrome://extensions/`
   - Look for Summarizer
   - Should be enabled (toggle is blue)

2. **Reload extension:**
   - `chrome://extensions/` > reload button

3. **Clear side panel cache:**
   1. Remove extension
   2. Clear cache: settings > Privacy
   3. Reinstall extension

4. **Check Chrome version:**
   - Side panels require Chrome 114+
   - Menu > About Google Chrome
   - Update if available

### UI Text Garbled or Overlapping

**Problem:** Side panel text appears cut off or overlapping

**Solutions:**

1. **Zoom level:**
   - In side panel: Ctrl/Cmd + 0 (reset zoom)
   - Or Ctrl/Cmd +/- to adjust

2. **Resize side panel:**
   - Drag edge of side panel left/right
   - Text should reflow
   - If still broken, try max width

3. **Reload extension:**
   - `chrome://extensions/` > reload
   - Close and reopen side panel

### Dark Mode Issues

**Problem:** Text not readable in dark mode or colors wrong

**Solutions:**

1. **Check OS dark mode:**
   - Windows: Settings > Colors
   - Mac: System Preferences > General
   - Toggle dark mode on/off to test

2. **Check Chrome theme:**
   - `chrome-extension://[id]/options.html`
   - Manually set theme if available

3. **Adjust system contrast:**
   - Higher contrast might fix readability
   - Or use light mode

## Summary Quality Issues

### Summary is Too Long

**Problem:** Summary is longer than expected

**Solutions:**

1. **Reduce max tokens in settings:**
   - Open extension settings
   - Reduce "Max summary length"
   - Try shorter length like "Medium" or "Short"

2. **Use different mode:**
   - "Outline" mode: reduces to bullets
   - "Study" mode: might be more concise
   - "Summarize": should be shortest

3. **Check extraction length:**
   - Content might just be long
   - Try Selected Text mode with just key content

### Summary is Too Short or Generic

**Problem:** Summary lacks detail or seems too simple

**Solutions:**

1. **Increase max tokens:**
   - Settings > increase "Max summary length"
   - Try "Long" mode if available

2. **Try different mode:**
   - "Analyze": More detail
   - "Explain": Clearer explanation
   - "Debate": More thorough coverage

3. **Add custom instructions:**
   - Settings > Custom Instructions
   - Add: "Include specific examples and data"
   - Try again

### Summary has Typos or Errors

**Problem:** Generated summary has mistakes

**Causes:**
- Source content had errors (auto-generated captions, OCR errors)
- LLM model made mistakes
- Rarely: API transmission error

**Solutions:**

1. **Accept as limitation:**
   - Auto-generated transcripts are imperfect
   - LLMs occasionally make mistakes
   - Edit summary manually if needed

2. **Try different provider:**
   - Some models are more accurate
   - Try GPT-4 if available (usually more accurate)
   - Or try different local model

3. **Provide feedback to provider:**
   - Some providers accept feedback
   - Report through provider's interface

## Follow-up Q&A Issues

### Follow-up Questions Don't Appear

**Problem:** No suggested questions after summary

**Solutions:**

1. **Check summary generated:**
   - Follow-up questions only appear after successful summary
   - Verify summary text is showing

2. **Check mode:**
   - Some modes might not generate follow-up questions
   - Try "Summarize" mode
   - Try different source

3. **Reload extension:**
   - `chrome://extensions/` > reload
   - Generate new summary

### Follow-up Answer is Wrong or Off-Topic

**Problem:** Answer to question doesn't match summary

**Causes:**
- LLM lost context
- Question was ambiguous
- Too much chat history confused model

**Solutions:**

1. **Check previous messages:**
   - Chat history builds up
   - Clear summary/chat if too many messages
   - Use Clear button to reset

2. **Rephrase question:**
   - Be more specific
   - Reference summary directly
   - Avoid ambiguous pronouns

3. **Reset conversation:**
   - Click Clear button
   - Generate new summary
   - Ask question about fresh summary

## Performance Issues

### Summary Generation is Slow

**Problem:** Takes longer than 15-30 seconds

**Causes:**
- Large content (long videos/articles)
- Slow network
- Provider is slow/overloaded
- System resources limited

**Solutions:**

1. **Check network speed:**
   ```bash
   ping api.gemini.google.com
   # Should show < 100ms latency
   ```

2. **Reduce content size:**
   - Use Selected Text mode with short excerpt
   - Reduces processing time

3. **Try different provider:**
   - Some providers are faster
   - Gemini and OpenAI both usually fast

4. **Wait and retry:**
   - Provider might be temporarily slow
   - Wait 30 seconds and try again

### Extension Uses Too Much Memory

**Problem:** Chrome shows high memory for extension

**Typical usage:**
- Initial: 5-10 MB
- After summary: 10-15 MB
- Normal operation: stays within 20 MB

**If higher:**

1. **Reload extension:**
   - `chrome://extensions/` > reload
   - Clears cached data

2. **Clear stored results:**
   - Close some tabs
   - Each tab stores its summary
   - Closing tabs frees memory

3. **Restart Chrome:**
   - Close all Chrome windows
   - Reopen Chrome
   - Memory resets

## Browser Compatibility

### Works on Different Browsers

**Supported:**
- Chrome 90+
- Edge 90+ (Chromium-based)
- Brave (Chromium-based)
- Opera (Chromium-based)
- Most Chromium browsers

**Not Supported:**
- Firefox (requires Firefox addon, not currently available)
- Safari (requires iOS/macOS app, not currently available)
- Internet Explorer (not recommended)

**Solution:**
- Use Chromium-based browser
- Or use different version for other browsers

## Getting Help

### Before Reaching Out

1. Check this guide for your issue
2. See [DEBUGGING.md](docs/DEBUGGING.md) if technical
3. Check console for error messages
4. Look at [TESTING.md](docs/TESTING.md) for testing procedures

### Debugging Information to Include

If reporting an issue:

1. **Environment:**
   - Chrome version
   - Extension version
   - Operating system
   - Which provider (Gemini/OpenAI/Local)

2. **Error details:**
   - Exact error message
   - When did it start?
   - Reproducible? (Can you create it again?)

3. **Console logs:**
   - Open DevTools
   - Copy relevant `[Summarizer]` logs
   - Include in report

4. **Steps to reproduce:**
   - Exact steps to create the problem
   - What page/content you were summarizing
   - What you expected vs what happened

### Next Steps

- **Still stuck?** See [DEBUGGING.md](docs/DEBUGGING.md) for advanced debugging
- **Need help developing?** See [MAINTENANCE.md](docs/MAINTENANCE.md)
- **Want to test?** See [TESTING.md](docs/TESTING.md)
- **Need context?** See [ARCHITECTURE.md](docs/ARCHITECTURE.md)
