import { getSettings } from "../src/shared/storage.js";

const LOOKUP_MESSAGE = "LOOKUP_TEXT";
const TAB_ORDER = ["dictionary", "ai"];
const DEFAULT_BODY_MESSAGE = "Type a word or phrase, then press Search.";

const form = document.querySelector("#lookup-form");
const input = document.querySelector("#lookup-input");
const tabsRoot = document.querySelector("#tabs");
const resultRoot = document.querySelector("#result");

let settings = null;
let activeTab = "dictionary";
let activeQuery = "";
let requestToken = 0;
const cache = new Map();
const pendingRequests = new Map();
let activeAudio = null;
let activeUtterance = null;

const OUTPUT_AFFECTING_SETTING_KEYS = new Set([
    "translateTargetLanguage",
    "enableTranslate",
    "enableDictionary",
    "enableAI",
    "aiBaseUrl",
    "aiApiKey",
    "aiModel",
    "aiPromptTemplate"
]);

init().catch((error) => {
    renderState(error.message || "Unable to load popup.", true);
});

async function init() {
    settings = await getSettings();
    activeTab = getInitialTab();
    applyDimensions();
    renderTabs();
    renderIdleState();

    form.addEventListener("submit", handleSubmit);
    tabsRoot.addEventListener("click", handleTabClick);
    resultRoot.addEventListener("click", handlePronunciationClick);
    chrome.storage.onChanged.addListener(handleStorageChanges);

    input.focus();
}

function applyDimensions() {
    const popup = document.querySelector(".toolbar-popup");
    popup.style.width = `${settings.popupWidth}px`;
    resultRoot.style.maxHeight = `${settings.popupHeight}px`;
}

function handleSubmit(event) {
    event.preventDefault();

    const query = input.value.trim();
    activeQuery = query;

    if (!query) {
        renderIdleState();
        return;
    }

    maybePreloadAi(query, activeTab);
    void loadTab(activeTab);
}

function handleTabClick(event) {
    const button = event.target.closest("[data-tab]");
    if (!button) {
        return;
    }

    activeTab = button.dataset.tab;
    renderTabs();

    if (!activeQuery) {
        renderIdleState();
        return;
    }

    void loadTab(activeTab);
}

function handleStorageChanges(changes, areaName) {
    if (areaName !== "sync") {
        return;
    }

    let shouldRefreshCurrentResult = false;

    for (const [key, change] of Object.entries(changes)) {
        settings[key] = change.newValue;

        if (["defaultTab", ...OUTPUT_AFFECTING_SETTING_KEYS].includes(key)) {
            shouldRefreshCurrentResult = true;
        }
    }

    if (Object.keys(changes).some((key) => OUTPUT_AFFECTING_SETTING_KEYS.has(key))) {
        cache.clear();
    }

    const availableTabs = getAvailableTabs();
    if (!availableTabs.includes(activeTab)) {
        activeTab = availableTabs[0] || "dictionary";
    }

    applyDimensions();
    renderTabs();

    if (!availableTabs.length) {
        renderState("Enable at least one source in the extension settings.");
        return;
    }

    if (!activeQuery) {
        renderIdleState();
        return;
    }

    if (shouldRefreshCurrentResult) {
        void loadTab(activeTab);
    }
}

function getAvailableTabs() {
    return TAB_ORDER.filter((tab) => {
        if (tab === "dictionary") {
            return settings.enableTranslate || settings.enableDictionary;
        }

        if (tab === "ai") {
            return settings.enableAI;
        }

        return false;
    });
}

function getInitialTab() {
    const availableTabs = getAvailableTabs();
    if (availableTabs.includes(settings.defaultTab)) {
        return settings.defaultTab;
    }

    return availableTabs[0] || "dictionary";
}

function renderTabs() {
    const availableTabs = getAvailableTabs();

    tabsRoot.innerHTML = availableTabs
        .map((tab) => {
            const activeClass = tab === activeTab ? " is-active" : "";
            return `<button class="toolbar-popup-tab${activeClass}" type="button" data-tab="${tab}">${labelForTab(tab)}</button>`;
        })
        .join("");
}

