(function () {
    const SETTINGS_KEY = "summarizerSettings";
    const RESULTS_KEY = "summarizerResultsByTab";
    const CONVERSATION_KEY = "summarizerConversationsByTab";
    const WORKFLOW_KEY = "summarizerWorkflowByTab";

    const defaultSettings = {
        provider: "gemini",
        promptMode: "summarize",
        summarySize: "Medium",
        summaryLanguage: "English",
        summaryTone: "Simple",
        sidepanelFontSize: "14",
        customPromptInstructions: "",
        customSystemInstructions: "",
        youtubePromptHint: "",
        webpagePromptHint: "",
        coursePromptHint: "",
        selectedTextPromptHint: "",
        analyzePromptHint: "",
        explainPromptHint: "",
        debatePromptHint: "",
        studyPromptHint: "",
        outlinePromptHint: "",
        timelinePromptHint: "",
        showFloatingUi: false,
        generateFollowUpQuestions: true,
        gemini: {
            apiKey: "",
            model: "gemini-3.1-flash-lite-preview"
        },
        openai: {
            apiKey: "",
            model: "gpt-4o-mini",
            baseUrl: "https://api.openai.com/v1"
        },
        local: {
            baseUrl: "http://127.0.0.1:11434",
            model: "llama3.1",
            endpointType: "ollama"
        }
    };

    function storageGet(keys) {
        return new Promise((resolve) => chrome.storage.local.get(keys, resolve));
    }

    function storageSet(value) {
        return new Promise((resolve) => chrome.storage.local.set(value, resolve));
    }

    function deepMerge(target, source) {
        const output = Array.isArray(target) ? target.slice() : { ...target };
        Object.keys(source || {}).forEach((key) => {
            const sourceValue = source[key];
            if (
                sourceValue &&
                typeof sourceValue === "object" &&
                !Array.isArray(sourceValue)
            ) {
                output[key] = deepMerge(target[key] || {}, sourceValue);
            } else {
                output[key] = sourceValue;
            }
        });
        return output;
    }

    async function getSettings() {
        const stored = await storageGet([SETTINGS_KEY]);
        return deepMerge(defaultSettings, stored[SETTINGS_KEY] || {});
    }

    async function saveSettings(partialSettings) {
        const nextSettings = deepMerge(await getSettings(), partialSettings || {});
        await storageSet({ [SETTINGS_KEY]: nextSettings });
        return nextSettings;
    }

    async function getResultsByTab() {
        const stored = await storageGet([RESULTS_KEY]);
        return stored[RESULTS_KEY] || {};
    }

    async function saveResultForTab(tabId, result) {
        const results = await getResultsByTab();
        results[String(tabId)] = result;
        await storageSet({ [RESULTS_KEY]: results });
        return result;
    }

    async function getResultForTab(tabId) {
        const results = await getResultsByTab();
        return results[String(tabId)] || null;
    }

    async function removeResultForTab(tabId) {
        const results = await getResultsByTab();
        delete results[String(tabId)];
        await storageSet({ [RESULTS_KEY]: results });
    }

    async function getConversationForTab(tabId) {
        const stored = await storageGet([CONVERSATION_KEY]);
        const conversations = stored[CONVERSATION_KEY] || {};
        return conversations[String(tabId)] || [];
    }

    async function saveConversationForTab(tabId, conversation) {
        const conversations = await storageGet([CONVERSATION_KEY]).then(
            (stored) => stored[CONVERSATION_KEY] || {}
        );
        conversations[String(tabId)] = conversation;
        await storageSet({ [CONVERSATION_KEY]: conversations });
        return conversation;
    }

    async function addMessageToConversation(tabId, message) {
        const conversation = await getConversationForTab(tabId);
        conversation.push({
            ...message,
            timestamp: new Date().toISOString()
        });
        return saveConversationForTab(tabId, conversation);
    }

    async function clearConversationForTab(tabId) {
        const conversations = await storageGet([CONVERSATION_KEY]).then(
            (stored) => stored[CONVERSATION_KEY] || {}
        );
        delete conversations[String(tabId)];
        await storageSet({ [CONVERSATION_KEY]: conversations });
    }

    async function getWorkflowByTab() {
        const stored = await storageGet([WORKFLOW_KEY]);
        return stored[WORKFLOW_KEY] || {};
    }

    async function getWorkflowStateForTab(tabId) {
        const workflows = await getWorkflowByTab();
        return workflows[String(tabId)] || null;
    }

    async function saveWorkflowStateForTab(tabId, workflowState) {
        const workflows = await getWorkflowByTab();
        workflows[String(tabId)] = workflowState;
        await storageSet({ [WORKFLOW_KEY]: workflows });
        return workflowState;
    }

    async function patchWorkflowStateForTab(tabId, partialState) {
        const current = (await getWorkflowStateForTab(tabId)) || {};
        const next = {
            ...current,
            ...partialState,
            updatedAt: new Date().toISOString()
        };
        return saveWorkflowStateForTab(tabId, next);
    }

    async function clearWorkflowStateForTab(tabId) {
        const workflows = await getWorkflowByTab();
        delete workflows[String(tabId)];
        await storageSet({ [WORKFLOW_KEY]: workflows });
    }

    async function clearTabData(tabId) {
        await Promise.all([
            removeResultForTab(tabId),
            clearConversationForTab(tabId),
            clearWorkflowStateForTab(tabId)
        ]);
    }

    async function pruneClosedTabData(openTabIds) {
        const openTabIdSet = new Set((openTabIds || []).map((tabId) => String(tabId)));
        const [results, conversations, workflows] = await Promise.all([
            getResultsByTab(),
            storageGet([CONVERSATION_KEY]).then((stored) => stored[CONVERSATION_KEY] || {}),
            getWorkflowByTab()
        ]);

        let hasChanges = false;

        Object.keys(results).forEach((tabId) => {
            if (!openTabIdSet.has(tabId)) {
                delete results[tabId];
                hasChanges = true;
            }
        });

        Object.keys(conversations).forEach((tabId) => {
            if (!openTabIdSet.has(tabId)) {
                delete conversations[tabId];
                hasChanges = true;
            }
        });

        Object.keys(workflows).forEach((tabId) => {
            if (!openTabIdSet.has(tabId)) {
                delete workflows[tabId];
                hasChanges = true;
            }
        });

        if (!hasChanges) {
            return;
        }

        await storageSet({
            [RESULTS_KEY]: results,
            [CONVERSATION_KEY]: conversations,
            [WORKFLOW_KEY]: workflows
        });
    }

    const STATS_KEY = "summarizerStats";

    async function getStats() {
        const stored = await storageGet([STATS_KEY]);
        return stored[STATS_KEY] || {
            totalSummaries: 0,
            summaryHistory: [],
            providerStats: {},
            toneStats: {},
            sizeStats: {},
            contentTypeStats: {},
            createdAt: new Date().toISOString()
        };
    }

    async function recordSummary(metadata) {
        // metadata: { provider, tone, size, sourceType, durationMs, contentLength }
        const stats = await getStats();

        // Add to history
        stats.summaryHistory.push({
            ...metadata,
            timestamp: new Date().toISOString()
        });

        // Keep only last 500 summaries
        if (stats.summaryHistory.length > 500) {
            stats.summaryHistory = stats.summaryHistory.slice(-500);
        }

        // Update totals
        stats.totalSummaries = stats.summaryHistory.length;

        // Update provider stats
        const provider = metadata.provider || "unknown";
        if (!stats.providerStats[provider]) {
            stats.providerStats[provider] = { count: 0, totalTime: 0, totalContent: 0 };
        }
        stats.providerStats[provider].count += 1;
        stats.providerStats[provider].totalTime += metadata.durationMs || 0;
        stats.providerStats[provider].totalContent += metadata.contentLength || 0;

        // Update tone stats
        const tone = metadata.tone || "unknown";
        if (!stats.toneStats[tone]) {
            stats.toneStats[tone] = { count: 0 };
        }
        stats.toneStats[tone].count += 1;

        // Update size stats
        const size = metadata.size || "unknown";
        if (!stats.sizeStats[size]) {
            stats.sizeStats[size] = { count: 0 };
        }
        stats.sizeStats[size].count += 1;

        // Update content type stats
        const contentType = metadata.sourceType || "unknown";
        if (!stats.contentTypeStats[contentType]) {
            stats.contentTypeStats[contentType] = { count: 0 };
        }
        stats.contentTypeStats[contentType].count += 1;

        await storageSet({ [STATS_KEY]: stats });
        return stats;
    }

    async function clearStats() {
        await storageSet({
            [STATS_KEY]: {
                totalSummaries: 0,
                summaryHistory: [],
                providerStats: {},
                toneStats: {},
                sizeStats: {},
                contentTypeStats: {},
                createdAt: new Date().toISOString()
            }
        });
    }

    globalThis.SummarizerStorage = {
        defaultSettings,
        deepMerge,
        getSettings,
        saveSettings,
        getResultForTab,
        saveResultForTab,
        removeResultForTab,
        getConversationForTab,
        saveConversationForTab,
        addMessageToConversation,
        clearConversationForTab,
        getWorkflowStateForTab,
        saveWorkflowStateForTab,
        patchWorkflowStateForTab,
        clearWorkflowStateForTab,
        clearTabData,
        pruneClosedTabData,
        getStats,
        recordSummary,
        clearStats
    };
})();
