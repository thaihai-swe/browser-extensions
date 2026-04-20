(function () {
    const MSG = SummarizerMessages.types;
    let latestResult = null;
    let activeTabId = null;
    let refreshSequence = 0;
    let defaultSummarizeLabel = "Generate Summary";
    let workflowPollTimer = null;

    const elements = {
        status: document.getElementById("panel-status"),
        title: document.getElementById("panel-title"),
        meta: document.getElementById("panel-meta"),
        modeLabel: document.getElementById("panel-mode-label"),
        modeSelect: document.getElementById("panel-mode"),
        summary: document.getElementById("panel-summary"),
        takeaways: document.getElementById("panel-takeaways"),
        mainPointsWrap: document.getElementById("panel-main-points-wrap"),
        mainPoints: document.getElementById("panel-main-points"),
        detailsOfVideoWrap: document.getElementById("panel-details-of-video-wrap"),
        detailsOfVideo: document.getElementById("panel-details-of-video"),
        breakdownWrap: document.getElementById("panel-breakdown-wrap"),
        breakdown: document.getElementById("panel-breakdown"),
        commentaryWrap: document.getElementById("panel-commentary-wrap"),
        commentary: document.getElementById("panel-commentary"),
        followUpQuestionsWrap: document.getElementById("panel-follow-up-questions-wrap"),
        followUpQuestions: document.getElementById("panel-follow-up-questions"),
        summarizeBtn: document.getElementById("panel-summarize"),
        settingsBtn: document.getElementById("panel-settings"),
        copyBtn: document.getElementById("panel-copy"),
        exportMdBtn: document.getElementById("panel-export-md"),
        exportTxtBtn: document.getElementById("panel-export-txt"),
        transcriptToolsWrap: document.getElementById("panel-transcript-tools-wrap"),
        copyTranscriptBtn: document.getElementById("panel-copy-transcript"),
        exportTranscriptMdBtn: document.getElementById("panel-export-transcript-md"),
        exportTranscriptTxtBtn: document.getElementById("panel-export-transcript-txt"),
        transcriptContent: document.getElementById("panel-transcript-content"),
        clearBtn: document.getElementById("panel-clear"),
        chatLog: document.getElementById("chat-log"),
        chatInput: document.getElementById("chat-input"),
        chatSend: document.getElementById("chat-send")
    };

    function setStatus(message) {
        if (elements.status) {
            elements.status.textContent = message;
        }
    }

    function setButtonBusy(button, isBusy, busyLabel, defaultLabel) {
        if (!button) {
            return;
        }
        button.disabled = isBusy;
        button.textContent = isBusy ? busyLabel : defaultLabel;
    }

    function formatWorkflowStatus(workflow, fallbackResult) {
        if (!workflow) {
            return fallbackResult ? "Summary ready." : "Ready.";
        }
        if (workflow.phase === "failed") {
            return workflow.lastError || workflow.statusMessage || "Summary failed.";
        }
        if (workflow.phase === "completed") {
            return workflow.statusMessage || "Summary ready.";
        }
        if (workflow.statusMessage) {
            return workflow.statusMessage;
        }
        if (workflow.phase === "extracting") {
            return "Extracting current tab...";
        }
        if (workflow.phase === "summarizing") {
            return "Summarizing current tab...";
        }
        return fallbackResult ? "Summary ready." : "Ready.";
    }

    async function refreshWorkflowStatusOnly() {
        const workflowResponse = await sendRuntimeMessage({ type: MSG.GET_ACTIVE_TAB_WORKFLOW });
        const workflow = workflowResponse && workflowResponse.ok ? workflowResponse.workflow : null;
        if (workflowResponse && workflowResponse.tabId) {
            activeTabId = workflowResponse.tabId;
        }
        setStatus(formatWorkflowStatus(workflow, latestResult));
        if (!workflow || workflow.phase === "completed" || workflow.phase === "failed") {
            stopWorkflowPolling();
        }
    }

    function stopWorkflowPolling() {
        if (workflowPollTimer) {
            clearInterval(workflowPollTimer);
            workflowPollTimer = null;
        }
    }

    function startWorkflowPolling() {
        stopWorkflowPolling();
        workflowPollTimer = setInterval(() => {
            refreshWorkflowStatusOnly().catch(() => { });
        }, 600);
    }

    function renderResult(result) {
        latestResult = result;
        SummarizerSidepanelRender.renderResult(result, elements, askFollowUp);
    }

    async function sendRuntimeMessage(message) {
        return chrome.runtime.sendMessage(message);
    }

    async function refreshActiveTabView() {
        const sequence = refreshSequence + 1;
        refreshSequence = sequence;

        const [resultResponse, workflowResponse] = await Promise.all([
            sendRuntimeMessage({ type: MSG.GET_ACTIVE_TAB_RESULT }),
            sendRuntimeMessage({ type: MSG.GET_ACTIVE_TAB_WORKFLOW })
        ]);

        if (sequence !== refreshSequence) {
            return;
        }

        activeTabId = (resultResponse && resultResponse.tabId) || (workflowResponse && workflowResponse.tabId) || null;

        if (resultResponse && resultResponse.ok) {
            renderResult(resultResponse.result);
        } else {
            renderResult(null);
        }

        elements.chatLog.innerHTML = "";
        if (activeTabId) {
            await SummarizerSidepanelState.loadConversationHistory(activeTabId, appendChatEntry, elements.chatLog);
            if (sequence !== refreshSequence) {
                return;
            }
        }

        const workflow = workflowResponse && workflowResponse.ok ? workflowResponse.workflow : null;
        setStatus(formatWorkflowStatus(workflow, resultResponse && resultResponse.ok ? resultResponse.result : null));
        if (workflow && (workflow.phase === "extracting" || workflow.phase === "summarizing")) {
            startWorkflowPolling();
            return;
        }
        stopWorkflowPolling();
    }

    function appendChatEntry(role, text) {
        const node = document.createElement("div");
        node.className = "chat-entry " + role;
        node.innerHTML = SummarizerMarkdown.renderMarkdown(text);
        elements.chatLog.appendChild(node);
        elements.chatLog.scrollTop = elements.chatLog.scrollHeight;
    }

    function formatModeLabel(mode) {
        const value = String(mode || "summarize");
        return value.charAt(0).toUpperCase() + value.slice(1);
    }

    async function summarize(modeOverride) {
        const mode = modeOverride || elements.modeSelect.value;
        if (elements.modeSelect.value !== mode) {
            elements.modeSelect.value = mode;
        }
        SummarizerSidepanelRender.clearAllContent(elements);
        setStatus(formatModeLabel(mode) + " current tab...");
        setButtonBusy(elements.summarizeBtn, true, "Working...", defaultSummarizeLabel);
        startWorkflowPolling();
        try {
            const response = await chrome.runtime.sendMessage({
                type: MSG.SUMMARIZE_ACTIVE_TAB,
                mode,
                tabId: activeTabId
            });
            if (!response || !response.ok) {
                throw new Error((response && response.error) || "Summary failed.");
            }
            renderResult(response.result);
            setStatus("Summary ready.");
        } catch (error) {
            setStatus(error.message || "Summary failed.");
        } finally {
            stopWorkflowPolling();
            setButtonBusy(elements.summarizeBtn, false, "Working...", defaultSummarizeLabel);
        }
    }

    async function askFollowUp() {
        const question = elements.chatInput.value.trim();
        if (!question) {
            return;
        }
        appendChatEntry("question", question);
        elements.chatInput.value = "";
        setStatus("Generating follow-up answer...");
        setButtonBusy(elements.chatSend, true, "Sending...", "Send Question");

        try {
            const response = await chrome.runtime.sendMessage({
                type: MSG.DEEP_DIVE_ACTIVE_TAB,
                question,
                tabId: activeTabId
            });
            if (!response || !response.ok) {
                throw new Error((response && response.error) || "Follow-up failed.");
            }
            appendChatEntry("answer", response.result.answer || "");
            setStatus("Follow-up answer ready.");
        } catch (error) {
            appendChatEntry("answer", "Error: " + (error.message || "Follow-up failed."));
            setStatus(error.message || "Follow-up failed.");
        } finally {
            setButtonBusy(elements.chatSend, false, "Sending...", "Send Question");
        }
    }

    async function copySummary() {
        if (!latestResult) {
            return;
        }
        await navigator.clipboard.writeText(SummarizerExporters.toText(latestResult));
        setStatus("Copied summary to clipboard.");
    }

    function downloadFile(filename, content, type) {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = filename;
        anchor.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    function exportMarkdown() {
        if (!latestResult) {
            return;
        }
        const filename = SummarizerCleaners.sanitizeFilename(latestResult.title || "summary") + ".md";
        downloadFile(filename, SummarizerExporters.toMarkdown(latestResult), "text/markdown");
    }

    function exportText() {
        if (!latestResult) {
            return;
        }
        const filename = SummarizerCleaners.sanitizeFilename(latestResult.title || "summary") + ".txt";
        downloadFile(filename, SummarizerExporters.toText(latestResult), "text/plain");
    }

    function clearPanel() {
        renderResult(null);
        elements.chatLog.innerHTML = "";
        elements.followUpQuestions.innerHTML = "";
        setStatus("Ready.");
    }

    async function clearCurrentTabData() {
        if (!activeTabId) {
            clearPanel();
            return;
        }

        latestResult = null;
        await chrome.runtime.sendMessage({
            type: MSG.CLEAR_TAB_DATA,
            tabId: activeTabId
        });
        clearPanel();
    }

    async function copyTranscript() {
        if (!latestResult) {
            return;
        }
        const transcript = SummarizerExporters.toTranscriptText(latestResult);
        if (!transcript) {
            setStatus("No transcript available.");
            return;
        }
        await navigator.clipboard.writeText(transcript);
        setStatus("Copied transcript to clipboard.");
    }

    function exportTranscriptMarkdown() {
        if (!latestResult) {
            return;
        }
        const content = SummarizerExporters.toTranscriptMarkdown(latestResult);
        if (!content) {
            setStatus("No transcript available.");
            return;
        }
        const filename = SummarizerCleaners.sanitizeFilename((latestResult.title || "transcript") + "-transcript") + ".md";
        downloadFile(filename, content, "text/markdown");
    }

    function exportTranscriptText() {
        if (!latestResult) {
            return;
        }
        const content = SummarizerExporters.toTranscriptText(latestResult);
        if (!content) {
            setStatus("No transcript available.");
            return;
        }
        const filename = SummarizerCleaners.sanitizeFilename((latestResult.title || "transcript") + "-transcript") + ".txt";
        downloadFile(filename, content, "text/plain");
    }

    elements.summarizeBtn.addEventListener("click", () => summarize());
    elements.settingsBtn.addEventListener("click", () => chrome.runtime.openOptionsPage());
    elements.copyBtn.addEventListener("click", copySummary);
    elements.exportMdBtn.addEventListener("click", exportMarkdown);
    elements.exportTxtBtn.addEventListener("click", exportText);
    if (elements.copyTranscriptBtn) {
        elements.copyTranscriptBtn.addEventListener("click", copyTranscript);
    }
    if (elements.exportTranscriptMdBtn) {
        elements.exportTranscriptMdBtn.addEventListener("click", exportTranscriptMarkdown);
    }
    if (elements.exportTranscriptTxtBtn) {
        elements.exportTranscriptTxtBtn.addEventListener("click", exportTranscriptText);
    }
    elements.clearBtn.addEventListener("click", () => {
        clearCurrentTabData().catch((error) => {
            setStatus(error.message || "Failed to clear tab data.");
        });
    });
    elements.chatSend.addEventListener("click", askFollowUp);

    chrome.runtime.onMessage.addListener((message) => {
        if (message.type === MSG.SUMMARY_UPDATED) {
            if (message.tabId && activeTabId && message.tabId !== activeTabId) {
                return;
            }
            renderResult(message.result);
            elements.chatLog.innerHTML = "";
            if (message.tabId) {
                activeTabId = message.tabId;
                SummarizerSidepanelState.loadConversationHistory(message.tabId, appendChatEntry, elements.chatLog);
            }
            setStatus("Summary updated.");
            stopWorkflowPolling();
        }
        if (message.type === MSG.SUMMARY_ERROR) {
            if (message.tabId && activeTabId && message.tabId !== activeTabId) {
                return;
            }
            setStatus(message.error || "Summary failed.");
            stopWorkflowPolling();
        }
        if (message.type === MSG.SETTINGS_UPDATED) {
            SummarizerSidepanelState.loadSettings(elements)
                .then(() => SummarizerSidepanelState.applyFontSizeSettings())
                .catch((error) => {
                    setStatus(error.message || "Failed to refresh settings.");
                });
        }
    });

    chrome.tabs.onActivated.addListener(() => {
        refreshActiveTabView().catch((error) => {
            setStatus(error.message || "Failed to load tab state.");
        });
    });
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
        if (tab.active && changeInfo.status === "loading") {
            refreshActiveTabView().catch((error) => {
                setStatus(error.message || "Failed to load tab state.");
            });
        }
        if (tab.active && changeInfo.status === "complete") {
            refreshActiveTabView().catch((error) => {
                setStatus(error.message || "Failed to load tab state.");
            });
        }
    });

    SummarizerSidepanelState.loadSettings(elements).catch((error) => {
        setStatus(error.message || "Failed to load settings.");
    });
    SummarizerSidepanelState.applyFontSizeSettings().catch((error) => {
        setStatus(error.message || "Failed to apply settings.");
    });
    SummarizerSidepanelRender.setupCollapsibleSections();
    refreshActiveTabView().catch((error) => {
        setStatus(error.message || "Failed to load tab state.");
    });
})();
