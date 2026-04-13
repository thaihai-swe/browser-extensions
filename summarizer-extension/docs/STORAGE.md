# Storage & Data Management

This document explains how data is stored, queried, and cleaned up in the extension.

## Storage Overview

The extension uses Chrome's `chrome.storage.local` API for persistence:

- **Type**: Local machine only (not synced to cloud)
- **Size**: Up to 10MB per extension
- **Access**: From background and content scripts
- **Privacy**: User's machine only, not accessible by other extensions

**Wrapper:** [lib/storage.js](/lib/storage.js) provides the main interface.

## Storage Keys

Four main storage keys manage all extension data:

### 1. Settings (`summarizerSettings`)

**Purpose:** User preferences that apply globally

**Type:** Single object (not keyed by tab)

**Schema:**

```js
{
  // Core settings
  provider: "gemini" | "openai" | "local",
  promptMode: "summarize" | "analyze" | "explain" | "debate",
  summarySize: "Short" | "Medium" | "Long",
  summaryLanguage: "English" | "Spanish" | ... (any language),
  summaryTone: "Simple" | "Professional" | "Casual",
  sidepanelFontSize: "12" | "14" | "16" | ... (string, CSS-compatible),

  // Custom instructions
  customPromptInstructions: string,
  customSystemInstructions: string,

  // Source-specific hints
  youtubePromptHint: string,
  webpagePromptHint: string,
  coursePromptHint: string,
  selectedTextPromptHint: string,
  analyzePromptHint: string,
  explainPromptHint: string,
  debatePromptHint: string,

  // UI settings
  showFloatingUi: boolean,
  generateFollowUpQuestions: boolean,

  // Provider configurations (nested objects)
  gemini: {
    apiKey: string,
    model: string
  },
  openai: {
    apiKey: string,
    model: string,
    baseUrl: string
  },
  local: {
    baseUrl: string,
    model: string,
    endpointType: "ollama" | "openai"
  }
}
```

**Access Functions:**
```js
// Get all settings (merged with defaults)
const settings = await SummarizerStorage.getSettings()

// Save partial settings (deep merged)
const updated = await SummarizerStorage.saveSettings({
  summarySize: "Long",
  gemini: { apiKey: "..." }
})
```

**Default Values:**
```js
{
  provider: "gemini",
  promptMode: "summarize",
  summarySize: "Medium",
  summaryLanguage: "English",
  summaryTone: "Simple",
  sidepanelFontSize: "14",
  customPromptInstructions: "",
  customSystemInstructions: "",
  youtubePromptHint: "",
  // ... (all hints default to "")
  showFloatingUi: false,
  generateFollowUpQuestions: true,
  gemini: { apiKey: "", model: "gemini-3.1-flash-lite-preview" },
  openai: { apiKey: "", model: "gpt-4o-mini", baseUrl: "https://api.openai.com/v1" },
  local: { baseUrl: "http://127.0.0.1:11434", model: "llama3.1", endpointType: "ollama" }
}
```

### 2. Results by Tab (`summarizerResultsByTab`)

**Purpose:** Cached summary results for each browser tab

**Type:** Object with tab IDs as keys

**Schema per Result:**

```js
{
  "12345": {  // tab ID as string key
    // Identifiers
    id: "uuid-string",
    tabId: 12345,
    generatedAt: "2026-04-12T10:30:00.000Z",

    // Source info
    sourceType: "youtube" | "webpage" | "course" | "selectedText",
    title: "Page Title",
    url: "https://...",

    // Provider info
    provider: "gemini" | "openai" | "local",
    providerLabel: "Gemini" | "OpenAI" | "Local LLM",
    model: "gemini-3.1-flash-lite...",

    // Settings snapshot
    promptMode: "summarize",

    // Source content (for reference in follow-ups)
    sourceContent: "extracted text...",
    sourceContentRaw: "raw extracted text...",
    sourceContentForPrompt: "formatted for prompt...",

    // YouTube-specific (if sourceType === "youtube")
    transcriptSegments: [
      { text: "hello", startSeconds: 0, startLabel: "[00:00]" },
      { text: "world", startSeconds: 5, startLabel: "[00:05]" }
    ],
    videoDetails: {
      channelName: "...",
      durationText: "10:35",
      publishDate: "2026-02-15",
      viewCountText: "1.2M",
      thumbnailUrl: "https://...",
      description: "...",
      chapters: [{ title: "intro", startTime: 0 }],
      transcriptLanguage: "en",
      captionTrackLabel: "English (auto-generated)",
      hasTimestamps: true,
      transcriptFormat: "timestamped"
    },

    // Summary output
    summary: "This video discusses...",
    keyTakeaways: [
      "Point 1",
      "Point 2",
      "Point 3"
    ],
    mainPoints: "The main points are:\n1. ...\n2. ...",
    detailedBreakdown: "Going deeper,...",
    expertCommentary: "From a deeper analysis perspective...",
    followUpQuestions: [
      "How does X relate to Y?",
      "What's the practical application?"
    ],

    // Raw provider response (for debugging)
    rawText: "full response from provider..."
  },
  "12346": { ... },
  "12347": { ... }
}
```

