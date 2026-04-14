export async function lookupGoogleDictionary(text) {
  const term = normalizeDictionaryTerm(text);
  const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(term)}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Dictionary lookup failed. Try a single English word.");
  }

  const data = await response.json();
  const entry = Array.isArray(data) ? data[0] : null;

  if (!entry) {
    throw new Error("No dictionary result found.");
  }

  const sections = (entry.meanings || []).slice(0, 4).map((meaning) => ({
    title: meaning.partOfSpeech || "Meaning",
    items: (meaning.definitions || []).slice(0, 3).map((definition) => {
      return definition.example
        ? `${definition.definition} Example: ${definition.example}`
        : definition.definition;
    })
  }));

  const pronunciation = getPronunciation(entry, term);

  return {
    title: entry.word || term,
    subtitle: entry.phonetic || "",
    sourceLabel: "Dictionary",
    pronunciation,
    sections
  };
}

function normalizeDictionaryTerm(text) {
  const trimmed = text.trim();
  return trimmed.replace(/^[^a-zA-Z]+|[^a-zA-Z' -]+$/g, "") || trimmed;
}

function getPronunciation(entry, fallbackText) {
  const phonetics = Array.isArray(entry?.phonetics) ? entry.phonetics : [];
  const firstAudio = phonetics.find((item) => item?.audio);
  const firstText = phonetics.find((item) => item?.text)?.text || entry?.phonetic || "";

  return {
    text: entry?.word || fallbackText,
    phonetic: firstText,
    audioUrl: firstAudio?.audio || "",
    language: "en-US",
    fallbackOnly: !firstAudio?.audio
  };
}
