# Architecture

## Overview

The extension is organized into four runtime layers:

1. content-script extraction on the active page
2. background orchestration and storage
3. prompt construction
4. side panel and floating UI rendering

## Runtime Modules

### Content Script Layer

- [content.js](/content.js) - content script entry
- [lib/extractors.js](/lib/extractors.js) - extraction dispatcher for all sources
  - **MAX_CONTENT_LENGTH: 50,000 characters** (increased from 18,000)
  - Supports: selected text, YouTube transcripts, webpages, courses

Responsibilities:

- detect content source on page (priority: selected text → YouTube → course → webpage)
- extract source-specific content and metadata
- return normalized extraction objects with truncated content
- capture video details, transcript segments, and timestamps for YouTube
- handle dedicated course-content requests for Udemy and Coursera

### Background Layer

- [background.js](/background.js) - service worker entry and message routing
- [lib/storage.js](/lib/storage.js) - Chrome storage helpers and state management
- [lib/tab-cache-service.js](/lib/tab-cache-service.js) - per-tab result caching
- [lib/provider-registry.js](/lib/provider-registry.js) - provider abstraction layer

Responsibilities:

- route messages between content script, side panel, and options page
- request extraction from the active tab
- build prompts using lib/prompts.js based on source type
- call selected provider (Gemini, OpenAI, local, Ollama, LMStudio)
- parse AI responses with lib/cleaners.js into 7-section result
- save results and manage conversation history per tab
- track workflow state (extracting → summarizing → completed)
- push UI updates to side panel

### Prompt Layer

- [lib/prompts.js](/lib/prompts.js) - unified prompt builder
  - Exports: `buildSummaryPrompt()`, `buildDeepDivePrompt()`
  - Builds context-aware prompts based on sourceType, summarySize, promptMode, tone, language
  - Specifies parser-safe section headings and AI output format

Responsibilities:

- select correct prompt structure based on `sourceType` and settings
- apply shared rules: tone, summary size, language, safety guardrails
- add source-specific context and requirements
- ensure AI output matches parser expectations (7 sections: Summary, Key Takeaways, Main Points, Details of Video, Detailed Breakdown, Expert Commentary, Follow-up Questions)
- build deep-dive prompts from saved summary + conversation history

### Parsing Layer

- [lib/cleaners.js](/lib/cleaners.js) - response parser and text utilities
  - Exports: `parseStructuredSummary()`, `cleanText()`, `truncateText()`, `sanitizeFilename()`
  - Parses AI output by matching heading patterns into 7 structured sections
  - Supports: Summary, Key Takeaways, Main Points, **Details of Video** (NEW), Detailed Breakdown, Expert Commentary, Follow-up Questions

### UI Layer

- [sidepanel.js](/sidepanel.js) - side panel logic and orchestration
- [sidepanel.html](/sidepanel.html) - side panel markup with Details of Video section
- [sidepanel.css](/sidepanel.css) - side panel styles
- [lib/markdown.js](/lib/markdown.js) - markdown to HTML rendering
- [lib/exporters.js](/lib/exporters.js) - export to Markdown/plain text
- [content.js](/content.js) - floating "Summarize" button UI

Responsibilities:

- display parsed summary with all 7 sections
- handle user input for follow-up questions
- render collapsible sections (Main Points, Breakdown, Commentary, Details of Video)
- show Details of Video immediately after Summary (before Key Takeaways)
- export results with all sections preserved
- manage conversation history display

## Storage  

[lib/storage.js](/lib/storage.js) uses Chrome's `chrome.storage.local` to persist:

- `summarizerSettings` - user preferences and provider configs
- `summarizerResultsByTab` - parsed summary results keyed by tab ID (includes all 7 sections)
- `summarizerConversationsByTab` - follow-up Q&A history keyed by tab ID
- `summarizerWorkflowByTab` - workflow state (extracting/summarizing/completed/failed) keyed by tab ID

Result object structure includes parsed sections, metadata, and source details:

```js
{
  // Parsed sections (7 total)
  summary: string,
  keyTakeaways: string[],
  mainPoints: string,
  detailsOfVideo: string,        // NEW: Timeline and video specifics
  detailedBreakdown: string,
  expertCommentary: string,
  followUpQuestions: string[],
  
  // Metadata
  provider: string,
  model: string,
  promptMode: string,
  generatedAt: string,
  
  // Source data
  sourceType: string,
  title: string,
  url: string,
  sourceContent: string,
  transcriptSegments: [...],
  videoDetails: {...}            // YouTube metadata
}
```

