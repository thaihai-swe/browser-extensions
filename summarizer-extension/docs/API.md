# API

This document covers the extension-internal message types and the main data objects used between the content script, background worker, storage, and side panel.

## Message Types

Defined in [lib/messages.js](/lib/messages.js):

```js
{
  SUMMARIZE_ACTIVE_TAB,
  EXTRACT_CONTENT,
  FETCH_COURSE_CONTENT,
  SUMMARY_UPDATED,
  SUMMARY_ERROR,
  GET_ACTIVE_TAB_RESULT,
  GET_ACTIVE_TAB_WORKFLOW,
  GET_RESULT_FOR_TAB,
  CLEAR_TAB_DATA,
  OPEN_SIDE_PANEL,
  DEEP_DIVE_ACTIVE_TAB,
  SETTINGS_UPDATED
}
```

## Main Message Flows

### `SUMMARIZE_ACTIVE_TAB`

**Direction:** Side panel → Background

Request:
```js
{
  type: "SUMMARIZE_ACTIVE_TAB",
  mode: "summarize" // optional, default: "summarize"
}
```

Response:
```js
{
  ok: true,
  result: { ...summaryResult }  // see Summary Result Object below
}
```

Error response:
```js
{
  ok: false,
  error: "error message"
}
```

**Flow:**
1. Side panel sends `SUMMARIZE_ACTIVE_TAB` to background
2. Background requests extraction via `EXTRACT_CONTENT` or `FETCH_COURSE_CONTENT`
3. Content script returns extracted source object
4. Background builds prompt and calls provider
5. Background parses response and saves result
6. Background responds with parsed summary

### `EXTRACT_CONTENT`

**Direction:** Background → Content script

Request:
```js
{
  type: "EXTRACT_CONTENT"
}
```

Response:
```js
{
  ok: true,
  data: { ...extractedSource }  // see Extracted Content Object below
}
```

**Extraction Order:**
1. Selected text
2. YouTube transcript
3. Course content (Coursera/Udemy)
4. Webpage content

### `FETCH_COURSE_CONTENT`

**Direction:** Background → Content script

Used for dedicated course lesson extraction on supported URLs:

Request:
```js
{
  type: "FETCH_COURSE_CONTENT"
}
```

Response:
```js
{
  ok: true,
  data: { ...courseSource }
}
```

**Supported URLs:**
- `udemy.com/course/.../learn/...`
- `coursera.org/learn/.../lecture/...`
- `coursera.org/learn/.../supplement/...`

### `DEEP_DIVE_ACTIVE_TAB`

**Direction:** Side panel (chat input) → Background

Request:
```js
{
  type: "DEEP_DIVE_ACTIVE_TAB",
  question: "What are the key takeaways?"
}
```

Response:
```js
{
  ok: true,
  result: {
    question: "What are the key takeaways?",
    answer: "...",
    type: "user-question",
    timestamp: "2026-04-12T..."
  }
}
```

### `GET_ACTIVE_TAB_RESULT`

**Direction:** Side panel → Background

Request:
```js
{
  type: "GET_ACTIVE_TAB_RESULT"
}
```

Response:
```js
{
  ok: true,
  result: { ...summaryResult }  // null if no result for current tab
}
```

### `GET_ACTIVE_TAB_WORKFLOW`

**Direction:** Side panel → Background

Request:
```js
{
  type: "GET_ACTIVE_TAB_WORKFLOW"
}
```

Response:
```js
{
  ok: true,
  result: {
    phase: "extracting" | "summarizing" | "completed" | "failed",
    tabId: number,
    updatedAt: "2026-04-12T..."
  }
}
```

### `GET_RESULT_FOR_TAB`

**Direction:** Background-internal or UI → Background

Request:
```js
{
  type: "GET_RESULT_FOR_TAB",
  tabId: number
}
```

Response:
```js
{
  ok: true,
  result: { ...summaryResult }  // null if no result for tab
}
```

### `CLEAR_TAB_DATA`

**Direction:** Side panel → Background

Clears result, conversation, and workflow state for a tab.

Request:
```js
{
  type: "CLEAR_TAB_DATA"
}
```

Response:
```js
{
  ok: true
}
```

### Broadcasting Messages

These messages are sent by the background to all side panels:

**`SUMMARY_UPDATED`** - Sent when a new summary is saved

```js
{
  type: "SUMMARY_UPDATED",
  tabId: number,
  result: { ...summaryResult }
}
```

**`SUMMARY_ERROR`** - Sent when summarization fails

```js
{
  type: "SUMMARY_ERROR",
  tabId: number,
  error: "error message"
}
```

