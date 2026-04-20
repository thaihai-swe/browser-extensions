(function () {
    function buildYoutubeSectionPlan(settings) {
        const common = SummarizerPromptCommon;
        const modeInstructions = common.getModeInstructions(common.getPromptMode(settings));
        return common.applyModeToSectionPlan(
            common.getSummarySectionPlan("youtube", settings),
            modeInstructions
        );
    }

    function buildYoutubePrompt(context, settings) {
        const common = SummarizerPromptCommon;
        const sourceHint = common.getSourceSpecificHint("youtube", settings);
        const modeHint = common.getModeSpecificHint(common.getPromptMode(settings), settings);
        const customInstructions = settings.customPromptInstructions || "";
        const customSystemInstructions = settings.customSystemInstructions || "";
        const modeInstructions = common.getModeInstructions(common.getPromptMode(settings));
        const transcriptForPrompt = context.contentForPrompt || context.content || "";

        return common.buildPromptEnvelope({
            role: "You are an expert content summarizer specializing in YouTube video transcripts.",
            sourceType: "youtube",
            settings,
            customInstructions,
            customSystemInstructions,
            taskAugmentations: modeInstructions.taskAugmentations,
            sourceHint,
            sourceHintLabel: "YouTube-specific guidance",
            modeHint,
            sourceContext: [
                "Source: YouTube video transcript",
                "Format: Timestamped video transcript with optional chapters and metadata",
                "Use only timestamps that appear in the provided transcript or chapter metadata."
            ],
            task: [
                modeInstructions.primaryGoal,
                "Focus on main topics, supporting evidence, important examples, technical details, and practical applications.",
                "Preserve important names, numbers, terms, and examples.",
                "Remove filler and repetition, but do not lose important context.",
                "When the transcript is ambiguous or incomplete, say so instead of inventing missing transitions or scenes."
            ],
            sectionPlan: buildYoutubeSectionPlan(settings),
            detailsSection: [
                "=== KEY REQUIREMENTS ===",
                "Details of the Video must include timeline headings with timestamps like [41:20] when the transcript supports them.",
                "Do not collapse the video into only a short overview when deep detail is requested.",
                "Details of the Video should be richer and longer than a bare outline. Follow the transcript closely and retain important content.",
                "Use concise bullets under timeline headings when helpful.",
                "",
                "=== VIDEO DETAILS ===",
                common.buildYoutubeMetadataBlock(context)
            ],
            contentSection: [
                "=== TRANSCRIPT ===",
                transcriptForPrompt
            ]
        });
    }

    function buildYoutubeChunkPrompt(context, chunk, index, total, settings) {
        const common = SummarizerPromptCommon;
        const modeInstructions = common.getModeInstructions(common.getPromptMode(settings));

        return common.buildPromptEnvelope({
            role: "You are summarizing one chunk of a long YouTube transcript for later synthesis.",
            sourceType: "youtube",
            settings,
            taskAugmentations: modeInstructions.taskAugmentations,
            sourceContext: [
                `Chunk label: ${common.buildChunkHeader("YouTube transcript", index, total)}.`,
                "Summarize only this chunk. Preserve timestamps, transitions, examples, names, numbers, and technical details.",
                "Use only timestamps that appear in this chunk."
            ],
            task: [
                modeInstructions.primaryGoal,
                "Capture the key content of this chunk so a later synthesis pass can combine it without losing timeline flow."
            ],
            sectionPlan: common.buildInternalSectionPlan("youtubeChunk"),
            detailsSection: [
                "=== VIDEO DETAILS ===",
                common.buildYoutubeMetadataBlock(context)
            ],
            contentSection: [
                "=== CHUNK TRANSCRIPT ===",
                chunk
            ]
        });
    }

    function buildYoutubeSynthesisPrompt(context, chunkSummaries, settings) {
        const common = SummarizerPromptCommon;
        const modeInstructions = common.getModeInstructions(common.getPromptMode(settings));

        return common.buildPromptEnvelope({
            role: "You are synthesizing chunk summaries from a long YouTube transcript into one final answer.",
            sourceType: "youtube",
            settings,
            taskAugmentations: modeInstructions.taskAugmentations,
            sourceContext: [
                "Source: Chunk summaries from one YouTube transcript.",
                "Combine them into one cohesive final summary without losing the overall flow of the video."
            ],
            task: [
                modeInstructions.primaryGoal,
                "Preserve timeline structure for major segments.",
                "Keep Main Points conceptual and non-timeline when possible.",
                "Put the richer timestamped material into Details of the Video and keep it content-rich.",
                "Merge overlapping chunk content without repetition.",
                "If chunk summaries appear to conflict or leave gaps, preserve that uncertainty instead of inventing continuity.",
                "Only describe transitions or chronology that are supported by the chunk summaries."
            ],
            sectionPlan: buildYoutubeSectionPlan(settings),
            detailsSection: [
                "=== VIDEO DETAILS ===",
                common.buildYoutubeMetadataBlock(context)
            ],
            contentSection: [
                "=== CHUNK SUMMARIES TO COMBINE ===",
                chunkSummaries.map((item, summaryIndex) => `### Chunk ${summaryIndex + 1}\n${item}`).join("\n\n")
            ]
        });
    }

    globalThis.SummarizerYoutubePromptTemplate = {
        buildYoutubePrompt,
        buildYoutubeChunkPrompt,
        buildYoutubeSynthesisPrompt
    };
})();
