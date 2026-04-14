import { getSettings } from "./shared/storage.js";
import { lookupGoogleTranslate } from "./providers/google-translate.js";
import { lookupGoogleDictionary } from "./providers/google-dictionary.js";
import { lookupAiProvider } from "./providers/ai-provider.js";

const CONTEXT_MENU_ID = "dictionary-helper-lookup";
const MANUAL_LOOKUP_EMPTY_MESSAGE = "Enter a word or phrase to look up.";

initializeContextMenu().catch(() => { });

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.type !== "LOOKUP_TEXT") {
        return false;
    }

    handleLookup(message.payload)
        .then((result) => sendResponse({ ok: true, result }))
        .catch((error) => {
            sendResponse({
                ok: false,
                error: error instanceof Error ? error.message : "Lookup failed."
            });
        });

    return true;
});

chrome.runtime.onInstalled.addListener(() => {
    initializeContextMenu().catch(() => { });
});

chrome.runtime.onStartup?.addListener(() => {
    initializeContextMenu().catch(() => { });
});

chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "sync" || !changes.enableContextMenuTrigger) {
        return;
    }

    initializeContextMenu().catch(() => { });
});

if (chrome.contextMenus?.onClicked) {
    chrome.contextMenus.onClicked.addListener(async (info, tab) => {
        if (info.menuItemId !== CONTEXT_MENU_ID || !tab?.id) {
            return;
        }

        try {
            const settings = await getSettings();
            if (!settings.enableContextMenuTrigger) {
                return;
            }

            await chrome.tabs.sendMessage(tab.id, {
                type: "OPEN_LOOKUP_POPUP",
                payload: {
                    text: info.selectionText || ""
                }
            });
        } catch (_error) {
            // Ignore tabs that cannot receive content-script messages.
        }
    });
}

async function handleLookup(payload) {
    const settings = await getSettings();
    const { source, text, trigger } = payload || {};

    if (!text || !text.trim()) {
        throw new Error(trigger === "manual" ? MANUAL_LOOKUP_EMPTY_MESSAGE : "No text selected.");
    }

    if (source === "dictionary") {
        return lookupCombinedDictionary(text, settings);
    }

    if (source === "ai") {
        return lookupAiProvider(text, settings);
    }

    throw new Error("Unknown source.");
}

async function lookupCombinedDictionary(text, settings) {
    if (!settings.enableTranslate && !settings.enableDictionary) {
        throw new Error("Enable translation or dictionary lookup in settings.");
    }

    const [translateResult, dictionaryResult] = await Promise.allSettled([
        settings.enableTranslate ? lookupGoogleTranslate(text, settings) : Promise.resolve(null),
        settings.enableDictionary ? lookupGoogleDictionary(text, settings) : Promise.resolve(null)
    ]);

    const translation = translateResult.status === "fulfilled" ? translateResult.value : null;
    const dictionary = dictionaryResult.status === "fulfilled" ? dictionaryResult.value : null;

    if (!translation && !dictionary) {
        const messages = [translateResult, dictionaryResult]
            .filter((result) => result.status === "rejected")
            .map((result) => result.reason?.message)
            .filter(Boolean);

        throw new Error(messages[0] || "Lookup failed.");
    }

    const sections = [];



    if (dictionary?.sections?.length) {
        sections.push(...dictionary.sections);
    }

    if (!dictionary && translation) {
        sections.push({
            title: "Original",
            text
        });
    }
    if (translation) {
        sections.push({
            title: "Translation",
            text: translation.title
        });
    }

    return {
        title: dictionary?.title || text,
        subtitle: [translation?.subtitle].filter(Boolean).join(" • "),
        sourceLabel: "",
        pronunciation: dictionary?.pronunciation || createSpeechPronunciation(text),
        sections
    };
}

async function initializeContextMenu() {
    if (!chrome.contextMenus) {
        return;
    }

    const settings = await getSettings();

    await chrome.contextMenus.removeAll();
    if (!settings.enableContextMenuTrigger) {
        return;
    }

    chrome.contextMenus.create({
        id: CONTEXT_MENU_ID,
        title: 'Look up "%s"',
        contexts: ["selection"]
    });
}

function createSpeechPronunciation(text) {
    return {
        text: text.trim(),
        audioUrl: "",
        language: "",
        fallbackOnly: true
    };
}