**`SETTINGS_UPDATED`** - Sent when settings change

```js
{
  type: "SETTINGS_UPDATED",
  settings: { ...newSettings }
}
```

## Extracted Content Object

All extractors return a normalized source object with this minimum shape:

```js
{
  sourceType: "youtube" | "webpage" | "course" | "selectedText",
  title: string,
  url: string,
  content: string
}
```

**YouTube additions:**

```js
{
  sourceType: "youtube",
  title: string,
  url: string,
  content: string,
  contentRaw: string,
  contentForPrompt: string,
  transcriptSegments: [
    {
      text: string,
      startSeconds: number,
      startLabel: string  // "[HH:MM:SS]"
    }
  ],
  videoDetails: {
    channelName: string,
    durationText: string,
    publishDate: string,
    viewCountText: string,
    thumbnailUrl: string,
    description: string,
    chapters: [{ title, startTime }],
    transcriptLanguage: string,
    captionTrackLabel: string,
    hasTimestamps: boolean,
    transcriptFormat: "timestamped" | "default"
  }
}
```

**Course/Webpage:**

```js
{
  sourceType: "course" | "webpage",
  title: string,
  url: string,
  content: string
}
```

**Selected Text:**

```js
{
  sourceType: "selectedText",
  title: string,
  url: string,
  content: string
}
```

## Summary Result Object

Built and stored by [lib/background/summary-service.js](/lib/background/summary-service.js):

```js
{
  // Identifiers
  id: string,
  tabId: number,
  generatedAt: string,  // ISO timestamp

  // Source info
  sourceType: "youtube" | "webpage" | "course" | "selectedText",
  title: string,
  url: string,

  // Provider info
  provider: string,  // "gemini" | "openai" | "local"
  providerLabel: string,
  model: string,

  // Settings used
  promptMode: string,

  // Source content (for reference and follow-up)
  sourceContent: string,
  sourceContentRaw: string,
  sourceContentForPrompt: string,

  // YouTube-specific source data
  transcriptSegments: [...],
  videoDetails: {...},

  // Summary output (structured via lib/cleaners.js)
  summary: string,
  keyTakeaways: [string],
  mainPoints: string,
  detailsOfVideo: string,        // NEW: YouTube video timeline and metadata
  detailedBreakdown: string,
  expertCommentary: string,
  followUpQuestions: [string],

  // Raw provider response
  rawText: string
}
```

## Storage Schema

Managed by [lib/storage.js](/lib/storage.js):

**`summarizerSettings`** - Global user preferences
```js
{
  provider: string,
  promptMode: string,
  summarySize: "Short" | "Medium" | "Long",
  summaryLanguage: string,
  summaryTone: string,
  sidepanelFontSize: string,
  customPromptInstructions: string,
  customSystemInstructions: string,
  youtubePromptHint: string,
  webpagePromptHint: string,
  coursePromptHint: string,
  selectedTextPromptHint: string,
  showFloatingUi: boolean,
  generateFollowUpQuestions: boolean,
  // Provider-specific configs
  gemini: { apiKey, model },
  openai: { apiKey, model, baseUrl },
  local: { baseUrl, model, endpointType }
}
```

**`summarizerResultsByTab`** - Results keyed by tab ID
```js
{
  "12345": { ...summaryResult },
  "12346": { ...summaryResult }
}
```

**`summarizerConversationsByTab`** - Q&A history keyed by tab ID
```js
{
  "12345": [
    { question: "...", answer: "...", timestamp: "..." },
    { question: "...", answer: "...", timestamp: "..." }
  ]
}
```

**`summarizerWorkflowByTab`** - Workflow state keyed by tab ID
```js
{
  "12345": {
    phase: "extracting" | "summarizing" | "completed" | "failed",
    tabId: 12345,
    updatedAt: "2026-04-12T..."
  }
}
```

## Provider Interface

Exposed by [lib/provider-registry.js](/lib/provider-registry.js):

```js
const text = await SummarizerProviders.generateText(providerId, prompt, settings)
```

**Parameters:**
- `providerId` - one of: `"gemini"`, `"openai"`, `"local"`
- `prompt` - full prompt string from [lib/prompts/builders.js](/lib/prompts/builders.js)
- `settings` - full settings object from storage

**Returns:**
- Promise that resolves to the complete generated text

**Throws:**
- Error if API key is missing
- Error if provider returns an error response

Provider implementations:
- [lib/providers/gemini.js](/lib/providers/gemini.js)
- [lib/providers/openai.js](/lib/providers/openai.js)
- [lib/providers/local.js](/lib/providers/local.js)
