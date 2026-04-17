export const DEFAULT_SETTINGS = {
    triggerMode: "double_click",
    enableSelectionTrigger: false,
    enableDoubleClickTrigger: true,
    enableShortcutTrigger: true,
    enableContextMenuTrigger: true,
    selectionModifier: "none",
    doubleClickModifier: "none",
    defaultTab: "dictionary",
    translateTargetLanguage: "en",
    popupWidth: 380,
    popupHeight: 420,
    enableTranslate: true,
    enableDictionary: true,
    enableAI: true,
    enableAiPreload: false,
    aiBaseUrl: "https://generativelanguage.googleapis.com/v1beta/openai/",
    aiApiKey: "",
    aiModel: "gemini-3.1-flash-lite-preview",
    aiPromptTemplate:
        "Act as an expert lexicographer and language educator. Your goal is to provide a comprehensive, scannable, and educational breakdown of the target term \"{{str}}\".\n\nPresent information in a clean, flowing format similar to standard online dictionaries, strictly emulating the Oxford Learner's Dictionaries style (using simple, high-frequency vocabulary for definitions).\n\nInclude these essential elements:\n- IPA phonetic pronunciation for the specific part of speech\n- Part of speech\n- Clear and concise definition (Oxford style) without introductory phrases\n- Translate to Vietnamese\n- Usage Note (nuance, connotation, or register)\n- Example sentences\n- Common synonyms & antonyms\n- Word Family (related nouns, verbs, adjectives, and adverbs)\n- Collocations (words that often go with it)\n- Common Structures (e.g., ~ + that clause, ~ + to do sth)\n- Related idioms or phrases\n- Common Learner Errors or Confusables (usage pitfalls or similar-sounding words)\n- Memory Aids (mnemonics or creative ways to remember the term)\n- Deep Understanding (etymology & extended usage): provide the word's etymology or origin story to make the meaning more memorable; expand on related forms and derived words (e.g., if learning 'analyse' also note 'analysis', 'analytical'); highlight typical collocations and phrase patterns; and explain subtle connotations, register differences, or pragmatic notes beyond the basic definition.\n\n{% if word_count > 1 %}\n- Compound/Idiom analysis (explain the components)\n{% endif %}\n\nFormat your response with traditional dictionary styling:\n- Bold word followed by [IPA pronunciation] and *part of speech* in italics.\n- Definition presented in a natural paragraph form.\n- Related terms, examples, and context in distinct Bold Sections divided by horizontal rules (---).\n- Do not use Markdown headings (no # or ##).\n- Use blockquotes (>) for example sentences."
};

export async function getSettings() {
    const data = await chrome.storage.sync.get(DEFAULT_SETTINGS);
    return normalizeSettings({ ...DEFAULT_SETTINGS, ...data });
}

export async function saveSettings(partialSettings) {
    await chrome.storage.sync.set(normalizeSettings(partialSettings));
}

export function normalizeSettings(settings) {
    const normalized = { ...settings };

    for (const key of [
        "defaultTab",
        "translateTargetLanguage",
        "aiBaseUrl",
        "aiApiKey",
        "aiModel",
        "aiPromptTemplate",
        "selectionModifier",
        "doubleClickModifier"
    ]) {
        if (typeof normalized[key] === "string") {
            normalized[key] = normalized[key].trim();
        }
    }

    normalized.popupWidth = clampNumber(normalized.popupWidth, 280, 720, 380);
    normalized.popupHeight = clampNumber(normalized.popupHeight, 220, 900, 420);
    normalized.translateTargetLanguage = normalizeLanguageCode(normalized.translateTargetLanguage);
    normalized.enableSelectionTrigger = Boolean(normalized.enableSelectionTrigger);
    normalized.enableDoubleClickTrigger = Boolean(normalized.enableDoubleClickTrigger);
    normalized.enableShortcutTrigger = Boolean(normalized.enableShortcutTrigger);
    normalized.enableContextMenuTrigger = Boolean(normalized.enableContextMenuTrigger);
    normalized.enableTranslate = Boolean(normalized.enableTranslate);
    normalized.enableDictionary = Boolean(normalized.enableDictionary);
    normalized.enableAI = Boolean(normalized.enableAI);
    normalized.enableAiPreload = Boolean(normalized.enableAiPreload);
    normalized.selectionModifier = normalizeModifier(normalized.selectionModifier);
    normalized.doubleClickModifier = normalizeModifier(normalized.doubleClickModifier);

    return normalized;
}

function clampNumber(value, min, max, fallback) {
    const numeric = Number(value);

    if (!Number.isFinite(numeric)) {
        return fallback;
    }

    return Math.min(max, Math.max(min, Math.round(numeric)));
}

function normalizeModifier(value) {
    const normalized = String(value || "none").trim().toLowerCase();
    const allowed = ["none", "alt", "ctrl", "shift"];
    return allowed.includes(normalized) ? normalized : "none";
}

function normalizeLanguageCode(value) {
    const normalized = String(value || "en").trim().toLowerCase();
    const aliases = {
        vn: "vi",
        jp: "ja",
        kr: "ko",
        cn: "zh-CN",
        tw: "zh-TW"
    };

    return aliases[normalized] || normalized || "en";
}
