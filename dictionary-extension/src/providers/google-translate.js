export async function lookupGoogleTranslate(text, settings) {
  const target = settings.translateTargetLanguage || "en";
  const url = new URL("https://translate.googleapis.com/translate_a/single");

  url.searchParams.set("client", "gtx");
  url.searchParams.set("sl", "auto");
  url.searchParams.set("tl", target);
  url.searchParams.set("dt", "t");
  url.searchParams.set("q", text);

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error("Google Translate request failed.");
  }

  const data = await response.json();
  const translatedText = Array.isArray(data?.[0])
    ? data[0].map((item) => item[0]).join("")
    : "";
  const detectedLanguage = data?.[2] || "auto";

  return {
    title: translatedText || "No translation found",
    subtitle: `Detected: ${detectedLanguage} → ${target}`,
    sourceLabel: "Google Translate",
    sections: [
      {
        title: "Original",
        text
      }
    ]
  };
}
