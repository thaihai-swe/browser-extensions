export async function lookupAiProvider(text, settings) {
    const missingFields = [];

    if (!settings.aiBaseUrl) {
        missingFields.push("base URL");
    }

    if (!settings.aiApiKey) {
        missingFields.push("API key");
    }

    if (!settings.aiModel) {
        missingFields.push("model");
    }

    if (missingFields.length > 0) {
        throw new Error(`Missing AI setting: ${missingFields.join(", ")}. Open the extension options and save again.`);
    }

    const prompt = applyTemplate(settings.aiPromptTemplate, {
        text,
        str: text,
        sentence: text,
        word_count: countWords(text),
        targetLang: settings.translateTargetLanguage || "en"
    });

    const providerResult = isGeminiBaseUrl(settings.aiBaseUrl)
        ? await requestGemini(prompt, settings)
        : await requestOpenAiCompatible(prompt, settings);

    const content = providerResult.content;

    return {
        title: "",
        subtitle: "",
        sourceLabel: "",
        sections: [
            {
                title: "",
                text: content || "No AI response returned.",
                markdown: true
            }
        ]
    };
}

async function requestGemini(prompt, settings) {
    const requestUrl = buildGeminiGenerateContentUrl(settings.aiBaseUrl, settings.aiModel, settings.aiApiKey);
    const response = await fetch(requestUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            contents: [
                {
                    role: "user",
                    parts: [{ text: prompt }]
                }
            ],
            generationConfig: {
                temperature: 0.3,
                maxOutputTokens: 6144,
                responseMimeType: "text/plain"
            }
        })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        const message =
            data?.error?.message ||
            `AI provider request failed (${response.status} ${response.statusText}) at ${requestUrl}`;
        throw new Error(message);
    }

    const content = data?.candidates?.[0]?.content?.parts
        ?.map((part) => part?.text || "")
        .join("\n")
        .trim();

    if (!content) {
        throw new Error("Gemini returned an empty response.");
    }

    return { content };
}

async function requestOpenAiCompatible(prompt, settings) {
    const requestUrl = buildChatCompletionsUrl(settings.aiBaseUrl);
    const response = await fetch(requestUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${settings.aiApiKey}`
        },
        body: JSON.stringify({
            model: settings.aiModel,
            temperature: 0.4,
            messages: [
                {
                    role: "user",
                    content: prompt
                }
            ]
        })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        const message =
            data?.error?.message ||
            `AI provider request failed (${response.status} ${response.statusText}) at ${requestUrl}`;
        throw new Error(message);
    }

    const content =
        data?.choices?.[0]?.message?.content ||
        data?.choices?.[0]?.text ||
        "";

    if (!content) {
        throw new Error("OpenAI-compatible provider returned an empty response.");
    }

    return {
        content: Array.isArray(content)
            ? content.map((part) => part?.text || "").join("\n")
            : String(content)
    };
}

function applyTemplate(template, variables) {
    const fallback = "Explain this text for a language learner: {{text}}";
    const source = template && template.trim() ? template : fallback;

    return source
        .replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => {
            return variables[key] != null ? String(variables[key]) : "";
        })
        .trim();
}

function countWords(text) {
    return text.trim().split(/\s+/).filter(Boolean).length;
}

function buildChatCompletionsUrl(baseUrl) {
    const normalized = String(baseUrl || "").trim().replace(/\/+$/, "");

    if (normalized.endsWith("/chat/completions")) {
        return normalized;
    }

    return `${normalized}/chat/completions`;
}

function isGeminiBaseUrl(baseUrl) {
    const normalized = String(baseUrl || "").toLowerCase();
    return normalized.includes("generativelanguage.googleapis.com") || normalized.includes("googleapis.com");
}

function buildGeminiGenerateContentUrl(baseUrl, model, apiKey) {
    const normalized = String(baseUrl || "").trim();

    try {
        const url = new URL(normalized);
        const pathname = url.pathname.replace(/\/+$/, "");
        const basePath = pathname.includes("/v1beta")
            ? pathname.split("/openai")[0]
            : pathname || "/v1beta";

        url.pathname = `${basePath}/models/${encodeURIComponent(model)}:generateContent`;
        url.search = "";
        url.searchParams.set("key", apiKey);
        return url.toString();
    } catch (_error) {
        return `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
    }
}
