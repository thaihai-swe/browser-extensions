(function () {
  async function generateText(prompt, providerSettings) {
    const model = (providerSettings.model || "local-model").trim();
    const baseUrl = (providerSettings.baseUrl || "http://127.0.0.1:1234/v1")
      .trim()
      .replace(/\/$/, "");

    const response = await fetch(baseUrl + "/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer lm-studio"
      },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        messages: [{ role: "user", content: prompt }]
      })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message =
        data.error && data.error.message
          ? data.error.message
          : "LM Studio request failed.";
      throw new Error(message);
    }

    const text =
      data.choices &&
      data.choices[0] &&
      data.choices[0].message &&
      data.choices[0].message.content;

    if (!text) {
      throw new Error("LM Studio returned an empty response.");
    }

    return Array.isArray(text)
      ? text.map((part) => part.text || "").join("\n")
      : String(text);
  }

  globalThis.SummarizerProviderLMStudio = { generateText };
})();
