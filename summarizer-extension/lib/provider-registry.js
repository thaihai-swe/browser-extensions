(function () {
    const providers = {
        gemini: {
            label: "Gemini",
            getText: (prompt, settings) =>
                SummarizerProviderGemini.generateText(prompt, settings.gemini || {})
        },
        openai: {
            label: "OpenAI",
            getText: (prompt, settings) =>
                SummarizerProviderOpenAI.generateText(prompt, settings.openai || {})
        },
        local: {
            label: "Local LLM",
            getText: (prompt, settings) =>
                SummarizerProviderLocal.generateText(prompt, settings.local || {})
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
