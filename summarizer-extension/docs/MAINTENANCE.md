# Maintenance Guide

This guide covers common maintenance tasks and workflows for the Summarizer extension.

## Quick Reference

| Task                    | File                                                               | Command                             |
| ----------------------- | ------------------------------------------------------------------ | ----------------------------------- |
| Update extraction logic | [lib/extractors/](/lib/extractors/)                                | No build needed                     |
| Modify prompts          | [lib/prompts/](/lib/prompts/)                                      | No build needed                     |
| Change UI               | [sidepanel.html](/sidepanel.html), [sidepanel.css](/sidepanel.css) | Reload extension                    |
| Add provider            | [lib/providers/](/lib/providers/)                                  | Update [PROVIDERS.md](PROVIDERS.md) |
| Fix bug                 | See [Debugging Guide](DEBUGGING.md)                                | Follow test guidelines              |

## Common Maintenance Tasks

### Updating an Extractor

Extractors live in [lib/extractors/](/lib/extractors/) and each handles a specific content type.

**To update YouTube extraction:**

1. Open [lib/extractors/youtube.js](/lib/extractors/youtube.js)
2. Find the relevant function (e.g., `extractTranscript()`)
3. Make your changes
4. Test on a YouTube video using the extension
5. Check console output for debug logs
6. Update tests if behavior changes

**Key extraction functions:**
- [youtube.js](/lib/extractors/youtube.js) - `extractTranscript()`, `extractMetadata()`
- [webpage.js](/lib/extractors/webpage.js) - `extractSemanticContent()`, `extractAccessibilityTree()`
- [course.js](/lib/extractors/course.js) - `extractUdemyLesson()`, `extractCourseraLesson()`
- [selected-text.js](/lib/extractors/selected-text.js) - `extractSelectedText()`

### Modifying Prompts

Prompts are built dynamically using templates in [lib/prompts/](/lib/prompts/).

**To update a prompt template:**

1. Open [lib/prompts/templates/](/lib/prompts/templates/)
2. Select the template for your source (e.g., [youtube.js](/lib/prompts/templates/youtube.js))
3. Update the prompt instruction or system message
4. Test by generating a summary and checking console output
5. See [PROMPTS.md](PROMPTS.md) for prompt structure

**Common prompt adjustments:**
- Make summaries shorter: Reduce `maxTokens` or adjust instruction length
- Change summary style: Modify instructions in templates (e.g., "bullet points" vs "narrative")
- Add new summary mode: Create new prompt template following existing pattern

### Adding a New LLM Provider

Providers are in [lib/providers/](/lib/providers/). Each provider implements the same interface.

**To add a new provider:**

1. Create [lib/providers/newprovider.js](/lib/providers/newprovider.js)
2. Implement required methods:
   ```js
   export async function callModel(systemPrompt, userPrompt, options) {
     // Make API call and return result
     return { text: summaryText };
   }
   ```
3. Update [lib/provider-registry.js](/lib/provider-registry.js) to register it
4. Add configuration section to [docs/SETUP.md](SETUP.md)
5. Update [docs/PROVIDERS.md](PROVIDERS.md)
6. Test with real API keys

**Provider interface:**
- Input: `systemPrompt`, `userPrompt`, `options` (model, temperature, maxTokens, etc.)
- Output: `{ text: string }` or throw error

### Updating the Side Panel UI

The side panel UI is in [sidepanel.html](/sidepanel.html) and [sidepanel.css](/sidepanel.css).

**To update UI:**

