(function () {
    async function applyFontSizeSettings() {
        const settings = await SummarizerStorage.getSettings();
        const fontSize = settings.sidepanelFontSize || "14";
        document.documentElement.style.setProperty("--workspace-font-size", fontSize + "px");
    }

    async function loadSettings(elements) {
        const settings = await SummarizerStorage.getSettings();
        elements.modeSelect.value = settings.promptMode || "summarize";
    }

    async function loadLatestResult(renderResult, loadConversationHistory) {
        const response = await chrome.runtime.sendMessage({ type: SummarizerMessages.types.GET_ACTIVE_TAB_RESULT });
        if (response && response.ok) {
            renderResult(response.result);
            if (response.result && response.tabId) {
                await loadConversationHistory(response.tabId);
            }
        }
    }

    async function loadConversationHistory(tabId, appendChatEntry, chatLog) {
        const conversation = await SummarizerStorage.getConversationForTab(tabId);
        chatLog.innerHTML = "";
        conversation.forEach((msg) => {
            if (msg.type === "user-question") {
                appendChatEntry("question", msg.question);
                appendChatEntry("answer", msg.answer);
            }
        });
    }

    globalThis.SummarizerSidepanelState = {
        applyFontSizeSettings,
        loadSettings,
        loadLatestResult,
        loadConversationHistory
    };
})();
