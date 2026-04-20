# Setup Guide

## Installation

### 1. Load the Extension in Chrome

1. Run `./scripts/use-chrome-manifest.sh`
2. **Open Extensions page**: Go to `chrome://extensions/`
3. **Enable Developer Mode**: Click the toggle in the top-right corner
4. **Load unpacked**: Click "Load unpacked"
5. **Select folder**: Navigate to this project folder and select it
6. **Confirm**: The extension should now appear in your Chrome toolbar

### 2. Load the Extension in Firefox

1. Run `./scripts/use-firefox-manifest.sh`
2. Open `about:debugging#/runtime/this-firefox`
3. Click **Load Temporary Add-on...**
4. Select this repository's `manifest.json`
5. Pin the extension if needed so the toolbar button is easy to reach
6. Click the toolbar button to open the Firefox sidebar

### 3. Verify Installation

- Look for the extension icon in your browser toolbar
- Click it to open the side panel in Chrome or the sidebar in Firefox
- You should see the Settings page

## Provider Configuration

Choose one (or configure multiple):

### Gemini (Google's AI)

**Best for:** Free trial credits, good performance

**Get API key:**
1. Go to https://aistudio.google.com
2. Click "Get API key" (top-left button)
3. Click "Create API key in new project"
4. Copy the key

**Configure in extension:**
1. Click extension icon → **Options** (⚙️)
2. Select **Provider: Gemini**
3. Paste API key in the "API Key" field
4. Leave Model as default: `gemini-3.1-flash-lite-preview`
5. Click **Save**

