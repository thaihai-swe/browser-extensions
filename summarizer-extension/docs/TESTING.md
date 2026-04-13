# Testing Guide

This guide covers testing procedures ensuring quality and reliability of the Summarizer extension.

For browser-specific manual testing, switch the active manifest first:

- Chrome: `./scripts/use-chrome-manifest.sh`
- Firefox: `./scripts/use-firefox-manifest.sh`

## Testing Checklist

Before committing changes or releasing a new version, run through this checklist:

### Essential Tests

- [ ] **YouTube Summary** - Generate summary on YouTube video
- [ ] **Webpage Summary** - Generate summary on article/blog
- [ ] **Selected Text** - Highlight text and generate summary
- [ ] **Course Extraction** - Test on Udemy/Coursera lesson
- [ ] **Copy to Clipboard** - Copy generates valid text
- [ ] **Export Markdown** - Markdown export is valid
- [ ] **Export Text** - Text export is readable
- [ ] **Follow-up Questions** - Can ask questions about summary
- [ ] **Mode Switching** - All modes (Summarize, Analyze, Explain, etc.) work
- [ ] **Clear Button** - Clears summary and resets UI
- [ ] **No Console Errors** - DevTools console has no errors
- [ ] **Chrome Toolbar Opens Side Panel** - Toolbar click opens `sidepanel.html`
- [ ] **Firefox Toolbar Opens Sidebar** - Toolbar click opens `sidepanel.html`

### Extended Tests

- [ ] **Dark Mode** - UI readable in dark mode
- [ ] **Mobile** - Side panel responsive on narrow screen
- [ ] **Multiple Tabs** - Results isolated per tab
- [ ] **Tab Closing** - Closing tab clears its data
- [ ] **Long Content** - Works with long YouTube transcripts
- [ ] **Short Content** - Works with short articles
- [ ] **Network Offline** - Shows appropriate error message
- [ ] **API Error** - Handles rate limits gracefully
- [ ] **Provider Switch** - Switching providers works
- [ ] **Settings** - Custom instructions apply to summaries

## Manual Testing Procedures

### Test Case: YouTube Summary

**Setup:**
- Open any YouTube video page
- Open extension side panel

**Steps:**
1. Click "Generate" button
2. Wait for summary to appear
3. Check console (F12) for extraction logs

**Expected:**
- Summary appears within 10 seconds
- Console shows `[Summarizer] Extraction: Detected YouTube page`
- No error messages
- Summary is readable and relevant

**Failure checklist:**
- [ ] Error message appears?
- [ ] Summary text is empty?
- [ ] Network error in console?
- [ ] API error in console?

**Fix:**
- See [TROUBLESHOOTING.md](TROUBLESHOOTING.md)

### Test Case: Webpage Summary

**Setup:**
- Open any news article or blog post
- Open extension side panel

**Steps:**
1. Click "Generate" button
2. Wait for summary to appear
3. Verify extraction quality in console

**Expected:**
- Summary appears within 10 seconds
- Content is extracted correctly
- Summary captures main points
- No errors in console

**Variations to test:**
- Long article (2000+ words)
- Short article (200 words)
- Article with images/video
- Academic paper or technical blog

### Test Case: Selected Text

**Setup:**
- Open any webpage
- Highlight 3-5 sentences of text

**Steps:**
1. Open extension side panel
2. Click "Generate" button
3. Verify selected text is summarized

**Expected:**
- Only highlighted text is summarized
- Summary is concise (usually 2-3 sentences)
- No other page content is extracted

**Variations:**
- Single word selection
- Full paragraph selection
- Multiple selections (test only uses current selection)

### Test Case: Mode Switching

**Setup:**
- Open any page with good content
- Generate a summary in default "Summarize" mode

**Steps:**
1. Generate initial summary
2. Change mode selector to "Analyze"
3. Click Generate
4. Verify different summary is generated
5. Repeat for other modes: Explain, Debate, Study, Outline, Timeline

**Expected:**
- Each mode produces different summary format
- Mode name appears in UI
- No errors in console

