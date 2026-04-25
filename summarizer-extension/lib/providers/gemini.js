(function () {
    const FALLBACK_CHAIN = [
        "gemini-3-flash-preview",
        "gemini-2.5-flash",
        "gemini-3.1-flash-lite-preview",
        "gemini-2.5-flash-lite"
    ];

    function sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    function isTransientGeminiError(message, status) {
        const text = String(message || "").toLowerCase();
        return (
            status === 429 ||
            status === 500 ||
            status === 503 ||
            text.includes("high demand") ||
            text.includes("try again later") ||
            text.includes("overloaded") ||
            text.includes("resource_exhausted") ||
            text.includes("too many requests") ||
            text.includes("rate limit")
        );
    }

    function buildModelCandidates(initialModel) {
        const normalized = (initialModel || "gemini-3.1-flash-lite-preview").trim();
        const list = [normalized];

        FALLBACK_CHAIN.forEach((model) => {
            if (!list.includes(model)) {
                list.push(model);
            }
        });

        return list;
    }

    async function requestGemini(prompt, apiKey, model, temperature) {
        const url =
            "https://generativelanguage.googleapis.com/v1beta/models/" +
            encodeURIComponent(model) +
            ":generateContent?key=" +
            encodeURIComponent(apiKey);

        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [
                    {
                        role: "user",
                        parts: [{ text: prompt }]
                    }
                ],
                generationConfig: {
                    temperature,
                    maxOutputTokens: 6144,
                    responseMimeType: "text/plain"
                }
            })
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            const message =
                data.error && data.error.message
                    ? data.error.message
                    : "Gemini request failed.";
            const error = new Error(message);
            error.status = response.status;
            error.model = model;
            throw error;
        }

        const text =
            data.candidates &&
            data.candidates[0] &&
            data.candidates[0].content &&
            data.candidates[0].content.parts &&
            data.candidates[0].content.parts
                .map((part) => part.text || "")
                .join("\n");

        if (!text) {
            throw new Error("Gemini returned an empty response.");
        }

        return text;
    }

    async function generateText(prompt, providerSettings) {
        const apiKey = (providerSettings.apiKey || "").trim();
        if (!apiKey) {
            throw new Error("Gemini API key is missing.");
        }

        const modelCandidates = buildModelCandidates(providerSettings.model);
        const temperature =
            Number.isFinite(providerSettings.temperature) ? providerSettings.temperature : 0.4;
        let lastError = null;

        for (const model of modelCandidates) {
            for (let attempt = 0; attempt < 3; attempt += 1) {
                try {
                    return await requestGemini(prompt, apiKey, model, temperature);
                } catch (error) {
                    lastError = error;

                    if (!isTransientGeminiError(error.message, error.status)) {
                        throw error;
                    }

                    if (attempt < 2) {
                        await sleep(700 * (attempt + 1));
                    }
                }
            }
        }

        throw new Error(
            "Gemini is temporarily overloaded. The extension retried and tried fallback Gemini models, but Google still returned a temporary capacity error. Please try again shortly or switch providers."
        );
    }

    globalThis.SummarizerProviderGemini = { generateText };
})();