function renderIdleState() {
    if (!getAvailableTabs().length) {
        renderState("Enable at least one source in the extension settings.");
        return;
    }

    renderState(DEFAULT_BODY_MESSAGE);
}

async function loadTab(tab) {
    const availableTabs = getAvailableTabs();
    if (!availableTabs.includes(tab)) {
        renderState("This source is disabled in settings.");
        return;
    }

    const query = activeQuery.trim();
    if (!query) {
        renderIdleState();
        return;
    }

    requestToken += 1;
    const token = requestToken;
    renderState(`Loading ${labelForTab(tab).toLowerCase()}...`);

    try {
        const response = await getLookupResponse(tab, query);

        if (token !== requestToken) {
            return;
        }

        if (!response?.ok) {
            throw new Error(response?.error || "Request failed.");
        }

        resultRoot.innerHTML = renderResult(response.result);
        maybePreloadAi(query, tab);
    } catch (error) {
        if (token !== requestToken) {
            return;
        }

        renderState(error.message || "Unable to load results.", true);
    }
}

function maybePreloadAi(query = activeQuery, currentTab = activeTab) {
    const normalizedQuery = String(query || "").trim();

    if (!settings.enableAiPreload || !settings.enableAI || !normalizedQuery || currentTab === "ai") {
        return;
    }

    void getLookupResponse("ai", normalizedQuery).catch(() => {
        // Keep preload failures silent until the user opens the AI tab.
    });
}

async function getLookupResponse(tab, text) {
    const cacheKey = getRequestCacheKey(tab, text);

    if (cache.has(cacheKey)) {
        return { ok: true, result: cache.get(cacheKey) };
    }

    if (!pendingRequests.has(cacheKey)) {
        pendingRequests.set(
            cacheKey,
            chrome.runtime.sendMessage({
                type: LOOKUP_MESSAGE,
                payload: { source: tab, text, trigger: "manual" }
            }).then((response) => {
                if (response?.ok) {
                    cache.set(cacheKey, response.result);
                }

                return response;
            }).finally(() => {
                pendingRequests.delete(cacheKey);
            })
        );
    }

    return pendingRequests.get(cacheKey);
}

function getRequestCacheKey(tab, text) {
    return JSON.stringify({
        tab,
        text,
        translateTargetLanguage: settings.translateTargetLanguage,
        enableTranslate: settings.enableTranslate,
        enableDictionary: settings.enableDictionary,
        enableAI: settings.enableAI,
        aiBaseUrl: settings.aiBaseUrl,
        aiApiKey: settings.aiApiKey,
        aiModel: settings.aiModel,
        aiPromptTemplate: settings.aiPromptTemplate
    });
}

function renderState(message, isError = false) {
    const errorClass = isError ? " is-error" : "";
    resultRoot.innerHTML = `<p class="toolbar-popup-state${errorClass}">${escapeHtml(message)}</p>`;
}

