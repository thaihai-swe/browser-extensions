# Provider Implementation Guide

This document explains how providers work, how to add a new one, and implementation details for existing providers.

## Provider Architecture

All providers implement the same interface:

```js
async generateText(prompt, providerSettings)
```

**Parameters:**
- `prompt` - full prompt string from [lib/prompts/builders.js](/lib/prompts/builders.js)
- `providerSettings` - provider-specific configuration (API keys, models, etc.)

**Returns:**
- Promise that resolves to generated text string

**Throws:**
- Error with descriptive message if request fails

**Called from:**
- [lib/provider-registry.js](/lib/provider-registry.js) - dispatches to provider

## Existing Providers

### Gemini (lib/providers/gemini.js)

**API:**
- Endpoint: `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`
- Auth: API key in query parameter
- Format: REST JSON

**Configuration:**
```js
{
  apiKey: string,
  model: string  // default: "gemini-3.1-flash-lite-preview"
}
```

**Features:**
- Fallback model chain - tries alternative models if primary fails
- Transient error detection - retries on rate limits (429), server errors (500, 503)
- Exponential backoff - waits longer with each retry

**Error Handling:**
- API key validation before request
- HTTP status checks
- Empty response detection
- Transient vs permanent error classification

**Implementation Details:**

```js
// Fallback chain (tried in order if primary fails)
["gemini-3-flash-preview",
 "gemini-2.5-flash",
 "gemini-3.1-flash-lite-preview",
 "gemini-2.5-flash-lite"]

// Transient errors (retriable)
- HTTP 429 (rate limit)
- HTTP 500/503 (server error)
- Messages containing: "high demand", "overloaded", "resource_exhausted"

// Retry strategy
- Up to 3 attempts
- Exponential backoff: 1s, 2s, 4s...
```

### OpenAI (lib/providers/openai.js)

**API:**
- Endpoint: `/chat/completions` (configurable base URL)
- Auth: Bearer token in Authorization header
- Format: REST JSON (OpenAI chat API format)

**Configuration:**
```js
{
  apiKey: string,          // must start with "sk-"
  model: string,           // default: "gpt-4o-mini"
  baseUrl: string          // default: "https://api.openai.com/v1"
}
```

**Features:**
- Custom base URL support (Azure, local proxies, etc.)
- Temperature set to 0.4 (balanced, less random)
- Single-turn chat format

**Error Handling:**
- API key validation
- HTTP status checks
- Error message extraction from response body
- Empty response detection

**Implementation Details:**

```js
// Default settings
temperature: 0.4         // balanced, less creative than 1.0
messages: [
  { role: "user", content: prompt }
]

// Response extraction
data.choices[0].message.content

// Supports Azure, local endpoints by changing baseUrl
```

### Local (lib/providers/local.js)

**API:**
- Two modes:
  1. Ollama-compatible (`/api/generate` endpoint)
  2. OpenAI-compatible (`/chat/completions` endpoint)
- Auth: None (local) or arbitrary bearer token
- Format: REST JSON

**Configuration:**
```js
{
  baseUrl: string,          // default: "http://127.0.0.1:11434"
  model: string,            // default: "llama3.1"
  endpointType: string      // "ollama" or "openai"
}
```

**Features:**
- Endpoint auto-detection
- Fallback between Ollama and OpenAI formats
- Compatible with multiple local server types

**Supported Local Servers:**
- **Ollama** - `http://localhost:11434` (endpointType: "ollama")
- **LM Studio** - `http://localhost:1234/v1` (endpointType: "openai")
- **vLLM** - `http://localhost:8000/v1` (endpointType: "openai")
- **GPT4All** - varies by setup

**Error Handling:**
- Connection failure detection
- HTTP status checks
- Empty response handling
- Helpful error messages for common failures

**Implementation Details:**

```js
// Ollama format
POST /api/generate
{
  model: string,
  prompt: string,
  stream: false
}

// OpenAI format
POST /chat/completions
{
  model: string,
  temperature: 0.4,
  messages: [{ role: "user", content: prompt }]
}

// Response extraction
Ollama: data.response
OpenAI: data.choices[0].message.content
```

## Adding a New Provider

### Step 1: Create Provider File

Create [lib/providers/my-provider.js](/lib/providers/my-provider.js):