**Example outputs:**
- **Summarize:** "The article discusses..."
- **Analyze:** "Key arguments include..."
- **Explain:** "This topic involves..."
- **Debate:** "Arguments for... Arguments against..."

### Test Case: Export Functionality

**Setup:**
- Generate a summary
- Open browser developer tools (F12)

**Steps:**

1. Click "Copy" button
   - Expected: Button shows feedback
   - Paste into text editor to verify content

2. Click "Markdown" export
   - Expected: Downloads file named `summary.md`
   - Open in text editor to verify markdown formatting

3. Click "Text" export
   - Expected: Downloads file named `summary.txt`
   - Open to verify plain text format

**Verification:**
- Exported content matches displayed summary
- Markdown has proper formatting
- Text is readable without formatting

### Test Case: Follow-up Questions

**Setup:**
- Generate a summary
- Wait for "Follow-up Questions" section to appear

**Steps:**
1. Review suggested questions
2. Click one of the questions
3. Verify question appears in chat input
4. Click Send (or press Enter)
5. Wait for response

**Expected:**
- Follow-up response appears in chat
- Response is relevant to question
- Response uses summary as context
- No errors in console

### Test Case: Provider Switching

**Setup:**
- Open settings and configure 2 providers (e.g., Gemini + OpenAI)
- Generate base summary with one provider

**Steps:**
1. Switch provider in settings
2. Generate new summary
3. Compare outputs

**Expected:**
- Each provider successfully generates summary
- Summaries may differ slightly (different model behavior)
- No API key errors
- Network requests go to correct provider

**Providers to test:**
- Test locally configured provider
- If available, test another provider
- Verify API key is correct for each

### Test Case: Provider Error Handling

**Setup:**
- Configure provider with invalid API key
- Open side panel

**Steps:**
1. Click Generate
2. Wait for error response
3. Check error message

**Expected:**
- Clear error message appears
- Console shows API error details
- Extension doesn't crash
- Can retry after fixing API key

### Test Case: Data Isolation

**Setup:**
- Open 2 separate tabs with different pages
- Generate summary in Tab 1

**Steps:**
1. Generate summary in Tab 1
2. Switch to Tab 2
3. Verify Tab 2 doesn't show Tab 1's summary
4. Generate new summary in Tab 2
5. Switch back to Tab 1
6. Verify Tab 1's original summary is still there

**Expected:**
- Each tab's summary persists independently
- Switching tabs shows correct summary
- Clear button only clears current tab

### Test Case: Dark Mode

**Setup:**
- Open side panel
- Check OS dark mode settings (or set theme in options)

**Steps:**
1. Enable dark mode
2. Verify all UI elements are readable
3. Check button colors are appropriate
4. Review text contrast
5. Disable dark mode
6. Verify light mode works

**Expected:**
- All text readable in both modes
- Colors have sufficient contrast
- No elements disappear or become invisible

## Automated Testing Setup (Future)

Currently, the project doesn't have automated tests. Future setup could include:

### Unit Testing
- Framework: Jest or Mocha
- Coverage: Extractors, providers, prompt building

### Integration Testing
- Framework: Playwright or WebDriver
- Coverage: End-to-end summary generation

### Example Test Structure
```
tests/
├── unit/
│   ├── extractors.test.js
│   ├── providers.test.js
│   └── prompts.test.js
├── integration/
│   └── workflows.test.js
└── fixtures/
    └── sample-data.js
```

## Performance Testing

### Extraction Speed

Measure how long extraction takes:

**Steps:**
1. Open background DevTools (Performance tab)
2. Record performance
3. Generate summary
4. Stop recording
5. Analyze flame chart

**Expected:**
- YouTube extraction: < 500ms
- Webpage extraction: < 1000ms
- Selected text: < 100ms

