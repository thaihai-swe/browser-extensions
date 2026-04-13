if (typeof importScripts === "function") {
    importScripts(
        "lib/browser-api.js",
        "lib/messages.js",
        "lib/storage.js",
        "lib/cleaners.js",
        "lib/debug.js",
        "lib/prompts/common.js",
        "lib/prompts/templates/youtube.js",
        "lib/prompts/templates/webpage.js",
        "lib/prompts/templates/course.js",
        "lib/prompts/templates/selected-text.js",
        "lib/prompts/builders.js",
        "lib/prompts.js",
        "lib/providers/gemini.js",
        "lib/providers/openai.js",
        "lib/providers/local.js",
        "lib/provider-registry.js",
        "lib/tab-cache-service.js",
        "lib/background/tab-manager.js",
        "lib/background/workflow-store.js",
        "lib/background/ui-notifier.js",
        "lib/background/summary-service.js"
    );
}

const MSG = SummarizerMessages.types;

async function pruneClosedTabState() {
    const tabs = await chrome.tabs.query({});
    await SummarizerStorage.pruneClosedTabData(tabs.map((tab) => tab.id).filter(Boolean));
}

chrome.runtime.onInstalled.addListener(() => {
    SummarizerBrowserApi.configurePrimarySidebarBehavior().catch(() => { });
    pruneClosedTabState().catch(() => { });
});

chrome.runtime.onStartup.addListener(() => {
    SummarizerBrowserApi.configurePrimarySidebarBehavior().catch(() => { });
    pruneClosedTabState().catch(() => { });
});

// Clear cache when tabs are closed
chrome.tabs.onRemoved.addListener((tabId) => {
    SummarizerSummaryService.releaseTab(tabId);
    SummarizerTabCacheService.clearTabCache(tabId);
    SummarizerStorage.clearTabData(tabId).catch(() => { });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    (async () => {
        switch (message.type) {
            case MSG.SUMMARIZE_ACTIVE_TAB: {
                const tabId =
                    message.tabId || (sender.tab && sender.tab.id) || (await SummarizerTabManager.getActiveTab()).id;
                if (message.mode) {
                    await SummarizerStorage.saveSettings({ promptMode: message.mode });
                }
                const result = await SummarizerSummaryService.summarizeForTab(tabId);
                // Cache result for tab
                SummarizerTabCacheService.cacheResult(tabId, result);
                sendResponse({ ok: true, result });
                return;
            }

            case MSG.GET_ACTIVE_TAB_RESULT: {
                const tab = await SummarizerTabManager.getActiveTab();
                // Try cache first for better performance
                let result = SummarizerTabCacheService.getCachedResult(tab.id);
                if (!result) {
                    result = await SummarizerStorage.getResultForTab(tab.id);
                    if (result) {
                        // Repopulate cache from storage
                        SummarizerTabCacheService.cacheResult(tab.id, result);
                    }
                }
                sendResponse({ ok: true, result, tabId: tab.id });
                return;
            }

            case MSG.GET_ACTIVE_TAB_WORKFLOW: {
                const tab = await SummarizerTabManager.getActiveTab();
                const workflow = await SummarizerWorkflowStore.getState(tab.id);
                sendResponse({ ok: true, workflow, tabId: tab.id });
                return;
            }

            case MSG.GET_RESULT_FOR_TAB: {
                const result = await SummarizerStorage.getResultForTab(message.tabId);
                sendResponse({ ok: true, result });
                return;
            }

            case MSG.CLEAR_TAB_DATA: {
                const tabId =
                    message.tabId || (sender.tab && sender.tab.id) || (await SummarizerTabManager.getActiveTab()).id;
                SummarizerTabCacheService.clearTabCache(tabId);
                await SummarizerStorage.clearTabData(tabId);
                sendResponse({ ok: true, tabId });
                return;
            }

            case MSG.OPEN_SIDE_PANEL: {
                sendResponse(await SummarizerTabManager.openSidePanel());
                return;
            }

            case MSG.DEEP_DIVE_ACTIVE_TAB: {
                const tabId =
                    message.tabId || (sender.tab && sender.tab.id) || (await SummarizerTabManager.getActiveTab()).id;
                const result = await SummarizerSummaryService.answerFollowUp(tabId, message.question || "");
                sendResponse({ ok: true, result });
                return;
            }

            default:
                sendResponse({ ok: false, error: "Unknown message type." });
        }
    })().catch((error) => {
        const tabId = (message && message.tabId) || (sender.tab && sender.tab.id);
        const errorMessage = error && error.message ? error.message : "Unexpected error.";
        const tabWasClosed = /tab was closed before summarization completed/i.test(errorMessage);
        if (tabId && !tabWasClosed) {
            SummarizerWorkflowStore.markFailed(tabId, error.message || "Unexpected error.").catch(() => { });
        }
        if (!tabWasClosed) {
            SummarizerUiNotifier.notifyError(error, tabId);
        }
        sendResponse({ ok: false, error: errorMessage });
    });

    return true;
});