1. Make HTML/CSS changes
2. Reload extension (click reload on chrome://extensions/)
3. Test in extension
4. If JavaScript changes needed, update [sidepanel.js](/sidepanel.js)
5. See [UI.md](UI.md) for component reference

**Common UI changes:**
- Add button: Edit HTML and add CSS class
- Change spacing: Update CSS variables (e.g., `--gap: 12px`)
- Add section: Follow pattern in [lib/sidepanel/render.js](/lib/sidepanel/render.js)

## Debugging in Development

### Enable Debug Logging

1. Open `chrome://extensions/`
2. Click extension
3. Open console (F12) on extension background page
4. All logs appear in console automatically

**Key console outputs:**
- `[Summarizer] Extraction:` - Content extraction events
- `[Summarizer] Provider:` - API calls and responses
- `[Summarizer] Workflow:` - Summary generation workflow
- `[Summarizer] UI:` - Side panel events

### Test Locally

**YouTube:**
1. Open any YouTube watch page
2. Click extension icon
3. Select "Summarize" mode
4. Click Generate
5. Wait for summary

**Webpage:**
1. Open any article/blog
2. Click extension icon
3. Click Generate
4. Check extraction in console

**Selected Text:**
1. Highlight text on any page
2. Click extension icon
3. Click Generate

See [DEBUGGING.md](DEBUGGING.md) for detailed debugging techniques.

## Testing Changes

### Manual Testing Checklist

Before committing changes:

- [ ] Extraction works on YouTube
- [ ] Extraction works on webpages
- [ ] Selected text extraction works
- [ ] Course extraction works (Udemy/Coursera)
- [ ] Summaries generate correctly
- [ ] Exports work (Markdown, Text)
- [ ] Follow-up questions work
- [ ] Clear button works
- [ ] Mode selector changes modes
- [ ] Console has no errors

See [TESTING.md](TESTING.md) for full testing guide.

## Version Management

### Updating Version

1. Update version in [manifest.json](/manifest.json):
   ```json
   "version": "1.2.3"
   ```

2. Create changelog entry in [CHANGELOG.md](CHANGELOG.md):
   ```markdown
   ## [1.2.3] - 2026-04-12
   ### Fixed
   - Fixed YouTube extraction
   - Fixed grammar in prompts

   ### Changed
   - Updated UI spacing
   ```

### Publishing Updates

1. Increment version in manifest.json
2. Test all functionality
3. Update CHANGELOG.md
4. Commit and tag: `git tag v1.2.3`
5. Push to repository

## Performance Optimization

### Reduce API Calls

- Long YouTube transcripts automatically chunk text to reduce API requests
- See [WORKFLOW.md](WORKFLOW.md) for chunking strategy
- Monitor API usage in console logs

### Speed Up Extraction

- Check [lib/extractors/webpage.js](/lib/extractors/webpage.js) for extraction time
- Profile extraction using Chrome DevTools
- Simplify extraction logic if needed

### Optimize UI Rendering

- Check [lib/sidepanel/render.js](/lib/sidepanel/render.js) for rendering performance
- Use Chrome DevTools to profile rendering
- Lazy-load large result sections if needed

## Dependency Management

This project has **zero npm dependencies** - all code is vanilla JavaScript!

### Why?
- Simpler development and deployment
- No build step required
- Easier to audit code
- Faster extension loading

### Adding Dependencies

Only add dependencies if absolutely necessary:

1. Update [Contributing Guide](CONTRIBUTING.md) with justification
2. Update [README.md](README.md) if major change
3. Add setup instructions to [SETUP.md](SETUP.md)
4. Document in this guide

**Current only-external dependencies:**
- Chrome extension APIs (built-in)
- LLM provider APIs (configurable, not bundled)

## Common Issues

**Extension not loading?**
- See [TROUBLESHOOTING.md](TROUBLESHOOTING.md#extension-not-loading)

**Summaries not generating?**
- See [TROUBLESHOOTING.md](TROUBLESHOOTING.md#summaries-not-generating)

**API errors?**
- See [TROUBLESHOOTING.md](TROUBLESHOOTING.md#api-errors)

## Getting Help

1. Check [DEBUGGING.md](DEBUGGING.md) for debugging tips
2. Check [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for common issues
3. Search console logs for error messages
4. Review [WORKFLOW.md](WORKFLOW.md) to understand data flow
5. Check [Architecture](ARCHITECTURE.md) to understand module relationships

## Next Steps

- **Making changes?** See [Contributing Guide](CONTRIBUTING.md)
- **Debugging?** See [Debugging Guide](DEBUGGING.md)
- **Testing?** See [Testing Guide](TESTING.md)
- **Understanding flow?** See [Workflow](WORKFLOW.md)