**If slow:**
- See [Debugging Guide](DEBUGGING.md#slow-extraction)

### API Response Time

Monitor LLM API performance:

**Steps:**
1. Open Network tab
2. Generate summary
3. Look for API request
4. Check response time

**Expected:**
- Typical response time: 2-10 seconds
- Depends on content length and model

**High latency causes:**
- Large content (reduce max tokens)
- Provider load (try later or different provider)
- Network speed (check connection)

### Memory Usage

Monitor extension memory:

**Steps:**
1. Open `chrome://extensions/`
2. Enable Developer mode
3. Inspect background page
4. Open DevTools Memory tab
5. Take heap snapshot

**Expected:**
- Initial: ~5-10 MB
- After summary: ~10-15 MB
- No continuous growth (memory leak)

## Test Environments

### Development Environments

**Local Testing:**
- Chrome/Chromium browser
- Any website for testing extraction
- Local API endpoint for providers (optional)

**Required for testing:**
- Valid YouTube video URL
- Sample article page
- Sample course lesson (if testing course extraction)
- LLM API keys (for each provider you're testing)

### Testing Checklist by Provider

**Gemini/Google AI:**
- [ ] Valid API key configured
- [ ] Quota not exceeded
- [ ] Model is `gemini-pro` or similar
- [ ] API enabled in Google Cloud Console

**OpenAI:**
- [ ] Valid API key configured
- [ ] Organization set correctly (if applicable)
- [ ] Sufficient credit/usage
- [ ] Model is `gpt-3.5-turbo` or similar

**Local (Ollama/OpenAI-compatible):**
- [ ] Endpoint URL correct (e.g., `localhost:11434`)
- [ ] Server is running
- [ ] Model is available locally
- [ ] Correct base path for endpoint

## Test Coverage Goals

### Critical Paths (must test)
- Summary generation on YouTube
- Summary generation on webpages
- Export functionality
- Follow-up Q&A
- Error handling

### Important Features (should test)
- All extraction types (YouTube, webpage, text, course)
- All modes (Summarize, Analyze, Explain, Debate, Study, Outline, Timeline)
- Settings and customization
- Multiple tabs/data isolation

### Nice to Have (could test)
- Performance metrics
- Memory usage
- UI responsiveness
- Accessibility features

## Regression Testing

After making changes, specifically test:

1. **Extraction changes:**
   - Test on relevant content type (YouTube/webpage/course)
   - Verify extraction quality improved or maintained

2. **Prompt changes:**
   - Generate summaries in all modes
   - Compare output quality
   - Check for unexpected changes

3. **Provider changes:**
   - Test with provider's test API key
   - Verify error handling
   - Check response parsing

4. **UI changes:**
   - Test in light and dark modes
   - Check responsiveness
   - Verify keyboard navigation

5. **Settings changes:**
   - Test custom instructions apply correctly
   - Verify settings persist across sessions
   - Check UI reflects settings

## Test Report Template

Use this template when testing:

```markdown
# Test Report - [Date]

## Environment
- Chrome Version: [version]
- Extension Version: [version]
- Provider: [Gemini/OpenAI/Local]
- OS: [Windows/Mac/Linux]

## Tests Run
- [ ] YouTube Summary - PASS/FAIL
- [ ] Webpage Summary - PASS/FAIL
- [ ] Selected Text - PASS/FAIL
- [ ] Export - PASS/FAIL
- [ ] Follow-up Q&A - PASS/FAIL

## Issues Found
- [Issue 1]: [Description] - [Severity]
- [Issue 2]: [Description] - [Severity]

## Notes
[Any additional observations]
```

## Continuous Testing

### Before Every Commit
1. Run manual tests for changes you made
2. Run one full test from the checklist
3. Check console for errors
4. Commit only if all tests pass

### Before Every Release
1. Run complete testing checklist
2. Test on 2-3 sample pages
3. Test with each configured provider
4. Verify CHANGELOG.md is updated
5. Verify version number bumped

## Getting Help

- **Debugging help?** See [DEBUGGING.md](DEBUGGING.md)
- **Test failing?** Check [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
- **Code question?** See [ARCHITECTURE.md](ARCHITECTURE.md)
- **Testing automation?** See future test documentation