```js
(function () {
    async function generateText(prompt, providerSettings) {
        // Validate settings
        const apiKey = (providerSettings.apiKey || "").trim();
        if (!apiKey) {
            throw new Error("My Provider API key is missing.");
        }

        const model = (providerSettings.model || "default-model").trim();

        // Make request
        const response = await fetch("https://api.myprovider.com/generate", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + apiKey
            },
            body: JSON.stringify({
                model,
                prompt,
                temperature: 0.4
            })
        });

        // Parse response
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            const message = data.error ? data.error.message : "Request failed.";
            throw new Error(message);
        }

        // Extract text
        const text = data.result || data.text || "";
        if (!text) {
            throw new Error("Empty response from provider.");
        }

        return String(text);
    }

    globalThis.SummarizerProviderMyProvider = { generateText };
})();
```

### Step 2: Register Provider

Edit [lib/provider-registry.js](/lib/provider-registry.js):

```js
const providers = {
    gemini: { /* ... */ },
    openai: { /* ... */ },
    local: { /* ... */ },
    myProvider: {
        label: "My Provider",
        getText: (prompt, settings) =>
            SummarizerProviderMyProvider.generateText(prompt, settings.myProvider || {})
    }
};
```

### Step 3: Update Manifest

Edit [manifest.json](/manifest.json):

If your provider needs a new domain/host permission:

```json
{
  "permissions": [
    "storage",
    "activeTab",
    "messageDisplayed"
  ],
  "host_permissions": [
    "https://api.myprovider.com/*"
  ]
}
```

### Step 4: Add Default Settings

Edit [lib/storage.js](/lib/storage.js):

```js
const defaultSettings = {
    // ...
    provider: "gemini",  // or add your provider as option
    myProvider: {
        apiKey: "",
        model: "default-model"
    }
};
```

### Step 5: Update Options Page

Edit [options.html](/options.html) and [options.js](/options.js) to add UI for your provider settings.

### Step 6: Test

1. Load extension in Chrome
2. Go to Options
3. Select your provider
4. Configure settings
5. Generate a summary

## Provider Testing Checklist

When adding a new provider, test:

- [ ] Missing API key → shows clear error message
- [ ] Invalid API key → shows clear error message
- [ ] Network error → error is caught and shown
- [ ] Empty response → error is caught and shown
- [ ] Valid request → returns text successfully
- [ ] Very long prompt → handled correctly
- [ ] Special characters in prompt → handled correctly

## Error Handling Best Practices

**Do:**
- ✅ Validate settings before making requests
- ✅ Check response HTTP status
- ✅ Extract and report error messages from API
- ✅ Throw descriptive Error objects
- ✅ Handle network timeouts gracefully
- ✅ Log requests/responses (via lib/storage.js logging)

**Don't:**
- ❌ Ignore HTTP errors
- ❌ Throw plain strings (use Error objects)
- ❌ Swallow error messages (pass them to user)
- ❌ Assume response format without checking
- ❌ Log API keys or sensitive data

## Performance Considerations

**Timeout Handling:**
- Fetch requests can hang indefinitely
- Consider adding manual timeout logic if provider supports it

**Retry Strategy:**
- Should you retry failed requests? (Gemini does for transient errors)
- How many retries? (Gemini: 3)
- Backoff strategy? (Gemini: exponential)

**Request Size:**
- Some providers limit prompt length
- Consider validation or chunking strategy
- Document limits in settings

## Temperature & Model Parameters

**Temperature setting** (in current implementations):
- Set to `0.4` (balanced, less random)
- Lower = more deterministic
- Higher = more creative
- 0.0 = always same response, 1.0+ = very varied

**Consider:**
- Should temperature be configurable?
- Different temperatures for different modes (analyze vs summarize)?

## Streaming vs Non-Streaming

**Current implementation:**
- All providers return full text (buffered)
- No streaming to user

**Future consideration:**
- Streaming could show partial results
- Would need UI changes to display chunks
- Some providers support streaming (OpenAI w/ server-sent-events)

## Rate Limiting & Quotas

**Provider quotas:**
- Some providers charge per token
- Some have request-per-minute limits
- Some have per-hour quotas

**Tips:**
- Document in setup guide
- Consider cache for identical requests
- Consider rate limit detection and backoff

## Security

**API Key Handling:**
- Keys stored in Chrome local storage (not cloud synced)
- Keys sent only to the provider's API
- Never logged in console (checked in lib implementation)
- Consider warning about private/shared computers

**CORS:**
- Extension has broader permission model than web pages
- No CORS restrictions on extension background context
- Providers don't need CORS headers (but won't hurt)

## Future Provider Ideas

Possible additions:
- Claude (Anthropic)
- LLaMA (Meta)
- Mistral
- Cohere
- AWS Bedrock
- Replicate
- HuggingFace Inference API
