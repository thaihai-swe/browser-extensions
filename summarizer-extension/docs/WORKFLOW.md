# Workflow

## Summary Generation Flow (Main Path)

```mermaid
sequenceDiagram
    participant Panel as Side Panel
    participant BG as Background
    participant Tab as Active Tab
    participant CS as Content Script
    participant AI as Provider
    participant Store as Storage

    Panel->>BG: SUMMARIZE_ACTIVE_TAB
    BG->>BG: get active tab + settings
    BG->>BG: mark workflow = extracting
    BG->>Tab: sendMessage(EXTRACT_CONTENT or FETCH_COURSE_CONTENT)
    Tab->>CS: receive message
    CS-->>BG: extracted source object
    BG->>BG: mark workflow = summarizing
    BG->>BG: check content length
    alt short content
        BG->>BG: buildSummaryPrompt()
        BG->>AI: generateText(prompt)
        AI-->>BG: full response
    else long content
        BG->>BG: split into chunks
        loop for each chunk
            BG->>BG: buildChunkSummaryPrompt()
            BG->>AI: generateText(chunkPrompt)
            AI-->>BG: chunk summary
        end
        BG->>BG: buildSynthesisPrompt()
        BG->>AI: generateText(synthesisPrompt)
        AI-->>BG: final synthesis
    end
    BG->>BG: parseStructuredSummary()
    BG->>Store: saveResultForTab()
    BG->>Store: clearConversationForTab()
    BG->>BG: mark workflow = completed
    BG-->>Panel: summary response
```

## Error Handling Flow

```mermaid
sequenceDiagram
    participant Panel as Side Panel
    participant BG as Background
    participant Tab as Active Tab
    participant AI as Provider
    participant Store as Storage

    Panel->>BG: SUMMARIZE_ACTIVE_TAB
    Note over BG: extraction phase
    alt extraction fails
        BG->>BG: catch error
        BG->>BG: mark workflow = failed
        BG-->>Panel: error response
    else extraction succeeds
        Note over BG: summarization phase
        alt API key missing
            BG->>BG: catch validation error
            BG->>BG: mark workflow = failed
            BG-->>Panel: config error
        else provider error
            BG->>BG: catch provider error
            BG->>BG: mark workflow = failed
            BG-->>Panel: provider error
        else success
            BG->>Store: saveResultForTab()
            BG->>BG: mark workflow = completed
            BG-->>Panel: result
        end
    end
```

## Workflow Phases

Workflow state is stored per tab and tracks the current phase:

- **`extracting`** - Content is being retrieved from the page
- **`summarizing`** - Content is being sent to the LLM provider
- **`completed`** - Summary generation succeeded, result is saved
- **`failed`** - An error occurred during extraction or summarization

The workflow state also includes:
- `tabId` - which tab this workflow is for
- `updatedAt` - ISO timestamp of last phase change

Phase transitions:
```
not-set → extracting → summarizing → completed
                           ↓
                        failed (error)
```

## Content Extraction Decision Order

[lib/extractors.js](/lib/extractors.js) checks for content in this priority order:

1. **Selected text** - if user has text selected on the page
2. **YouTube** - if URL matches YouTube watch/live pages
3. **Course** - if URL matches Coursera/Udemy lesson patterns
4. **Webpage** - generic DOM-based extraction as fallback

The background layer ([lib/background/tab-manager.js](/lib/background/tab-manager.js)) can also send `FETCH_COURSE_CONTENT` directly for:

- `udemy.com/course/.../learn/...`
- `coursera.org/learn/.../lecture/...`
- `coursera.org/learn/.../supplement/...`

This direct route bypasses the generic extraction dispatcher and goes straight to course-specific handling.

## Webpage Flow

```mermaid
graph TD
    A[document.body] --> B[remove noisy nodes]
    B --> C[semantic page text]
    B --> D[visible readable blocks]
    B --> E[accessibility-like important sections]
    B --> F[full page text]
    G[title + meta description] --> H[primary candidates]
    C --> H
    D --> H
    E --> H
    F --> H
    B --> I[accessibility-tree fallback]
    H --> J[pick primary candidate]
    I --> K[compare quality]
    J --> K
    K --> L[choose best content]
    L --> M[truncate and return webpage extraction]
```

## YouTube Flow