**Size Note:**
- Results are stored per tab
- Each result can be 50KB-500KB depending on content size
- Typical storage for 10 tabs: 1-5MB

**Access Functions:**
```js
// Get all results
const allResults = await SummarizerStorage.getResultsByTab()

// Get result for specific tab
const result = await SummarizerStorage.getResultForTab(tabId)

// Save result for tab (replaces existing)
await SummarizerStorage.saveResultForTab(tabId, result)

// Remove result for tab
await SummarizerStorage.removeResultForTab(tabId)
```

### 3. Conversations by Tab (`summarizerConversationsByTab`)

**Purpose:** Follow-up Q&A history for each tab

**Type:** Object with tab IDs as keys, each containing array of messages

**Schema:**

```js
{
  "12345": [
    {
      question: "What are the main points?",
      answer: "The main points are...",
      type: "user-question",
      timestamp: "2026-04-12T10:35:00.000Z"
    },
    {
      question: "Can you elaborate?",
      answer: "Sure, by elaborate I mean...",
      type: "user-question",
      timestamp: "2026-04-12T10:36:00.000Z"
    }
  ],
  "12346": [
    // ...
  ]
}
```

**Behavior:**
- New Q&A messages appended to array
- Generating new summary clears this tab's conversation
- Used in deep-dive prompts to maintain context

**Size Note:**
- Each message pair: 500B - 5KB
- Typical conversation: 10-50 messages
- Per-tab storage: 50KB-250KB

**Access Functions:**
```js
// Get conversation for tab
const messages = await SummarizerStorage.getConversationForTab(tabId)

// Add message to conversation
const updated = await SummarizerStorage.addMessageToConversation(tabId, {
  question: "...",
  answer: "..."
})

// Save entire conversation (replaces)
await SummarizerStorage.saveConversationForTab(tabId, messages)

// Clear conversation for tab
await SummarizerStorage.clearConversationForTab(tabId)
```

### 4. Workflow State by Tab (`summarizerWorkflowByTab`)

**Purpose:** Track summarization progress per tab

**Type:** Object with tab IDs as keys

**Schema:**

```js
{
  "12345": {
    phase: "extracting" | "summarizing" | "completed" | "failed",
    tabId: 12345,
    error: "optional error message if failed",
    updatedAt: "2026-04-12T10:30:00.000Z"
  },
  "12346": {
    phase: "completed",
    tabId: 12346,
    updatedAt: "2026-04-12T10:31:00.000Z"
  }
}
```

**Phases:**
- **`extracting`** - Retrieving content from page
- **`summarizing`** - Sending to provider
- **`completed`** - Success, result is saved
- **`failed`** - Error occurred, see error message

**Access Functions:**
```js
// Get state for specific tab
const state = await SummarizerStorage.getWorkflowStateForTab(tabId)

// Save complete state
await SummarizerStorage.saveWorkflowStateForTab(tabId, {
  phase: "summarizing"
})

// Partial update (merges with existing)
await SummarizerStorage.patchWorkflowStateForTab(tabId, {
  phase: "completed"
})

// Clear state for tab
await SummarizerStorage.clearWorkflowStateForTab(tabId)
```

## Data Lifecycle

### Creating a Summary

```
1. User clicks "Generate Summary"
     ↓
2. Workflow state→"extracting"
     ↓
3. Content extracted from page
     ↓
4. Workflow state→"summarizing"
     ↓
5. Provider generates summary
     ↓
6. Result parsed and formatted
     ↓
7. Save result for tab
8. Conversation for tab cleared
9. Workflow state→"completed"
```

### Adding a Follow-up Question

```
1. User types in chat box
     ↓
2. Build deep-dive prompt (uses result + conversation)
     ↓
3. Provider generates answer
     ↓
4. Add message to conversation
     ↓
5. Send response to UI
```

### Tab Closes

```
1. Browser detects tab closed
     ↓
2. Background listener triggers
     ↓
3. Remove result for tab
4. Remove conversation for tab
5. Remove workflow state for tab
```

