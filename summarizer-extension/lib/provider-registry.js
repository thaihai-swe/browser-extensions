(function () {
    function normalizeTemperature(value) {
        const parsed = Number.parseFloat(value);
        if (!Number.isFinite(parsed)) {
            return 0.4;
        }
        return Math.min(2, Math.max(0, parsed));
    }

    const providers = {
        gemini: {
            label: "Gemini",
            getText: (prompt, settings) =>
                SummarizerProviderGemini.generateText(prompt, {
                    ...(settings.gemini || {}),
                    temperature: normalizeTemperature(settings.temperature)
                })
        },
        openai: {
            label: "OpenAI",
            getText: (prompt, settings) =>
                SummarizerProviderOpenAI.generateText(prompt, {
                    ...(settings.openai || {}),
                    temperature: normalizeTemperature(settings.temperature)
                })
        },
        local: {
            label: "Local LLM",
            getText: (prompt, settings) =>
                SummarizerProviderLocal.generateText(prompt, {
                    ...(settings.local || {}),
                    temperature: normalizeTemperature(settings.temperature)
                })
        }
    };

    async function generateText(providerId, prompt, settings) {
        const provider = providers[providerId];
        if (!provider) {
            throw new Error("Unsupported provider: " + providerId);
        }
        SummarizerDebug.logProviderRequest(providerId, prompt, settings && settings[providerId]);
        try {
            const text = await provider.getText(prompt, settings);
            SummarizerDebug.logProviderResponse(providerId, text);
            return text;
        } catch (error) {
            SummarizerDebug.logProviderError(providerId, error);
            throw error;
        }
    }

    globalThis.SummarizerProviders = {
        providers,
        generateText
    };
})();