```mermaid
graph TD
    A[watch/live page] --> B[get player response + initial data]
    B --> C[rank caption tracks]
    C --> D[fetch transcript JSON]
    D -->|fallback| E[fetch transcript XML]
    D --> F[normalize transcript segments]
    E --> F
    F --> G[build timestamped transcript]
    B --> H[extract metadata and chapters]
    G --> I[return youtube extraction]
    H --> I
    C -->|caption fetch fails| J[DOM transcript fallback]
    J --> F
```

## Course Flow

```mermaid
graph TD
    A[Course lesson URL] --> B[FETCH_COURSE_CONTENT]
    B --> C[Coursera selectors]
    B --> D[Udemy transcript panel]
    C --> E[extract transcript or reading content]
    D --> F[extract transcript cues]
    E --> G[clean and retry if needed]
    F --> G
    G --> H[return course extraction]
```

## Deep-Dive Flow

```mermaid
sequenceDiagram
    participant Panel as Side Panel
    participant BG as Background
    participant Store as Storage
    participant AI as Provider

    Panel->>BG: DEEP_DIVE_ACTIVE_TAB(question)
    BG->>Store: get result for tab
    BG->>Store: get conversation for tab
    BG->>BG: buildDeepDivePrompt()
    BG->>AI: generateText()
    AI-->>BG: answer
    BG->>Store: append conversation
    BG-->>Panel: answer
```

## Request Strategy

### Single-Request Path (Most Common)

- YouTube: short/normal transcript (< threshold)
- Webpage: normal-sized articles, docs, blogs
- Course: typical lesson pages
- Selected text: any selection

### Multi-Request Path (Long Content)

For very long YouTube transcripts:

1. **Chunk Phase**
   - Split content into chunks (via [lib/background/summary-service.js](/lib/background/summary-service.js))
   - Build chunk-specific prompts for each chunk
   - Send ~2-4 provider requests (one per chunk)
   - Collect chunk summaries

2. **Synthesis Phase**
   - Build synthesis prompt from chunk summaries
   - Send 1 final provider request
   - Parse structured output
   - Save single result with synthesized summary

Total requests: 3-5 depending on content length.

### Provider Request Timeline

```
Single Request:
[extract] ──→ [prompt] ──→ [provider] ──→ [parse] ──→ [save] ─→ [done]
                                (1 req)

Multi Request:
[extract] ──→ [chunks] ──→ [chunk prompts] ──→ [provider] ──→ [synthesis]
                                              (multiple reqs)
                                                      ↓
                                              [provider] (1 more) ──→ [parse] ──→ [save]
```

### Fallback Strategies

**Extraction Fallback (if primary fails):**
- Course extraction fails → webpage extraction
- YouTube transcript fetch fails → DOM scraping
- Webpage semantic extraction fails → accessibility tree fallback

**Provider Fallback:**
- None currently; errors are surfaced to the user for manual retry

## Tab Lifecycle

```
User opens tab
    ↓
[result = null, workflow = null]
    ↓
User summarizes
    ↓
[workflow = extracting]
    ↓
[workflow = summarizing]
    ↓
[result = {...}, workflow = completed]
    ↓
User clicks "Clear"
    ↓
[result = null, conversation = [], workflow = null]
    ↓
User closes tab
    ↓
[all data for tab removed from storage]
```

## Deep-Dive (Follow-Up Q&A) Flow

```mermaid
sequenceDiagram
    participant Panel as Side Panel
    participant BG as Background
    participant Store as Storage
    participant AI as Provider

    Panel->>BG: DEEP_DIVE_ACTIVE_TAB(question)
    BG->>Store: getResultForTab()
    BG->>Store: getConversationForTab()
    alt no saved result
        BG-->>Panel: error
    else has result
        BG->>BG: buildDeepDivePrompt(result, conversation, question)
        BG->>AI: generateText(deepDivePrompt)
        AI-->>BG: answer
        BG->>BG: addMessageToConversation({question, answer})
        BG->>Store: saveConversationForTab()
        BG-->>Panel: answer response
    end
```

Deep-dive prompt includes:
- Current summary
- Key takeaways and main points
- Prior expert commentary
- Last 6 messages from conversation history
- Source content (raw and formatted)
- New user question
- Source-specific guidance (YouTube timestamps, course definitions, etc.)
