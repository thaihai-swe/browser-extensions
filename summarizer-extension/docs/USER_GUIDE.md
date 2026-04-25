# User Guide

Welcome to the Lightweight Summarizer extension! This guide walks you through features, setup, and common use cases.

## What's This Extension For?

The Lightweight Summarizer uses AI to create quick summaries of content you're reading:

- 🎥 **YouTube videos** - summarize entire videos from the transcript
- 📄 **Web articles** - condense blog posts, news, documentation
- 🎓 **Course lessons** - understand Udemy and Coursera lessons faster
- ✂️ **Text snippets** - summarize any highlighted text

Then ask follow-up questions to dive deeper.

## Getting Started

### 1. Install an AI Provider

Choose one:

- **Gemini** (free credits, then paid) → [Get API key](https://aistudio.google.com)
- **OpenAI** (paid) → [Get API key](https://platform.openai.com)
- **Local LLM** (free, self-hosted) → [Setup guide](#local-llm-setup)

### 2. Load the Extension

1. Go to `chrome://extensions/`
2. Turn on **Developer mode** (top right)
3. Click **Load unpacked**
4. Select this project folder

### 3. Configure Your Provider

1. Click the extension icon (top right of Chrome)
2. Open **Options** (or ⚙️ settings)
3. Select your provider
4. Paste your API key
5. **Save**

✅ Done! Now summarize any page.

## Basic Usage Workflow

### For Web Articles & News

1. Open any article or blog post
2. Click the extension icon (top right) → **Open side panel**
   - Or press **default keyboard shortcut**
3. Click **Generate Summary**
4. Review your summary tabs:
   - Summary
   - Key Takeaways
   - Main Points
   - Detailed Breakdown
   - Expert Commentary
5. (Optional) Ask follow-up questions in **Deep Dive Chat**

### For YouTube Videos

1. Open a YouTube `watch` or `live` page
2. Open the side panel
3. Click **Generate Summary**
4. The extension reads the video transcript and creates a summary
5. Click **Transcript Tools** if you want
   - Copy timestamps
   - Export transcript

### For Course Lessons

**Supported platforms:**
- Coursera lecture pages (`.../lecture/...` or `.../supplement/...`)
- Udemy lesson pages

1. Navigate to a supported lesson page
2. Open the side panel
3. Click **Generate Summary**
4. Review the lesson summary

### For Selected Text

1. Highlight any text on any page
2. Open the side panel
3. Click **Generate Summary**
4. The extension summarizes **only your selection**

## Features in Detail

### Summary Modes

Change how summarization works:

- **Summarize** - neutral overview
- **Analyze** - critical thinking, pros/cons
- **Explain** - break concepts into simple ideas
- **Debate** - multiple perspectives

Select a mode before generating.

### Customize Results

In **Options**:

- **Size**: Brief / Medium / Deep
- **Tone**: Simple / Expert / Academic / Professional / Friendly
- **Temperature**: 0.0 to 2.0 for more stable vs more creative output
- **Language**: English, Spanish, French, etc.
- **Custom instructions**: Add your own rules
  - Example: "Focus on actionable steps"
  - Example: "Use bullet points only"

The extension starts with built-in instruction defaults in the Prompts tab. You can keep them, edit them, or clear them entirely.

### Deep Dive Chat

After generating a summary:

1. Scroll to **Deep Dive Chat**
2. Type any follow-up question
3. Press Enter
4. The AI answers based on the original content + conversation history

**Examples:**
- "Can you explain the technical terms?"
- "What are the most controversial points?"
- "How does this compare to [related topic]?"

### Export Results

Copy your summary:

1. Find your summary
2. Click **Export** (or 📋)
3. Choose format:
   - **Markdown** - best for note-taking apps
   - **Plain Text** - copy/paste anywhere

## How Results Are Stored

- **Saved per tab** - each browser tab keeps its own summary
- **Your privacy** - stored locally on your computer
- **Auto-cleared** - closing a tab removes its summary data
- **Clear manually** - click **Clear** to remove current tab's summary

## Troubleshooting

### "No usable content found"

This happens when:
- The page is blocked or protected (PDF, paywalls)
- The page has no readable text
- The extension can't access the content

**Try:**
- Open the page in a normal Chrome tab (not incognito)
- Try a different page
- Check that cookies/permissions are allowed

### "API key is missing"

You haven't configured your provider yet.

**Fix:**
1. Click extension icon → **Options**
2. Select a provider (Gemini, OpenAI, or Local)
3. Paste your API key
4. **Save**

### "Provider error"

Your API key might be:
- Invalid or expired
- Out of quota / credits
- For the wrong provider

**Fixes:**
- Verify your API key is correct
- Check account balance/credits
- Try a different provider
- Check your API provider's status page

### Results look incomplete

The AI might not have generated all sections. This is normal for:
- Short articles
- Simple content
- Low or Short size setting

Click **Deep Dive Chat** to ask for more detail.

### Side panel won't open

Try:
1. Reload the extension: `chrome://extensions/` → refresh ♻️
2. Check that the extension is **enabled** (blue toggle)
3. Open a new tab and try again

### YouTube transcript not working

YouTube transcripts use:
- Manual captions (preferred)
- Auto-generated captions (fallback)

**If no transcript appears:**
- The video may not have transcripts available
- Try a different video
- Check if CC (closed captions) is on at YouTube

## Common Questions

### Can I use this offline?

Only with the **Local LLM** provider. You need a local model server running (like Ollama).

Paid providers (Gemini, OpenAI) require internet.

### Can I summarize PDFs?

Not directly. But:
1. Copy the PDF text
2. Paste into a text editor
3. Select and summarize

Or upload to a cloud service and summarize from there.

### Is my data sent to the AI provider?

Yes:
- **Extracted content** → sent to your chosen provider (Gemini, OpenAI, etc.)
- **Results** → stored locally on your computer
- **Never stored** by the extension; only by your provider

Check your provider's privacy policy:
- [Google Gemini Privacy](https://ai.google.dev/privacy)
- [OpenAI Privacy](https://openai.com/privacy)

### Can I use multiple providers?

Yes! Configure all three (Gemini, OpenAI, Local) in **Options**, then choose which to use before summarizing.

### How many summaries can I create?

Depends on your provider:
- **Gemini** - free tier has rate limits; paid is $0.01-0.075 per 1M tokens
- **OpenAI** - paid per token used
- **Local LLM** - unlimited (self-hosted)

### Can I edit summaries?

Not yet. Results are read-only. Copy to an editor if you need to make changes.

### How do I uninstall?

1. Go to `chrome://extensions/`
2. Find "Lightweight Summarizer"
3. Click **Remove** (trash icon)

## Tips & Tricks

**Make better summaries:**
- Use **Custom instructions** for your style
- Try different **modes** (analyze, explain, debate)
- Ask **specific follow-up questions** in Deep Dive Chat
- Set **Language** and **Tone** before generating

**Save time:**
- Summarize before reading (preview)
- Export to notion / note-taking app
- Use in research workflow (quick content review)

**Local LLM users:**
- See [SETUP.md](docs/SETUP.md#local) for config
- Faster (no internet) but needs setup
- Best for privacy-first workflows

## Getting Help

**Check documentation:**
- [SETUP.md](docs/SETUP.md) - Provider configuration details
- [ARCHITECTURE.md](docs/ARCHITECTURE.md) - How the extension works

**Report bugs:**
- Check console for errors (`F12` → Console)
- Save error messages
- Contact extension creator

## Next Steps

👉 see [SETUP guide](docs/SETUP.md) for detailed provider configuration
