(function () {
  async function generateText(prompt, providerSettings) {
    const apiKey = (providerSettings.apiKey || "").trim();
    if (!apiKey) {
      throw new Error("OpenAI API key is missing.");
    }

    const model = (providerSettings.model || "gpt-4o-mini").trim();
    const baseUrl = (providerSettings.baseUrl || "https://api.openai.com/v1")
      .trim()
      .replace(/\/$/, "");
    const temperature =
      Number.isFinite(providerSettings.temperature) ? providerSettings.temperature : 0.4;

    const response = await fetch(baseUrl + "/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + apiKey
      },
      body: JSON.stringify({
        model,
        temperature,
        messages: [{ role: "user", content: prompt }]
      })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message =
        data.error && data.error.message
          ? data.error.message
          : "OpenAI request failed.";
      throw new Error(message);
    }

    const text =
      data.choices &&
      data.choices[0] &&
      data.choices[0].message &&
      data.choices[0].message.content;

    if (!text) {
      throw new Error("OpenAI returned an empty response.");
    }

    return Array.isArray(text)
      ? text.map((part) => part.text || "").join("\n")
      : String(text);
  }

  globalThis.SummarizerProviderOpenAI = { generateText };
})();
