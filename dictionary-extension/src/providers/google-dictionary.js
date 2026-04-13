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

  return {
    title: entry.word || term,
    subtitle: entry.phonetic || "",
    sourceLabel: "Dictionary",
    sections
  };
}

function normalizeDictionaryTerm(text) {
  const trimmed = text.trim();
  const firstWord = trimmed.split(/\s+/)[0];
  return firstWord.replace(/^[^a-zA-Z]+|[^a-zA-Z-]+$/g, "") || trimmed;
}
