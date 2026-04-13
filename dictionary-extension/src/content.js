const TAB_ORDER = ["dictionary", "ai"];
const DEFAULT_UI_SETTINGS = {
    enableSelectionTrigger: false,
    enableDoubleClickTrigger: true,
    enableShortcutTrigger: true,
    enableContextMenuTrigger: true,
    selectionModifier: "none",
    doubleClickModifier: "none",
    defaultTab: "dictionary",
    popupWidth: 380,
    popupHeight: 420,
    enableTranslate: true,
    enableDictionary: true,
    enableAI: true,
    enableAiPreload: false
};

let popupRoot = null;
let popupCard = null;
let activeText = "";
let activeTab = "dictionary";
let currentPosition = { x: 24, y: 24 };
let requestToken = 0;
const cache = new Map();
const pendingRequests = new Map();
let settings = { ...DEFAULT_UI_SETTINGS };
let extensionContextValid = true;

init();

function init() {
    loadSettings().catch(handleExtensionContextError);
    document.addEventListener("dblclick", handleDoubleClickTrigger);
    document.addEventListener("mouseup", handleMouseUpTrigger);
    document.addEventListener("keydown", handleKeydown, true);
    document.addEventListener("mousedown", handleOutsidePointer, true);

    try {
        chrome.storage.onChanged.addListener(handleStorageChanges);
        chrome.runtime.onMessage.addListener(handleRuntimeMessage);
    } catch (error) {
        handleExtensionContextError(error);
    }
}

function handleMouseUpTrigger(event) {
    if (!settings.enableSelectionTrigger || !matchesModifier(event, settings.selectionModifier)) {
        return;
    }

    if (event.detail > 1) {
        return;
    }

    openPopupFromSelection(event);
}

function handleDoubleClickTrigger(event) {
    if (!settings.enableDoubleClickTrigger || !matchesModifier(event, settings.doubleClickModifier)) {
        return;
    }

    openPopupFromSelection(event);
}

function openPopupFromSelection(event) {
    if (!extensionContextValid) {
        showRefreshRequiredMessage(event);
        return;
    }

    if (popupRoot && popupRoot.contains(event.target)) {
        return;
    }

    const selection = window.getSelection();
    const text = selection ? selection.toString().trim() : "";

    if (!text) {
        return;
    }

    const range = selection.rangeCount ? selection.getRangeAt(0) : null;
    const rect = range ? range.getBoundingClientRect() : null;
    const position = getPopupPosition(rect, event);

    activeText = text;
    currentPosition = position;
    activeTab = getAvailableTabs().includes(activeTab) ? activeTab : settings.defaultTab;
    activeTab = getAvailableTabs().includes(activeTab) ? activeTab : getAvailableTabs()[0];

    ensurePopup();
    applyPopupDimensions();
    setPopupPosition(position);
    renderShell();
    clearSelection();
    maybePreloadAi();
    loadTab(activeTab);
}

function openPopupForText(text, event) {
    if (!extensionContextValid) {
        showRefreshRequiredMessage(event || {});
        return;
    }

    const normalizedText = String(text || "").trim();
    if (!normalizedText) {
        return;
    }

    activeText = normalizedText;
    currentPosition = getPopupPosition(null, event || null);
    activeTab = getAvailableTabs().includes(activeTab) ? activeTab : settings.defaultTab;
    activeTab = getAvailableTabs().includes(activeTab) ? activeTab : getAvailableTabs()[0];

    ensurePopup();
    applyPopupDimensions();
    setPopupPosition(currentPosition);
    renderShell();
    maybePreloadAi();
    loadTab(activeTab);
}

function handleKeydown(event) {
    if (
        settings.enableShortcutTrigger &&
        event.altKey &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.shiftKey &&
        event.key.toLowerCase() === "g"
    ) {
        if (isEditableTarget(event.target)) {
            return;
        }

        event.preventDefault();
        openPopupFromSelection(event);
        return;
    }

    if (event.key === "Escape" && popupRoot) {
        destroyPopup();
    }
}

function handleOutsidePointer(event) {
    if (!popupRoot) {
        return;
    }

    if (!popupRoot.contains(event.target)) {
        const selection = window.getSelection();
        if (!selection || !selection.toString().trim()) {
            destroyPopup();
        }
    }
}

