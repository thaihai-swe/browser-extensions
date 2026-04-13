# Prompts

## Overview

The prompt system generates context-aware summaries based on source type, summary size, mode, tone, and language settings.

**Key File:** [lib/prompts.js](/lib/prompts.js)

Exports:
- `buildSummaryPrompt(context, settings)` - generates summary prompts for initial summarization
- `buildDeepDivePrompt(savedResult, question, settings)` - generates prompts for follow-up questions

All prompts follow a consistent contract with the parser:

1. **Fixed section headings** (case-insensitive): Summary, Key Takeaways, Main Points, Details of Video, Detailed Breakdown, Expert Commentary, Follow-up Questions
2. **Output format** that lib/cleaners.js can parse by regex pattern matching headings
3. **Content-aware requirements** for each source type (YouTube, webpage, course, selected text)
4. **Shared rules** for tone, size, language, safety, and source grounding

## Parser-Safe Sections

These are the 7 fixed sections the parser recognizes:

| Section | Format | Content | For |
|---------|--------|---------|-----|
| **Summary** | Paragraph(s) | Main ideas, key arguments, conclusions | All |
| **Key Takeaways** | Bullet list | 3-8 concise, actionable insights | All |
| **Main Points** | Paragraph(s) or bullets | Major topics and supporting details | YouTube, Long Content |
| **Details of Video** | Bullets with ### hierarchy | Timeline segments with timestamps and specifics | YouTube **[NEW]** |
| **Detailed Breakdown** | Paragraph(s) with structure | Deep dive into arguments, evidence, context | Medium/Deep sizes |
| **Expert Commentary** | Paragraph(s) | Analysis, strengths/weaknesses, implications | Medium/Deep sizes |
| **Follow-up Questions** | Bullet list | 3-5 questions to deepen understanding | If enabled |

Parser validates headings with regex patterns in [lib/cleaners.js](/lib/cleaners.js):
- `/^summary$/i`
- `/^(key )?takeaways?$/i`
- `/^(main|key) points?$/i`
- `/^(details? of (the )?video|video details?|timeline|video timeline)$/i` **[NEW]**
- `/^(detailed )?breakdown$/i`
- `/^(expert )?(commentary|analysis|insights?)$/i`
- `/^(suggested )?follow[- ]?up questions?$/i`

## Prompt Structure

All prompts follow this envelope:

```
1. ROLE - who the AI is (expert summarizer, analyzer, etc.)
2. SAFETY GUARDRAILS - prevent jailbreaks, stay grounded
3. BASE OUTPUT RULES - no filler, grounded in content only
4. SOURCE CONTEXT - what kind of content (YouTube transcript, webpage, etc.)
5. GROUNDING RULES - cite sources, preserve details
6. TASK INSTRUCTIONS - what to accomplish (summarize, analyze, explain, debate)
7. OUTPUT STRUCTURE - section plan with exact headings
8. CONTENT BLOCK - the actual text to summarize
```

## Settings Applied

The prompt builder applies user settings from Chrome storage:

| Setting | Values | Default | Impact |
|---------|--------|---------|--------|
| `promptMode` | summarize, analyze, explain, debate | summarize | Changes task goal |
| `summarySize` | brief, normal, deep | normal | Changes content coverage |
| `summaryTone` | simple, professional, academic, expert, friendly | simple | Changes language style |
| `summaryLanguage` | en, es, fr, de, ja, zh | en | Output language |
| `generateFollowUpQuestions` | true, false | true | Include Follow-up Questions section |

## Source-Specific Guidance

### YouTube

- **Content**: Video transcript (up to 50,000 characters)
- **Key detail**: Preserves timestamps from transcript
- **Special section**: Details of Video with timeline-based bullets
- **Example requirement**: "_Include ### [Topic] [MM:SS] subsections with timestamps for major topics_"

### Webpage

- **Content**: Extracted page text with semantic markers
- **Key detail**: Emphasizes evidence, claims, context
- **Special section**: Main Points for topic organization
- **Example requirement**: "_Focus on claims with supporting evidence and important context_"

### Course

- **Content**: Lesson text or transcript (Coursera, Udemy)
- **Key detail**: Emphasizes definitions, concepts, examples for learning
- **Special section**: Main Points for concept organization
- **Example requirement**: "_Use definitions, examples, and practical applications suitable for learning_"

### Selected Text

- **Content**: User-highlighted text only
- **Key detail**: Tightly grounded in the excerpt
- **Special section**: Summary and Key Takeaways only
- **Example requirement**: "_Summarize only the highlighted text faithfully without adding context_"

## Recent Changes (v1.2.0)

1. **New Details of Video Section**: Specifically for YouTube videos to capture:
   - Timeline-based organization with timestamps
   - Major topics and segments
   - Technical details and examples
   - Video-specific metadata

2. **Increased Context**: MAX_CONTENT_LENGTH increased from 18,000 to 50,000 characters
   - Allows fuller YouTube transcripts
   - Provides better context for comprehensive summaries

3. **AI Output Format Updated**: Prompts now require ```## Details of Video``` section for YouTube
   - Parser recognizes "Details of the Video", "Video Details", "Timeline", "Video Timeline"
   - Content renders below Summary, before Key Takeaways

4. **Parsing Enhancement**: lib/cleaners.js now extracts videoDetails field
   - Stored in result object for later use
   - Exported to Markdown and text formats

## Example Output Format

The AI is expected to return output structured like this:

```
## Summary
[1-3 paragraphs covering the main ideas and conclusions]

## Key Takeaways  
- First key insight with emoji
- Second key insight with emoji
- [3-8 total bullets]

## Main Points
[Organized by topic with bullets or structure]

## Details of Video
### Section 1 [MM:SS]
- Detail with numbers and examples
- Technical term explanation
###

## Shared Model

### 1. Routing

`buildSummaryPrompt(context, settings)` chooses a source-specific template based on `context.sourceType`.

`buildChunkSummaryPrompt(context, chunk, index, total, settings)` and `buildSynthesisPrompt(context, chunkSummaries, settings)` route to the same source family so long-content prompts stay source-aware.

`buildDeepDivePrompt(context, question, settings)` now uses the same shared prompt envelope instead of a one-off flat prompt.

### 2. Shared Envelope

`buildPromptEnvelope(...)` assembles prompts in this order:

1. role
2. safety and base output rules
3. source context
4. grounding rules
5. task instructions
6. section plan and strict section contract
7. optional custom/source/mode hints
8. details and content blocks

### 3. Instruction Precedence

The prompt now states the intended precedence explicitly:

1. safety and grounding rules
2. section contract
3. source-specific task rules
4. mode guidance
5. optional custom instructions

This makes advanced customization more predictable.

## Section Plans

Top-level summary prompts generate output following a strict section contract.

Parser-safe section headings are exactly:

- `Summary`
- `Key Takeaways`
- `Main Points`
- `Details of the Video` (YouTube only) **[NEW]**
- `Detailed Breakdown`
- `Expert Commentary`
- `Follow-up Questions`

The section contract tells the model:

- use exactly these top-level sections in this order
- do not add other top-level sections
- write `None.` if a section has no meaningful content
- keep `Key Takeaways` and `Follow-up Questions` as bullets only
- use `### Topic [MM:SS]` subsections only inside `Details of the Video`

This contract is important because [lib/cleaners.js](/lib/cleaners.js) parses the model response by matching these exact heading patterns.

## Source Templates

### YouTube

Primary characteristics:

- grounded in transcript plus video metadata
- preserves timestamps only when they exist in transcript or chapter metadata
- uses `Details of the Video` as the rich timeline section

Long YouTube transcripts use:

- chunk prompt with `Chunk Summary`, `Key Evidence`, `Details of the Video`
- synthesis prompt that returns to the normal parser-facing section plan

### Webpage

Primary characteristics:

- grounded in extracted page content only
- emphasizes claims, evidence, and important context
- chunk prompts use `Chunk Summary`, `Key Evidence`, `Open Questions`

### Course

Primary characteristics:

- grounded in lesson text or transcript
- emphasizes definitions, concepts, examples, and learner retention
- chunk prompts use `Chunk Summary`, `Key Concepts`, `Learning Signals`

### Selected Text

Primary characteristics:

- tightly grounded in the selected excerpt
- no custom non-parser section names anymore
- uses the same parser-safe section plan as other summary types

## Modes

Supported modes:

- `summarize`
- `analyze`
- `explain`
- `debate`
- `study`
- `outline`
- `timeline`

Modes no longer inject duplicate free-text sections. Instead they modify:

- primary goal
- task augmentations
- section-specific guidance for existing parser-safe headings

This avoids heading drift and duplicated sections like the old `extraSection` model.

## Deep Dive Prompt

Follow-up answers now use a structured contract too:

- `Answer`
- `Evidence From Source`
- `Caveats / Open Questions`

The deep-dive prompt includes:

- current summary fields
- recent conversation history
- capped raw source content
- source-specific grounding guidance

## Chunk and Synthesis Prompts

Chunk and synthesis prompts now share the same envelope system as main prompts. That means they inherit:

- safety rules
- grounding rules
- mode guidance
- custom/source hints
- explicit section contracts

This was a major improvement over the older ad hoc chunk prompts.

## Settings That Influence Prompts

Prompt generation uses settings from [lib/storage.js](/Users/haint/Desktop/summarizer-extension/lib/storage.js):

- `promptMode`
- `summarySize`
- `summaryLanguage`
- `summaryTone`
- `generateFollowUpQuestions`
- `customSystemInstructions`
- `customPromptInstructions`
- source hints:
  - `youtubePromptHint`
  - `webpagePromptHint`
  - `coursePromptHint`
  - `selectedTextPromptHint`
- mode hints:
  - `analyzePromptHint`
  - `explainPromptHint`
  - `debatePromptHint`
  - `studyPromptHint`
  - `outlinePromptHint`
  - `timelinePromptHint`

## Output Parsing

[lib/cleaners.js](/lib/cleaners.js) parses AI output into a structured result:

```js
{
  rawText: string,
  summary: string,
  keyTakeaways: string[],
  mainPoints: string,
  detailsOfVideo: string,       // NEW: YouTube timeline details
  detailedBreakdown: string,
  expertCommentary: string,
  followUpQuestions: string[]
}
```

**Parsing process:**

1. Normalize heading text (lowercase, remove extra spaces)
2. Match heading patterns using regex in `resolveSection()`
3. Accumulate lines under current section until next heading
4. Clean and format final section text
5. Return structured object

**Detailing of Video**:  
- Only populated for YouTube summaries
- Contains timeline-based information with timestamps
- Usually contains `### Topic [MM:SS]` subsections
- Exported to both Markdown and plain text formats

The parser remains heading-based, so keeping prompt headings stable is critical.

## Prompt Snapshots

Use the snapshot utility to inspect generated prompts quickly:

```bash
node scripts/print-prompt-snapshots.js
```

It prints representative prompts for:

- YouTube summary
- YouTube chunk
- YouTube synthesis
- webpage summary
- course summary
- selected-text summary
- deep-dive follow-up

This is the easiest regression check after changing prompt logic.