Key behaviors:

- Results stored per tab (keyed by tab ID)
- New summary clears prior follow-up conversation
- Workflow state tracks current processing phase
- Tab closure triggers cleanup of stored data

## Providers

[lib/provider-registry.js](/lib/provider-registry.js) exposes:

- `generateText(providerId, prompt, settings)` - calls the selected provider

Supported providers:

- **Gemini** via [lib/providers/gemini.js](/lib/providers/gemini.js) - Google's Gemini API
- **OpenAI** via [lib/providers/openai.js](/lib/providers/openai.js) - OpenAI's chat completions
- **Local** via [lib/providers/local.js](/lib/providers/local.js) - Local or self-hosted LLM (Ollama-compatible or OpenAI-compatible)

## Utilities & Libraries

**Extraction:**
- [lib/cleaners.js](/lib/cleaners.js) - text sanitization and structured output parsing
- [lib/extractors.js](/lib/extractors.js) - extraction dispatcher and orchestration

**Messaging:**
- [lib/messages.js](/lib/messages.js) - message type constants

**Providers:**
- [lib/provider-registry.js](/lib/provider-registry.js) - provider abstraction layer

**Storage:**
- [lib/storage.js](/lib/storage.js) - Chrome storage wrapper and tab data management

**Prompts:**
- [lib/prompts/builders.js](/lib/prompts/builders.js) - prompt routing by source type
- [lib/prompts/common.js](/lib/prompts/common.js) - shared prompt utilities

## Logging & Debugging

The extension logs important pipeline stages to the console:

- Content script console (`page DevTools`): extraction logs, selected content
- Extension service worker console (`chrome://extensions → Service Workers`): background logs, provider requests/responses

Enable detailed logging by checking browser/extension console output during:
- content extraction phase
- provider API calls
- summary parsing

## Extraction Object Shape

All extractors aim to return a normalized object with at least:

```js
{
  sourceType: "youtube" | "webpage" | "course" | "selectedText",
  title: string,
  url: string,
  content: string
}
```

YouTube can additionally return:

```js
{
  contentRaw,
  contentForPrompt,
  transcriptSegments,
  videoDetails
}
```

## Key Architectural Decisions

**Content Extraction:**
- All extractors return normalized objects with truncated content (max 50,000 characters)  
- Priority order: selected text → YouTube → course → webpage
- YouTube extracts video metadata (duration, channel, chapters, transcript language)
- Webpage extraction uses semantic detection with accessibility tree principles

**Prompt Design:**
- Single lib/prompts.js considers sourceType, summarySize, promptMode, tone, language
- Parser-safe section headers are fixed: Summary, Key Takeaways, Main Points, Details of Video, Detailed Breakdown, Expert Commentary, Follow-up Questions
- AI output must use exactly these headings in order (enforced by lib/cleaners.js parsing)

**Response Parsing:**
- lib/cleaners.js parses by heading patterns (case-insensitive regex matching)
- Fixed 7-section result object ensures consistent UI rendering  
- Details of Video section captures timeline details and video-specific insights
- Fallback heuristics handle malformed AI output gracefully

**Storage & Lifecycle:**
- Results, conversations, and workflow state keyed by tab ID
- New summary clears prior conversation for that tab
- Tab closure triggers cleanup of all associated data
- Settings stored globally (not per-tab)

**Provider Architecture:**
- Registry pattern abstracts provider selection
- All providers implement same interface: `generateText(prompt, settings)`
- Support for 5 providers: Gemini, OpenAI, Local,  Ollama, LMStudio
- Error handling with user-friendly messages

**Summarization Strategy:**
- Normal content: single API request
- Long transcripts (8000+ chars): chunking + synthesis approach
- Deep-dive follow-ups reuse saved summary + conversation history
- No streaming; results fully buffered before display

**UI Rendering:**
- Details of Video displays immediately after Summary (before Key Takeaways)
- Collapsible sections for Main Points, Breakdown, Commentary, Details of Video
- All sections hidden until content populated
- Markdown rendering for rich formatting support

## Recent Changes (v1.2.0)

1. **Increased Content Length**: MAX_CONTENT_LENGTH raised from 18,000 to **50,000 characters**
2. **Details of Video Section**: New 7th parsed section for YouTube-specific information
3. **Enhanced YouTube Extraction**: Captures video duration, channel, publish date, transcript language, chapters
4. **Improved UI Rendering**: Details of Video displays as expanded section after Summary
5. **Expanded Parsing**: lib/cleaners.js extracts videoDetails from AI output using heading patterns
