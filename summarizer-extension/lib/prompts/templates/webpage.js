(function () {
    function buildWebpageSectionPlan(settings) {
        const common = SummarizerPromptCommon;
        const modeInstructions = common.getModeInstructions(common.getPromptMode(settings));
        return common.applyModeToSectionPlan(
            common.getSummarySectionPlan("webpage", settings),
            modeInstructions
        );
    }

    function buildWebpagePrompt(context, settings) {
        const common = SummarizerPromptCommon;
        const sourceHint = common.getSourceSpecificHint("webpage", settings);
        const modeHint = common.getModeSpecificHint(common.getPromptMode(settings), settings);
        const customInstructions = settings.customPromptInstructions || "";
        const customSystemInstructions = settings.customSystemInstructions || "";
        const modeInstructions = common.getModeInstructions(common.getPromptMode(settings));

        return common.buildPromptEnvelope({
            role: "You are an Expert Deep Summarizer specializing in web content analysis.",
            sourceType: "webpage",
            settings,
            customInstructions,
            customSystemInstructions,
            sourceHint,
            sourceHintLabel: "Webpage-specific guidance",
            modeHint,
            sourceContext: [
                "Source: Full webpage or site content",
                "May include primary content, supporting sections, and useful on-page context."
            ],
            task: [
                modeInstructions.primaryGoal,
                "Focus on main arguments, important facts, evidence, conclusions, and useful context from the page."
            ],
            sectionPlan: buildWebpageSectionPlan(settings),
            detailsSection: [
                "=== PAGE DETAILS ===",
                `Title: ${context.title}`,
                `URL: ${context.url}`
            ],
            contentSection: [
                "=== CONTENT ===",
                context.content
            ]
        });
    }

    function buildWebpageChunkPrompt(context, chunk, index, total, settings) {
        const common = SummarizerPromptCommon;
        const modeInstructions = common.getModeInstructions(common.getPromptMode(settings));

        return common.buildPromptEnvelope({
            role: "You are summarizing one chunk of a long webpage or document for later synthesis.",
            sourceType: "webpage",
            settings,
            sourceContext: [
                `Chunk label: ${common.buildChunkHeader("Webpage", index, total)}.`,
                "Summarize only this chunk and preserve claims, evidence, examples, names, numbers, and useful context."
            ],
            task: [
                modeInstructions.primaryGoal,
                "Do not optimize for brevity if it would lose important information needed for final synthesis."
            ],
            sectionPlan: common.buildInternalSectionPlan("webpageChunk"),
            detailsSection: [
                "=== PAGE DETAILS ===",
                `Title: ${context.title}`,
                `URL: ${context.url}`
            ],
            contentSection: [
                "=== CHUNK CONTENT ===",
                chunk
            ]
        });
    }

    function buildWebpageSynthesisPrompt(context, chunkSummaries, settings) {
        const common = SummarizerPromptCommon;
        const modeInstructions = common.getModeInstructions(common.getPromptMode(settings));

        return common.buildPromptEnvelope({
            role: "You are synthesizing chunk summaries from a long webpage or document into one final answer.",
            sourceType: "webpage",
            settings,
            sourceContext: [
                "Source: Chunk summaries from one webpage or document.",
                "Combine them into a cohesive final summary while preserving argument structure, evidence, and nuance."
            ],
            task: [
                modeInstructions.primaryGoal,
                "Produce one final answer that reads as a complete summary rather than stitched chunk notes."
            ],
            sectionPlan: buildWebpageSectionPlan(settings),
            detailsSection: [
                "=== PAGE DETAILS ===",
                `Title: ${context.title}`,
                `URL: ${context.url}`
            ],
            contentSection: [
                "=== CHUNK SUMMARIES TO COMBINE ===",
                chunkSummaries.map((item, summaryIndex) => `### Chunk ${summaryIndex + 1}\n${item}`).join("\n\n")
            ]
        });
    }

    globalThis.SummarizerWebpagePromptTemplate = {
        buildWebpagePrompt,
        buildWebpageChunkPrompt,
        buildWebpageSynthesisPrompt
    };
})();