function ensurePopup() {
    if (popupRoot) {
        return;
    }

    popupRoot = document.createElement("div");
    popupRoot.className = "dictionary-helper-root";
    popupRoot.innerHTML = `
    <div class="dictionary-helper-card">
      <div class="dictionary-helper-header">
        <div class="dictionary-helper-title">Dictionary</div>
        <button class="dictionary-helper-close" type="button" aria-label="Close">&times;</button>
      </div>
      <div class="dictionary-helper-tabs"></div>
      <div class="dictionary-helper-query"></div>
      <div class="dictionary-helper-body"></div>
    </div>
  `;

    popupCard = popupRoot.querySelector(".dictionary-helper-card");
    applyPopupDimensions();
    popupRoot
        .querySelector(".dictionary-helper-close")
        .addEventListener("click", destroyPopup);

    popupRoot
        .querySelector(".dictionary-helper-tabs")
        .addEventListener("click", (event) => {
            const button = event.target.closest("[data-tab]");
            if (!button) {
                return;
            }

            activeTab = button.dataset.tab;
            renderShell();
            loadTab(activeTab);
        });

    document.documentElement.appendChild(popupRoot);
}

function destroyPopup() {
    popupRoot?.remove();
    popupRoot = null;
    popupCard = null;
}

function clearSelection() {
    const selection = window.getSelection();
    if (!selection) {
        return;
    }

    try {
        selection.removeAllRanges();
    } catch (_error) {
        // Some documents can reject selection clearing; in that case we keep going.
    }
}

function renderShell() {
    if (!popupRoot) {
        return;
    }

  const tabs = popupRoot.querySelector(".dictionary-helper-tabs");
  const query = popupRoot.querySelector(".dictionary-helper-query");
  const availableTabs = getAvailableTabs();

    if (availableTabs.length === 0) {
        tabs.innerHTML = "";
        query.textContent = activeText;
        popupRoot.querySelector(".dictionary-helper-body").innerHTML =
            `<div class="dictionary-helper-state">Enable at least one source in the extension settings.</div>`;
        return;
    }

  tabs.innerHTML = availableTabs.map((tab) => {
    const activeClass = tab === activeTab ? " is-active" : "";
    return `<button class="dictionary-helper-tab${activeClass}" data-tab="${tab}" type="button">${labelForTab(tab)}</button>`;
  }).join("");

  query.textContent = "";
  query.style.display = "none";
}

function applyPopupDimensions() {
    if (!popupCard) {
        return;
    }

    popupCard.style.width = `${settings.popupWidth}px`;
    popupCard.style.maxHeight = `${settings.popupHeight}px`;
}

async function loadTab(tab) {
    if (!popupRoot) {
        return;
    }

    const body = popupRoot.querySelector(".dictionary-helper-body");
    const text = activeText.trim();
    requestToken += 1;
    const token = requestToken;
    const availableTabs = getAvailableTabs();

    if (availableTabs.length === 0) {
        body.innerHTML = `<div class="dictionary-helper-state">Enable at least one source in the extension settings.</div>`;
        return;
    }

    if (!availableTabs.includes(tab)) {
        body.innerHTML = `<div class="dictionary-helper-state">This source is disabled in settings.</div>`;
        return;
    }

    if (cache.has(`${tab}:${text}`)) {
        body.innerHTML = renderResult(cache.get(`${tab}:${text}`));
        return;
    }

    body.innerHTML = `<div class="dictionary-helper-state">Loading ${labelForTab(tab).toLowerCase()}...</div>`;

    try {
        const response = await getLookupResponse(tab, text);

        if (token !== requestToken || !popupRoot) {
            return;
        }

        if (!response?.ok) {
            throw new Error(response?.error || "Request failed.");
        }

        body.innerHTML = renderResult(response.result);
    } catch (error) {
        if (isExtensionContextInvalidated(error)) {
            handleExtensionContextError(error);
            body.innerHTML = `<div class="dictionary-helper-state is-error">The extension was reloaded. Refresh this tab to use it again.</div>`;
            return;
        }

        if (token !== requestToken || !popupRoot) {
            return;
        }

        body.innerHTML = `<div class="dictionary-helper-state is-error">${escapeHtml(error.message || "Unable to load results.")}</div>`;
    }
}

function maybePreloadAi() {
    if (!settings.enableAiPreload || !settings.enableAI || !activeText.trim()) {
        return;
    }

    void getLookupResponse("ai", activeText.trim()).catch(() => {
        // Keep preload failures silent until the user opens the AI tab.
    });
}

