(function () {
  async function generateText(prompt, providerSettings) {
    const model = (providerSettings.model || "llama3.1").trim();
    const baseUrl = (providerSettings.baseUrl || "http://127.0.0.1:11434")
      .trim()
      .replace(/\/$/, "");

    const response = await fetch(baseUrl + "/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        stream: false,
        messages: [{ role: "user", content: prompt }]
      })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = data.error || "Ollama request failed.";
      throw new Error(message);
    }

    const text =
      data.message && data.message.content ? data.message.content : "";
    if (!text) {
      throw new Error("Ollama returned an empty response.");
    }

    return text;
  }

  globalThis.SummarizerProviderOllama = { generateText };
})();
