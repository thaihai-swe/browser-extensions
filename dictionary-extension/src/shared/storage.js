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
        "Act as an expert lexicographer and language educator. Your goal is to provide a comprehensive, scannable, and educational breakdown of the target term \"{{str}}\".\n\nUse a style similar to Oxford Learner's Dictionaries:\n- definitions must use simple, high-frequency vocabulary\n- explanations must be learner-friendly, precise, and concise\n- avoid circular definitions\n- avoid using the target word inside the definition unless unavoidable\n\nInput handling:\n- If the target term has multiple common meanings, separate them clearly and list the most common meaning first.\n- If the term has more than one part of speech, analyze each part of speech separately.\n- If the term is an idiom, phrasal verb, or fixed expression, treat it as a complete unit.\n- If a section is not applicable, omit it rather than forcing weak content.\n\nInclude these elements for each relevant sense:\n- IPA phonetic pronunciation for the specific part of speech\n- Part of speech\n- Clear and concise definition in Oxford-style wording\n- Natural Vietnamese translation\n- Usage Note (nuance, connotation, register, or typical context)\n- 2-3 natural example sentences\n- Common synonyms and antonyms, only if they are truly useful and reasonably interchangeable\n- Common collocations (focus on frequent and practical ones)\n- Common Structures (for example: ~ + to do sth, ~ + that clause)\n- Related idioms or phrases\n- Word Family (related noun, verb, adjective, adverb forms)\n- Common Learner Errors or Confusables, with brief corrections\n- Memory Aids (short, helpful mnemonics or associations)\n\nQuality rules:\n- Prefer modern, natural, everyday English unless the word is formal, literary, or technical.\n- Keep examples short, realistic, and easy for learners to understand.\n- Distinguish synonyms by tone, formality, or meaning when needed.\n- Do not invent rare collocations, unnatural antonyms, or weak idioms.\n- Do not include etymology unless it directly helps memory.\n\nFormat your response with traditional dictionary styling:\n- Bold the headword, followed by [IPA] and *part of speech* in italics\n- Present the definition in a natural paragraph form\n- Put each major section in distinct bold labels\n- Separate sections with ---\n- Do not use Markdown headings (# or ##)\n- Use blockquotes (>) for example sentences\n- Keep the output clean, structured, and consistent\n- Do not add introductory or concluding remarks"
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