async function getLookupResponse(tab, text) {
    const cacheKey = `${tab}:${text}`;

    if (cache.has(cacheKey)) {
        return { ok: true, result: cache.get(cacheKey) };
    }

    if (!pendingRequests.has(cacheKey)) {
        pendingRequests.set(
            cacheKey,
            chrome.runtime.sendMessage({
                type: "LOOKUP_TEXT",
                payload: { source: tab, text }
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

function renderResult(result) {
    const sections = (result.sections || []).map((section) => {
        const items = (section.items || [])
            .map((item) => `<li>${escapeHtml(item)}</li>`)
            .join("");
        const sectionBody = section.markdown
            ? `<div class="dictionary-helper-markdown">${renderSimpleMarkdown(section.text || "")}</div>`
            : section.text
                ? `<p>${escapeHtml(section.text)}</p>`
                : "";

        return `
      <section class="dictionary-helper-section">
        ${section.title ? `<h4>${escapeHtml(section.title)}</h4>` : ""}
        ${sectionBody}
        ${items ? `<ul>${items}</ul>` : ""}
      </section>
    `;
    }).join("");

    const meta = [result.subtitle, result.sourceLabel].filter(Boolean).join(" • ");

    return `
    <div class="dictionary-helper-result">
      ${result.title ? `<h3>${escapeHtml(result.title)}</h3>` : ""}
      ${meta ? `<div class="dictionary-helper-meta">${escapeHtml(meta)}</div>` : ""}
      ${sections || `<div class="dictionary-helper-state">No result available.</div>`}
    </div>
  `;
}

function getPopupPosition(rect, event) {
    const width = settings.popupWidth || 380;
    const margin = 16;
    const pageX = window.scrollX;
    const pageY = window.scrollY;
    const fallbackX = pageX + (event?.clientX ?? window.innerWidth / 2);
    const fallbackY = pageY + (event?.clientY ?? 80);
    const top = rect ? rect.bottom + pageY + 10 : fallbackY + 10;
    const left = rect ? rect.left + pageX : fallbackX;

    return {
        x: Math.max(margin, Math.min(left, pageX + window.innerWidth - width - margin)),
        y: Math.max(margin, top)
    };
}

function setPopupPosition(position) {
    if (!popupCard) {
        return;
    }

    popupCard.style.left = `${position.x}px`;
    popupCard.style.top = `${position.y}px`;
}

function labelForTab(tab) {
    if (tab === "dictionary") {
        return "Dictionary";
    }

    if (tab === "ai") {
        return "AI";
    }

    return tab;
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

async function loadSettings() {
    try {
        const stored = await chrome.storage.sync.get(DEFAULT_UI_SETTINGS);
        settings = { ...DEFAULT_UI_SETTINGS, ...stored };
        activeTab = getAvailableTabs().includes(settings.defaultTab)
            ? settings.defaultTab
            : getAvailableTabs()[0] || "dictionary";
    } catch (error) {
        handleExtensionContextError(error);
    }
}

function handleStorageChanges(changes, areaName) {
    if (!extensionContextValid) {
        return;
    }

    if (areaName !== "sync") {
        return;
    }

    for (const key of Object.keys(DEFAULT_UI_SETTINGS)) {
        if (changes[key]) {
            settings[key] = changes[key].newValue;
        }
    }

    const availableTabs = getAvailableTabs();
    if (!availableTabs.includes(activeTab)) {
        activeTab = availableTabs[0] || "dictionary";
    }

    if (popupRoot) {
        applyPopupDimensions();
        setPopupPosition(currentPosition);
        renderShell();
        loadTab(activeTab);
    }
}

function handleRuntimeMessage(message) {
    if (message?.type !== "OPEN_LOOKUP_POPUP") {
        return false;
    }

    openPopupForText(message.payload?.text || "", null);
    return false;
}

function showRefreshRequiredMessage(event) {
    ensurePopup();
    setPopupPosition(getPopupPosition(null, event));
    renderShell();
    popupRoot.querySelector(".dictionary-helper-body").innerHTML =
        `<div class="dictionary-helper-state is-error">The extension was reloaded. Refresh this tab to restore the popup.</div>`;
}

function handleExtensionContextError(error) {
    if (!isExtensionContextInvalidated(error)) {
        return;
    }

    extensionContextValid = false;
}

function isExtensionContextInvalidated(error) {
    const message = error?.message || String(error || "");
    return message.includes("Extension context invalidated");
}

function isEditableTarget(target) {
    if (!target) {
        return false;
    }

    if (target.isContentEditable) {
        return true;
    }

    const tagName = target.tagName ? target.tagName.toLowerCase() : "";
    return tagName === "input" || tagName === "textarea" || tagName === "select";
}

function matchesModifier(event, modifier) {
    if (modifier === "alt") {
        return Boolean(event.altKey);
    }

    if (modifier === "ctrl") {
        return Boolean(event.ctrlKey || event.metaKey);
    }

    if (modifier === "shift") {
        return Boolean(event.shiftKey);
    }

    return !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey;
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
