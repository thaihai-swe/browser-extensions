# Summary Structure Spec

This spec defines the new end-user summary structure for the extension.

## Goal

The summary output should act as a compressed replacement for the original source.

Target:

- preserve at least 80% of the source's core information value
- let a user skip the original in most cases
- reduce section overlap
- keep one shared structure across webpage, YouTube, course, and selected text

## Canonical User-Facing Structure

1. `Executive Summary`
2. `Key Takeaways`
3. `Core Ideas`
4. `Flow / Structure`
5. `Evidence & Examples`
6. `Nuances & Caveats`
7. `Practical Implications`
8. `Follow-up Questions` when enabled

## Section Responsibilities

### Executive Summary

- dense, readable replacement for the original
- should preserve the main argument or lesson with enough detail to stand alone
- should not be a teaser or shallow overview

### Key Takeaways

- fastest scan
- always bullets
- 4 to 8 high-value points depending on summary size

### Core Ideas

- the major concepts, claims, definitions, or argument pillars
- compact and structured
- should not repeat the full executive summary

### Flow / Structure

- how the source unfolds
- webpage: argument structure or section flow
- course: instructional sequence
- selected text: logic flow of the excerpt
- YouTube: progression or timeline, using timestamps when supported

### Evidence & Examples

- names, numbers, examples, cases, definitions, demonstrations, proof points
- should preserve what gives the source real value

### Nuances & Caveats

- assumptions, tradeoffs, uncertainty, edge cases, limitations, missing context

### Practical Implications

- why it matters
- what to retain
- what changes in practice
- what the user should do with the information

## Backward Compatibility

During migration:

- prompts should emit the new headings
- parser should continue recognizing old headings
- stored results should include both new canonical fields and legacy aliases

Canonical result fields:

- `summary` and `executiveSummary`
- `keyTakeaways`
- `coreIdeas`
- `flowStructure`
- `evidenceExamples`
- `nuancesCaveats`
- `practicalImplications`
- `followUpQuestions`

Legacy aliases preserved during migration:

- `mainPoints` -> same content as `coreIdeas`
- `detailsOfVideo` -> same content as `flowStructure`
- `detailedBreakdown` -> same content as `evidenceExamples`
- `expertCommentary` -> same content as `nuancesCaveats`

## Prompt Rules

Shared prompt rules should explicitly require:

- 80% information-value preservation in medium/deep outputs whenever feasible
- omission of filler and repetition only
- preservation of examples, evidence, names, numbers, definitions, and practical meaning
- minimal overlap between sections
- clear labeling of inference versus source-backed content

## UI Rendering Rules

The side panel should present:

- top cards: `Executive Summary` and `Key Takeaways`
- collapsibles: `Core Ideas`, `Flow / Structure`, `Evidence & Examples`, `Nuances & Caveats`, `Practical Implications`

YouTube transcript tools remain separate from the main summary structure.
