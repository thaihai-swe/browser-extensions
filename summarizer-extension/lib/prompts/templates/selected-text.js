(function () {
    function buildSelectedTextSectionPlan(settings) {
        const common = SummarizerPromptCommon;
        const modeInstructions = common.getModeInstructions(common.getPromptMode(settings));
        return common.applyModeToSectionPlan(
            common.getSummarySectionPlan("selectedText", settings),
            modeInstructions
        );
    }

    function buildSelectedTextPrompt(context, settings) {
        const common = SummarizerPromptCommon;
        const sourceHint = common.getSourceSpecificHint("selectedText", settings);
        const modeHint = common.getModeSpecificHint(common.getPromptMode(settings), settings);
        const customInstructions = settings.customPromptInstructions || "";
        const customSystemInstructions = settings.customSystemInstructions || "";
        const modeInstructions = common.getModeInstructions(common.getPromptMode(settings));

        return common.buildPromptEnvelope({
            role: "You are an Expert Analyzer of selected text excerpts.",
            sourceType: "selectedText",
            settings,
            customInstructions,
            customSystemInstructions,
            sourceHint,
            sourceHintLabel: "Text-specific guidance",
            modeHint,
            sourceContext: [
                "Source: User-selected text excerpt"
            ],
            task: [
                modeInstructions.primaryGoal,
                "Preserve the author's meaning, then add useful context, explanation, or analysis."
            ],
            sectionPlan: buildSelectedTextSectionPlan(settings),
            detailsSection: [
                "=== EXCERPT DETAILS ===",
                `Source title: ${context.title}`,
                `Source URL: ${context.url}`
            ],
            contentSection: [
                "=== SELECTED TEXT ===",
                context.content
            ]
        });
    }

    globalThis.SummarizerSelectedTextPromptTemplate = {
        buildSelectedTextPrompt
    };
})();