**Pricing:**
- Free tier: limited requests
- Paid: $0.01 per 1M input tokens, $0.075 per 1M output tokens
- Check [Google AI Studio pricing](https://ai.google.dev/pricing)

**Settings in extension:**
```
Provider: gemini
API Key: YOUR_API_KEY_HERE
Model: gemini-3.1-flash-lite-preview (or latest)
```

### OpenAI (ChatGPT API)

**Best for:** Consistent quality, lots of model options

**Get API key:**
1. Go to https://platform.openai.com/api/keys
2. Sign up or log in
3. Click "Create new secret key"
4. Copy the key (you won't see it again!)

**Configure in extension:**
1. Click extension icon → **Options**
2. Select **Provider: OpenAI**
3. Paste API key
4. Leave Model as default: `gpt-4o-mini`
5. Leave Base URL as: `https://api.openai.com/v1`
6. Click **Save**

**Pricing:**
- `gpt-4o-mini`: ~$0.15 per 1M input tokens, $0.60 per 1M output tokens
- `gpt-4o`: more capable, more expensive
- Check [OpenAI pricing](https://openai.com/pricing)

**Settings in extension:**
```
Provider: openai
API Key: sk-YOUR_KEY_HERE
Model: gpt-4o-mini
Base URL: https://api.openai.com/v1
```

**Using custom endpoint (Azure, etc.):**
- Change Base URL to your endpoint
- Keep API key format as-is
- Example: `https://your-company.openai.azure.com/v1`

### Local LLM (Self-Hosted)

**Best for:** Privacy, no costs, offline usage

#### Option A: Ollama (Easiest)

**Setup Ollama:**
1. Download from https://ollama.ai
2. Install and run: `ollama serve`
3. Pull a model: `ollama pull llama2` (or another model)
4. Server runs at `http://127.0.0.1:11434`

**Configure in extension:**
1. Click extension icon → **Options**
2. Select **Provider: Local**
3. Set:
   - Base URL: `http://127.0.0.1:11434`
   - Model: `llama2` (or your model name)
   - Endpoint Type: `ollama`
4. Click **Save**

**Settings in extension:**
```
Provider: local
Base URL: http://127.0.0.1:11434
Model: llama2
Endpoint Type: ollama
```

#### Option B: OpenAI-Compatible Endpoint

If you're running LM Studio, vLLM, or another OpenAI-compatible server:

1. Start your server (ensure it runs on accessible address)
2. Click extension icon → **Options**
3. Select **Provider: Local**
4. Set:
   - Base URL: `http://your-server:8000/v1` (adjust port)
   - Model: `your-model-name`
   - Endpoint Type: `openai`
5. Click **Save**

**Common local servers:**
- [LM Studio](https://lmstudio.ai/) - easy GUI
- [vLLM](https://docs.vllm.ai/) - fast, production-ready
- [Ollama](https://ollama.ai) - simple, focused
- [GPT4All](https://gpt4all.io/) - cross-platform

#### Recommended Models for Local

- **llama2** - good balance, ~7B parameters
- **mistral** - faster, ~7B parameters
- **neural-chat** - conversational, ~7B
- **orca-mini** - compact, ~3B

**Settings in extension:**
```
Provider: local
Base URL: http://127.0.0.1:11434  (Ollama)
         OR http://127.0.0.1:8000/v1  (LM Studio)
Model: (name of your model)
Endpoint Type: ollama  (or openai)
```

## Customization

### Summary Settings

In **Options**, adjust behavior:

- **Size**: Brief/Medium/Deep (affects detail level)
- **Tone**: Simple/Expert/Academic/Professional/Friendly (affects language)
- **Language**: Select language for summaries
- **Prompt Mode**: Summarize/Analyze/Explain/Debate/Study/Outline/Timeline

### Custom Instructions

Add your own rules that apply to all summaries:

**System Instructions** (applies to all):
```
Example: "Always cite sources with [citations]"
Example: "Use only passive voice"
```

**Prompt Instructions** (applies to all):
```
Example: "Include practical next steps"
Example: "Focus on actionable insights"
```

**Source-Specific Hints:**
- YouTube hint: applies to YouTube summaries only
- Webpage hint: applies to article/blog summaries
- Course hint: applies to course lesson summaries
- Selected Text hint: applies to highlighted text

### UI Settings

- **Font Size**: Adjust text size in side panel
- **Show Floating UI**: Enable/disable quick-summarize button
- **Generate Follow-up Questions**: Auto-suggest related questions

## Testing Your Setup

### Test Summarization

1. **Open a test page:**
   - YouTube: https://youtu.be/dQw4w9WgXcQ (any YouTube video)
   - Article: Any news/blog post
   - Select text anywhere

2. **Generate summary:**
   - Click extension icon
   - Click **Generate Summary**
   - Wait for result

3. **Check for issues:**
   - Did it extract content? Check console if not (`F12` → Console)
   - Did the provider work? (Look for errors in console)
   - Is the summary reasonable?

### Common Test Flows

#### YouTube Test

1. Open a YouTube watch page
2. Open side panel
3. Click "Generate Summary"
4. Expect: Summary of video transcript + metadata
5. Bonus: Click "Transcript Tools" to see full transcript

#### Article Test

1. Open any article or documentation page
2. Open side panel
3. Click "Generate Summary"
4. Expect: 3-5 section summary of the article

#### Selected Text Test

1. Highlight any text on a page
2. Open side panel
3. Click "Generate Summary"
4. Expect: Summary of only the selected text

#### Deep Dive Test

1. After generating a summary
2. Scroll to "Deep Dive Chat"
3. Ask: "What are the main points?"
4. Expect: Answer referencing the summary + source content

## Troubleshooting

### "Invalid API Key" Error

**If you see this:**
- Your API key is wrong or expired
- Check you copied the entire key
- Verify no extra spaces

**Fix:**
1. Get a new API key from your provider
2. Paste it carefully (copy + paste, not type)
3. Save
4. Try again

### "Provider Error" / Connection Issues

**For OpenAI/Gemini:**
- Check internet connection
- Verify API key is active
- Check account has credits/quota remaining
- Try a different page

**For Local LLM:**
- Verify server is running (`ollama serve` or similar)
- Check Base URL is correct
- Ensure port is accessible
- Check firewall settings

### "No usable content found"

The extension couldn't extract content. Reasons:
- Page is protected (paywalls, PDFs)
- Page has no readable text (image gallery, login wall)
- Content is behind JavaScript that hasn't loaded

**Try:**
- Open in a normal tab (not incognito)
- Wait longer for page to fully load
- Try a different page
- Check that JS is enabled

### Performance Issues

**Side panel is slow:**
- Try a shorter summary (Size: Short)
- Use a faster model (e.g., gpt-4o-mini instead of gpt-4)
- Check internet speed
- Reduce custom instructions

**Summarization takes forever:**
- Long YouTube videos use multiple requests (normal, 30-60 sec)
- Local LLM will be slower if model is large
- Try shorter content first

## Advanced Configuration

### Using Behind a Proxy

If you're behind a corporate proxy, your provider might need authentication.

OpenAI example:
- Some proxies may need custom environment setup
- Contact your IT department for proxy settings

Local LLM example:
- Make sure your local server is on the internal network
- Point Base URL to the internal address

### Multiple API Keys

You can rotate API keys if you have multiple:
1. Save first key in Options
2. Use until quota reached
3. Paste new key and save
4. Continue

### Rate Limiting

For free tier APIs:
- Summarize during off-peak hours
- Use shorter content
- Wait between requests
- Consider paid tier for heavy use

## Next Steps

👉 See [USER_GUIDE.md](USER_GUIDE.md) for how to use features
👉 See [WORKFLOW.md](WORKFLOW.md) for how summarization works
