(function () {
    function buildCourseSectionPlan(settings) {
        const common = SummarizerPromptCommon;
        const modeInstructions = common.getModeInstructions(common.getPromptMode(settings));
        return common.applyModeToSectionPlan(
            common.getSummarySectionPlan("course", settings),
            modeInstructions
        );
    }

    function buildCoursePrompt(context, settings) {
        const common = SummarizerPromptCommon;
        const sourceHint = common.getSourceSpecificHint("course", settings);
        const modeHint = common.getModeSpecificHint(common.getPromptMode(settings), settings);
        const customInstructions = settings.customPromptInstructions || "";
        const customSystemInstructions = settings.customSystemInstructions || "";
        const modeInstructions = common.getModeInstructions(common.getPromptMode(settings));

        return common.buildPromptEnvelope({
            role: "You are an expert learning-content summarizer specializing in course lessons, transcripts, and instructional material.",
            sourceType: "course",
            settings,
            customInstructions,
            customSystemInstructions,
            taskAugmentations: modeInstructions.taskAugmentations,
            sourceHint,
            sourceHintLabel: "Course-specific guidance",
            modeHint,
            sourceContext: [
                "Source: Course lesson or course transcript",
                "Treat the content as educational material and preserve definitions, explanations, examples, and learner-relevant takeaways."
            ],
            task: [
                modeInstructions.primaryGoal,
                "Preserve the core teaching flow, important examples, terminology, and what the learner should understand or retain.",
                "If the lesson skips steps or assumes prior knowledge, label that missing context instead of inventing it."
            ],
            sectionPlan: buildCourseSectionPlan(settings),
            detailsSection: [
                "=== LESSON DETAILS ===",
                `Title: ${context.title}`,
                `URL: ${context.url}`
            ],
            contentSection: [
                "=== LESSON CONTENT ===",
                context.content
            ]
        });
    }

    function buildCourseChunkPrompt(context, chunk, index, total, settings) {
        const common = SummarizerPromptCommon;
        const modeInstructions = common.getModeInstructions(common.getPromptMode(settings));

        return common.buildPromptEnvelope({
            role: "You are summarizing one chunk of a long course lesson or transcript for later synthesis.",
            sourceType: "course",
            settings,
            taskAugmentations: modeInstructions.taskAugmentations,
            sourceContext: [
                `Chunk label: ${common.buildChunkHeader("Course lesson", index, total)}.`,
                "Summarize only this chunk and preserve definitions, examples, instructional steps, names, numbers, and what a learner should retain."
            ],
            task: [
                modeInstructions.primaryGoal,
                "Capture the chunk clearly enough that a later synthesis pass can reconstruct the lesson flow."
            ],
            sectionPlan: common.buildInternalSectionPlan("courseChunk"),
            detailsSection: [
                "=== LESSON DETAILS ===",
                `Title: ${context.title}`,
                `URL: ${context.url}`
            ],
            contentSection: [
                "=== CHUNK CONTENT ===",
                chunk
            ]
        });
    }

    function buildCourseSynthesisPrompt(context, chunkSummaries, settings) {
        const common = SummarizerPromptCommon;
        const modeInstructions = common.getModeInstructions(common.getPromptMode(settings));

        return common.buildPromptEnvelope({
            role: "You are synthesizing chunk summaries from a long course lesson into one final answer.",
            sourceType: "course",
            settings,
            taskAugmentations: modeInstructions.taskAugmentations,
            sourceContext: [
                "Source: Chunk summaries from one course lesson or transcript.",
                "Combine them into a cohesive learning-oriented final summary."
            ],
            task: [
                modeInstructions.primaryGoal,
                "Preserve instructional flow, key concepts, examples, and learner-relevant takeaways.",
                "Merge overlapping chunk content without repetition.",
                "If chunk summaries conflict or omit connective steps, preserve that uncertainty instead of inventing lesson flow.",
                "Favor accurate reconstruction of the teaching sequence over polished but unsupported transitions."
            ],
            sectionPlan: buildCourseSectionPlan(settings),
            detailsSection: [
                "=== LESSON DETAILS ===",
                `Title: ${context.title}`,
                `URL: ${context.url}`
            ],
            contentSection: [
                "=== CHUNK SUMMARIES TO COMBINE ===",
                chunkSummaries.map((item, summaryIndex) => `### Chunk ${summaryIndex + 1}\n${item}`).join("\n\n")
            ]
        });
    }

    globalThis.SummarizerCoursePromptTemplate = {
        buildCoursePrompt,
        buildCourseChunkPrompt,
        buildCourseSynthesisPrompt
    };
})();