### User Clears Data

```
1. User clicks "Clear" button
     ↓
2. Call clearTabData(tabId)
     ↓
3. Remove result for tab
4. Remove conversation for tab
5. Remove workflow state for tab
     ↓
6. Side panel resets
```

## Storage Cleanup

### Automatic (Per Tab Close)

When user closes a tab, [lib/background/tab-manager.js](/lib/background/tab-manager.js) calls:

```js
await SummarizerStorage.clearTabData(tabId)
```

This removes:
- Result
- Conversation
- Workflow state

### Periodic (Stale Tab Cleanup)

Background script periodically calls:

```js
const openTabs = await chrome.tabs.query({})
const openTabIds = openTabs.map(t => t.id)
await SummarizerStorage.pruneClosedTabData(openTabIds)
```

This removes data for any closed tab IDs (safety fallback).

**When:** Every ~30-60 seconds

## Common Storage Operations

### Get Result + Conversation + Workflow

```js
const [result, conversation, workflow] = await Promise.all([
  SummarizerStorage.getResultForTab(tabId),
  SummarizerStorage.getConversationForTab(tabId),
  SummarizerStorage.getWorkflowStateForTab(tabId)
])
```

### Deep Merge Settings

User changes one setting:

```js
// Old
{ provider: "gemini", summarySize: "Medium", gemini: { apiKey: "123" } }

// User changes size to Long
await SummarizerStorage.saveSettings({ summarySize: "Long" })

// Result: deep merge
{ provider: "gemini", summarySize: "Long", gemini: { apiKey: "123" } }
```

(Nested objects are merged, not replaced)

### Clear Everything for a Tab

```js
await SummarizerStorage.clearTabData(tabId)
```

Removes result, conversation, and workflow in one call.

## Storage Limits & Optimization

### Current Footprint

- **Settings**: ~5KB (global)
- **Per result**: 50KB - 500KB
- **Per conversation**: 50KB - 250KB
- **Per workflow**: ~1KB

### Typical Usage

- **5 tabs active** with summaries: 500KB - 2.5MB
- **10 deep-dive conversations**: 500KB - 2.5MB
- **Total for heavy user**: ~3-5MB

### Storage Limit

Chrome allows 10MB for extension local storage. At current usage:

- Safe for ~15-20 tabs with summaries + conversations
- No immediate concern for typical users
- Consider cleanup if approaching limit

### Future Optimization

If needed:

- Compress results (gzip)
- Archive old conversations per tab
- Implement size-based eviction (LRU)
- Move results to IndexedDB (higher limit)

## Settings Update Behavior

**Deep merge** is used to prevent data loss:

```js
// Example: User only changes API key
const current = {
  provider: "gemini",
  gemini: { apiKey: "123", model: "flash" },
  openai: { apiKey: "456", model: "gpt-4" }
}

await saveSettings({ gemini: { apiKey: "new-key" } })

// Result: preserves other nested values
{
  provider: "gemini",
  gemini: { apiKey: "new-key", model: "flash" },  // merged!
  openai: { apiKey: "456", model: "gpt-4" }
}
```

## Privacy & Security

**Stored Locally:**
- All data stored on user's computer
- Never sent to cloud
- Survives Chrome reinstall (persistent)

**Source Content:**
- Stored alongside summary for reference
- Used in follow-up prompts
- Cleared when user clears tab data

**API Keys:**
- Stored in plaintext in Chrome storage
- Not synced to cloud
- Readable by extension code (not by other extensions)
- Tip: Users should use different keys on shared computers

**Conversation History:**
- Stored locally
- Visible only in this extension
- Cleared when tab closes

## Debugging Storage

### View Storage Contents

In extension background console:

```js
// View all settings
chrome.storage.local.get(["summarizerSettings"], (data) => {
  console.log(data.summarizerSettings)
})

// View all results
chrome.storage.local.get(["summarizerResultsByTab"], (data) => {
  console.log(data.summarizerResultsByTab)
})

// View specific tab result
const tabId = 12345
chrome.storage.local.get(["summarizerResultsByTab"], (data) => {
  console.log(data.summarizerResultsByTab[String(tabId)])
})
```

### Clear All Storage

```js
chrome.storage.local.clear(() => {
  console.log("Storage cleared")
})
```

⚠️ **Warning:** This removes all extension data!

### Monitor Storage Changes

```js
chrome.storage.local.onChanged.addListener((changes, area) => {
  console.log("Storage changed:", changes)
})
```