function renderResult(result) {
    const pronunciation = renderPronunciation(result.pronunciation);
    const sections = (result.sections || [])
        .map((section) => {
            const items = (section.items || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("");
            const body = section.markdown
                ? `<div class="toolbar-popup-markdown">${renderSimpleMarkdown(section.text || "")}</div>`
                : section.text
                    ? `<p>${escapeHtml(section.text)}</p>`
                    : "";

            return `
                <section class="toolbar-popup-section">
                    ${section.title ? `<h3>${escapeHtml(section.title)}</h3>` : ""}
                    ${body}
                    ${items ? `<ul>${items}</ul>` : ""}
                </section>
            `;
        })
        .join("");

    const meta = [result.subtitle, result.sourceLabel].filter(Boolean).join(" • ");

    return `
        <article class="toolbar-popup-result">
            ${result.title ? `<div class="toolbar-popup-title-row"><h2>${escapeHtml(result.title)}</h2>${pronunciation}</div>` : ""}
            ${meta ? `<div class="toolbar-popup-meta">${escapeHtml(meta)}</div>` : ""}
            ${sections || `<p class="toolbar-popup-state">No result available.</p>`}
        </article>
    `;
}

function renderPronunciation(pronunciation) {
    if (!pronunciation?.text) {
        return "";
    }

    const phonetic = pronunciation.phonetic
        ? `<span class="toolbar-popup-phonetic">${escapeHtml(pronunciation.phonetic)}</span>`
        : "";
    const audioUrl = pronunciation.audioUrl ? escapeHtml(pronunciation.audioUrl) : "";
    const language = pronunciation.language ? escapeHtml(pronunciation.language) : "";

    return `
        <div class="toolbar-popup-pronunciation">
            ${phonetic}
            <button
                class="toolbar-popup-pronounce"
                type="button"
                data-pronounce-text="${escapeHtml(pronunciation.text)}"
                data-pronounce-audio="${audioUrl}"
                data-pronounce-language="${language}"
                aria-label="Play pronunciation"
            >
                Listen
            </button>
        </div>
    `;
}

function labelForTab(tab) {
    return tab === "ai" ? "AI" : "Dictionary";
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function renderSimpleMarkdown(source) {
    const lines = String(source || "").split("\n");
    let html = "";
    let inBlockquote = false;

    for (const rawLine of lines) {
        const line = rawLine.trimEnd();
        const trimmed = line.trim();

        if (!trimmed) {
            if (inBlockquote) {
                html += "</blockquote>";
                inBlockquote = false;
            }
            continue;
        }

        if (trimmed === "---") {
            if (inBlockquote) {
                html += "</blockquote>";
                inBlockquote = false;
            }
            html += "<hr>";
            continue;
        }

        if (trimmed.startsWith(">")) {
            if (!inBlockquote) {
                html += "<blockquote>";
                inBlockquote = true;
            }
            html += `<p>${formatInlineMarkdown(trimmed.replace(/^>\s?/, ""))}</p>`;
            continue;
        }

        if (inBlockquote) {
            html += "</blockquote>";
            inBlockquote = false;
        }

        html += `<p>${formatInlineMarkdown(trimmed)}</p>`;
    }

    if (inBlockquote) {
        html += "</blockquote>";
    }

    return html;
}

function formatInlineMarkdown(text) {
    return escapeHtml(text)
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.+?)\*/g, "<em>$1</em>")
        .replace(/`(.+?)`/g, "<code>$1</code>");
}

function handlePronunciationClick(event) {
    const button = event.target.closest("[data-pronounce-text]");
    if (!button) {
        return;
    }

    const text = button.dataset.pronounceText || "";
    const audioUrl = button.dataset.pronounceAudio || "";
    const language = button.dataset.pronounceLanguage || "";

    void playPronunciation({ text, audioUrl, language });
}

async function playPronunciation({ text, audioUrl, language }) {
    stopPronunciation();

    if (audioUrl) {
        activeAudio = new Audio(audioUrl);
        activeAudio.addEventListener("ended", () => {
            activeAudio = null;
        }, { once: true });
        activeAudio.addEventListener("error", () => {
            activeAudio = null;
            speakWithSynthesis(text, language);
        }, { once: true });

        try {
            await activeAudio.play();
            return;
        } catch (_error) {
            activeAudio = null;
        }
    }

    speakWithSynthesis(text, language);
}

function speakWithSynthesis(text, language) {
    if (!window.speechSynthesis || !text) {
        return;
    }

    activeUtterance = new SpeechSynthesisUtterance(text);
    if (language) {
        activeUtterance.lang = language;
    }
    activeUtterance.rate = 0.95;
    activeUtterance.onend = () => {
        activeUtterance = null;
    };
    activeUtterance.onerror = () => {
        activeUtterance = null;
    };
    window.speechSynthesis.speak(activeUtterance);
}

function stopPronunciation() {
    if (activeAudio) {
        activeAudio.pause();
        activeAudio.currentTime = 0;
        activeAudio = null;
    }

    if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }

    activeUtterance = null;
}
