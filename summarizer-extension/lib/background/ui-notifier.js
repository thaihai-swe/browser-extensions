(function () {
    function notifyUi(result, tabId) {
        chrome.runtime.sendMessage({ type: SummarizerMessages.types.SUMMARY_UPDATED, result, tabId }, () => {
            void chrome.runtime.lastError;
        });

        chrome.tabs.sendMessage(tabId, { type: SummarizerMessages.types.SUMMARY_UPDATED, result, tabId }, () => {
            void chrome.runtime.lastError;
        });
    }

    function notifyError(error, tabId) {
        const payload = {
            type: SummarizerMessages.types.SUMMARY_ERROR,
            error: error.message || "Unknown error.",
            tabId
        };

        chrome.runtime.sendMessage(payload, () => {
            void chrome.runtime.lastError;
        });

        if (tabId) {
            chrome.tabs.sendMessage(tabId, payload, () => {
                void chrome.runtime.lastError;
            });
        }
    }

    globalThis.SummarizerUiNotifier = {
        notifyUi,
        notifyError
    };
})();
