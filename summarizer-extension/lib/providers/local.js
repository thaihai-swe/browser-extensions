(function () {
    async function generateText(prompt, providerSettings) {
        const baseUrl = (providerSettings.baseUrl || "http://127.0.0.1:11434")
            .trim()
            .replace(/\/$/, "");
        const model = (providerSettings.model || "llama3.1").trim();
        const endpointType = (providerSettings.endpointType || "ollama").trim().toLowerCase();
        const temperature =
            Number.isFinite(providerSettings.temperature) ? providerSettings.temperature : 0.4;

        let response, data, text;

        try {
            if (endpointType === "openai" || baseUrl.includes("1234")) {
                // OpenAI-compatible endpoint (LM Studio style)
                response = await fetch(baseUrl + "/chat/completions", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": "Bearer lm-studio"
                    },
                    body: JSON.stringify({
                        model,
                        temperature,
                        messages: [{ role: "user", content: prompt }]
                    })
                });

                data = await response.json().catch(() => ({}));
                if (!response.ok) {
                    const message =
                        data.error && data.error.message
                            ? data.error.message
                            : "Local OpenAI-compatible endpoint failed.";
                    throw new Error(message);
                }

                text =
                    data.choices &&
                    data.choices[0] &&
                    data.choices[0].message &&
                    data.choices[0].message.content;

                if (!text) {
                    throw new Error("Local endpoint returned an empty response.");
                }

                return Array.isArray(text)
                    ? text.map((part) => part.text || "").join("\n")
                    : String(text);
            } else {
                // Ollama-compatible endpoint (default)
                response = await fetch(baseUrl + "/api/chat", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        model,
                        stream: false,
                        options: { temperature },
                        messages: [{ role: "user", content: prompt }]
                    })
                });

                data = await response.json().catch(() => ({}));
                if (!response.ok) {
                    const message = data.error || "Local endpoint request failed.";
                    throw new Error(message);
                }

                text =
                    data.message && data.message.content ? data.message.content : "";
                if (!text) {
                    throw new Error("Local endpoint returned an empty response.");
                }

                return text;
            }
        } catch (error) {
            throw new Error("Local LLM Error: " + (error.message || "Unknown error"));
        }
    }

    globalThis.SummarizerProviderLocal = { generateText };
})();
