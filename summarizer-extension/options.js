(function () {
    const MSG = SummarizerMessages.types;
    const fields = {
        provider: document.getElementById("provider"),
        promptMode: document.getElementById("promptMode"),
        temperature: document.getElementById("temperature"),
        summarySize: document.getElementById("summarySize"),
        summaryLanguage: document.getElementById("summaryLanguage"),
        summaryTone: document.getElementById("summaryTone"),
        sidepanelFontSize: document.getElementById("sidepanelFontSize"),
        customPromptInstructions: document.getElementById("customPromptInstructions"),
        customSystemInstructions: document.getElementById("customSystemInstructions"),
        youtubePromptHint: document.getElementById("youtubePromptHint"),
        webpagePromptHint: document.getElementById("webpagePromptHint"),
        coursePromptHint: document.getElementById("coursePromptHint"),
        selectedTextPromptHint: document.getElementById("selectedTextPromptHint"),
        analyzePromptHint: document.getElementById("analyzePromptHint"),
        explainPromptHint: document.getElementById("explainPromptHint"),
        debatePromptHint: document.getElementById("debatePromptHint"),
        studyPromptHint: document.getElementById("studyPromptHint"),
        outlinePromptHint: document.getElementById("outlinePromptHint"),
        timelinePromptHint: document.getElementById("timelinePromptHint"),
        showFloatingUi: document.getElementById("showFloatingUi"),
        generateFollowUpQuestions: document.getElementById("generateFollowUpQuestions"),
        geminiApiKey: document.getElementById("geminiApiKey"),
        geminiModel: document.getElementById("geminiModel"),
        openaiApiKey: document.getElementById("openaiApiKey"),
        openaiBaseUrl: document.getElementById("openaiBaseUrl"),
        openaiModel: document.getElementById("openaiModel"),
        localBaseUrl: document.getElementById("localBaseUrl"),
        localModel: document.getElementById("localModel"),
        localEndpointType: document.getElementById("localEndpointType"),
        saveBtn: document.getElementById("save-settings"),
        saveStatus: document.getElementById("save-status")
    };

    function normalizeTemperature(value) {
        const parsed = Number.parseFloat(value);
        if (!Number.isFinite(parsed)) {
            return 0.4;
        }
        return Math.min(2, Math.max(0, parsed));
    }

    // Tab functionality
    function setupTabs() {
        const tabBtns = document.querySelectorAll(".tab-btn");
        const tabContents = document.querySelectorAll(".tab-content");

        tabBtns.forEach(btn => {
            btn.addEventListener("click", () => {
                // Remove active class from all buttons and contents
                tabBtns.forEach(b => b.classList.remove("active"));
                tabContents.forEach(c => c.classList.remove("active"));

                // Add active class to clicked button and corresponding content
                btn.classList.add("active");
                const tabId = btn.getAttribute("data-tab");
                const tabContent = document.getElementById(`tab-${tabId}`);
                if (tabContent) {
                    tabContent.classList.add("active");
                }
            });
        });
    }

    async function loadSettings() {
        const settings = await SummarizerStorage.getSettings();
        fields.provider.value = settings.provider;
        fields.promptMode.value = settings.promptMode || "summarize";
        fields.temperature.value = String(normalizeTemperature(settings.temperature));
        fields.summarySize.value = settings.summarySize || "Medium";
        fields.summaryLanguage.value = settings.summaryLanguage;
        fields.summaryTone.value = settings.summaryTone || "Simple";
        fields.sidepanelFontSize.value = settings.sidepanelFontSize || "14";
        fields.customPromptInstructions.value = settings.customPromptInstructions;
        fields.customSystemInstructions.value = settings.customSystemInstructions || "";
        fields.youtubePromptHint.value = settings.youtubePromptHint;
        fields.webpagePromptHint.value = settings.webpagePromptHint;
        fields.coursePromptHint.value = settings.coursePromptHint || "";
        fields.selectedTextPromptHint.value = settings.selectedTextPromptHint;
        fields.analyzePromptHint.value = settings.analyzePromptHint || "";
        fields.explainPromptHint.value = settings.explainPromptHint || "";
        fields.debatePromptHint.value = settings.debatePromptHint || "";
        fields.studyPromptHint.value = settings.studyPromptHint || "";
        fields.outlinePromptHint.value = settings.outlinePromptHint || "";
        fields.timelinePromptHint.value = settings.timelinePromptHint || "";
        fields.showFloatingUi.checked = settings.showFloatingUi !== false;
        fields.generateFollowUpQuestions.checked = settings.generateFollowUpQuestions !== false;

        fields.geminiApiKey.value = settings.gemini.apiKey || "";
        fields.geminiModel.value = settings.gemini.model || "";

        fields.openaiApiKey.value = settings.openai.apiKey || "";
        fields.openaiBaseUrl.value = settings.openai.baseUrl || "";
        fields.openaiModel.value = settings.openai.model || "";

        fields.localBaseUrl.value = settings.local.baseUrl || "";
        fields.localModel.value = settings.local.model || "";
        fields.localEndpointType.value = settings.local.endpointType || "ollama";
    }

    async function saveSettings() {
        fields.saveBtn.disabled = true;
        fields.saveStatus.textContent = "Saving...";

        try {
            const nextSettings = {
                provider: fields.provider.value,
                promptMode: fields.promptMode.value || "summarize",
                temperature: normalizeTemperature(fields.temperature.value),
                summarySize: fields.summarySize.value || "Medium",
                summaryLanguage: fields.summaryLanguage.value.trim() || "English",
                summaryTone: fields.summaryTone.value.trim() || "Simple",
                sidepanelFontSize: fields.sidepanelFontSize.value || "14",
                customPromptInstructions: fields.customPromptInstructions.value.trim(),
                customSystemInstructions: fields.customSystemInstructions.value.trim(),
                youtubePromptHint: fields.youtubePromptHint.value.trim(),
                webpagePromptHint: fields.webpagePromptHint.value.trim(),
                coursePromptHint: fields.coursePromptHint.value.trim(),
                selectedTextPromptHint: fields.selectedTextPromptHint.value.trim(),
                analyzePromptHint: fields.analyzePromptHint.value.trim(),
                explainPromptHint: fields.explainPromptHint.value.trim(),
                debatePromptHint: fields.debatePromptHint.value.trim(),
                studyPromptHint: fields.studyPromptHint.value.trim(),
                outlinePromptHint: fields.outlinePromptHint.value.trim(),
                timelinePromptHint: fields.timelinePromptHint.value.trim(),
                showFloatingUi: fields.showFloatingUi.checked,
                generateFollowUpQuestions: fields.generateFollowUpQuestions.checked,
                gemini: {
                    apiKey: fields.geminiApiKey.value.trim(),
                    model: fields.geminiModel.value.trim() || "gemini-3.1-flash-lite-preview"
                },
                openai: {
                    apiKey: fields.openaiApiKey.value.trim(),
                    baseUrl: fields.openaiBaseUrl.value.trim() || "https://api.openai.com/v1",
                    model: fields.openaiModel.value.trim() || "gpt-4o-mini"
                },
                local: {
                    baseUrl: fields.localBaseUrl.value.trim() || "http://127.0.0.1:11434",
                    model: fields.localModel.value.trim() || "llama3.1",
                    endpointType: fields.localEndpointType.value || "ollama"
                }
            };

            const savedSettings = await SummarizerStorage.saveSettings(nextSettings);
            try {
                await chrome.runtime.sendMessage({
                    type: MSG.SETTINGS_UPDATED,
                    settings: savedSettings
                });
            } catch (_) {
                // The settings are already saved locally; the next view refresh will pick them up.
            }
            fields.saveStatus.textContent = "✓ Settings saved successfully";
        } catch (error) {
            fields.saveStatus.textContent = error.message || "Failed to save settings.";
        } finally {
            fields.saveBtn.disabled = false;
        }

        // Clear the success message after 3 seconds
        setTimeout(() => {
            fields.saveStatus.textContent = "";
        }, 3000);
    }

    fields.saveBtn.addEventListener("click", saveSettings);
    setupTabs();
    loadSettings().catch(() => {
        fields.saveStatus.textContent = "Failed to load settings.";
    });
})();
