(function () {
    const WEBPAGE_LONG_CONTENT_THRESHOLD = 60000;
    const COURSE_LONG_CONTENT_THRESHOLD = 50000;
    const YOUTUBE_LONG_CONTENT_THRESHOLD = 24000;
    const CHUNK_TARGET_LENGTH = 12000;
    const YOUTUBE_MAX_REQUESTS = 4;
    const YOUTUBE_MAX_CHUNKS = YOUTUBE_MAX_REQUESTS - 1;
    const WEBPAGE_MAX_REQUESTS = 4;
    const COURSE_MAX_REQUESTS = 4;
    const inFlightSummaries = new Map();

    function buildResultFromExtraction(parsed, extracted, settings, providerId, tabId, executionDetails) {
        const providerLabel =
            (SummarizerProviders.providers[providerId] || {}).label || providerId;
        const details = executionDetails || {};

        return {
            id: Date.now(),
            tabId,
            provider: providerId,
            providerLabel,
            model: ((settings[providerId] || {}).model || "").trim(),
            title: extracted.title,
            url: extracted.url,
            sourceType: extracted.sourceType,
            promptMode: settings.promptMode,
            sourceContent: extracted.content,
            sourceContentRaw: extracted.contentRaw || extracted.content || "",
            sourceContentForPrompt: extracted.contentForPrompt || extracted.content || "",
            transcriptSegments: extracted.transcriptSegments || [],
            videoDetails: extracted.videoDetails || null,
            summary: parsed.summary,
            executiveSummary: parsed.executiveSummary || parsed.summary,
            keyTakeaways: parsed.keyTakeaways,
            coreIdeas: parsed.coreIdeas || parsed.mainPoints,
            flowStructure: parsed.flowStructure || parsed.detailsOfVideo,
            evidenceExamples: parsed.evidenceExamples || parsed.detailedBreakdown,
            nuancesCaveats: parsed.nuancesCaveats || parsed.expertCommentary,
            practicalImplications: parsed.practicalImplications || "",
            mainPoints: parsed.coreIdeas || parsed.mainPoints,
            detailsOfVideo: parsed.flowStructure || parsed.detailsOfVideo,
            detailedBreakdown: parsed.evidenceExamples || parsed.detailedBreakdown,
            expertCommentary: parsed.nuancesCaveats || parsed.expertCommentary,
            followUpQuestions: parsed.followUpQuestions || [],
            rawText: parsed.rawText,
            summaryStrategy: details.strategy || "single",
            requestCount: details.requestCount || 1,
            chunkCount: details.chunkCount || 0,
            generatedAt: new Date().toISOString()
        };
    }

    function splitIntoChunks(text, targetLength) {
        const source = SummarizerCleaners.cleanText(text);
        if (!source) {
            return [];
        }

        const chunks = [];
        const units = source.includes("\n") ? source.split(/\n+/) : source.split(/(?<=\.)\s+/);
        let current = "";

        units.forEach((unit) => {
            const part = SummarizerCleaners.cleanText(unit);
            if (!part) {
                return;
            }

            const candidate = current ? current + "\n" + part : part;
            if (candidate.length > targetLength && current) {
                chunks.push(current);
                current = part;
                return;
            }

            if (part.length > targetLength) {
                if (current) {
                    chunks.push(current);
                    current = "";
                }
                let remaining = part;
                while (remaining.length > targetLength) {
                    chunks.push(remaining.slice(0, targetLength));
                    remaining = remaining.slice(targetLength);
                }
                current = remaining;
                return;
            }

            current = candidate;
        });

        if (current) {
            chunks.push(current);
        }

        return chunks.filter(Boolean);
    }

    function splitIntoBalancedChunks(text, maxChunks) {
        const source = SummarizerCleaners.cleanText(text);
        const limit = Math.max(1, Number(maxChunks || 1));
        if (!source) {
            return [];
        }

        const initialChunks = splitIntoChunks(source, Math.max(1, Math.ceil(source.length / limit)));
        if (initialChunks.length <= limit) {
            return initialChunks;
        }

        const mergedChunks = [];
        let startIndex = 0;
        for (let slot = 0; slot < limit; slot += 1) {
            const remainingChunks = initialChunks.length - startIndex;
            const remainingSlots = limit - slot;
            const takeCount = Math.ceil(remainingChunks / remainingSlots);
            mergedChunks.push(
                SummarizerCleaners.cleanText(
                    initialChunks.slice(startIndex, startIndex + takeCount).filter(Boolean).join("\n\n")
                )
            );
            startIndex += takeCount;
        }

        return mergedChunks.filter(Boolean);
    }

    function shouldUseProgressiveSummarization(extracted) {
        const sourceType = extracted.sourceType;
        const sourceText = extracted.contentRaw || extracted.contentForPrompt || extracted.content || "";
        if (!sourceText) {
            return false;
        }

        if (sourceType === "webpage") {
            return sourceText.length > WEBPAGE_LONG_CONTENT_THRESHOLD;
        }
        if (sourceType === "course") {
            return sourceText.length > COURSE_LONG_CONTENT_THRESHOLD;
        }

        return false;
    }

    function shouldUseYoutubeChunking(extracted) {
        if (!extracted || extracted.sourceType !== "youtube") {
            return false;
        }

        const sourceText = extracted.contentRaw || extracted.contentForPrompt || extracted.content || "";
        return sourceText.length > YOUTUBE_LONG_CONTENT_THRESHOLD;
    }

    function getSourceLabel(extracted) {
        if (!extracted) {
            return "content";
        }
        if (extracted.sourceType === "youtube") {
            return "YouTube transcript";
        }
        if (extracted.sourceType === "course") {
            return "course lesson";
        }
        if (extracted.sourceType === "selectedText") {
            return "selected text";
        }
        return "webpage content";
    }

    function getExtractionStatusLabel(tabUrl) {
        const url = String(tabUrl || "");
        if (/https?:\/\/(www\.)?youtube\.com\/(watch|live)/i.test(url)) {
            return "Fetching YouTube transcript...";
        }
        if (/coursera\.org\/learn\/.+\/(lecture|supplement)\//i.test(url)) {
            return "Reading Coursera lesson...";
        }
        if (/udemy\.com\/course\/.+\/learn\//i.test(url)) {
            return "Reading Udemy lesson...";
        }
        return "Extracting webpage content...";
    }

    async function summarizeWithBoundedChunking(extracted, settings, providerId, options) {
        const config = options || {};
        const sourceText = extracted.contentRaw || extracted.contentForPrompt || extracted.content || "";
        const maxRequests = Math.max(2, Number(config.maxRequests || 4));
        const maxChunks = Math.max(1, maxRequests - 1);
        const chunks = splitIntoBalancedChunks(sourceText, maxChunks);

        if (chunks.length <= 1) {
            const prompt = SummarizerPrompts.buildSummaryPrompt(extracted, settings);
            await SummarizerWorkflowStore.markSummarizing(config.tabId, {
                stage: "preparing",
                statusMessage: `Preparing ${getSourceLabel(extracted)} summary...`,
                requestCount: 1,
                requestTotal: 1,
                chunkIndex: 0,
                chunkTotal: 0
            });
            const text = await SummarizerProviders.generateText(providerId, prompt, settings);
            return {
                text,
                strategy: "single",
                requestCount: 1,
                chunkCount: 0
            };
        }

        const chunkSummaries = [];
        for (let index = 0; index < chunks.length; index += 1) {
            await SummarizerWorkflowStore.markSummarizing(config.tabId, {
                stage: "summarizing",
                statusMessage: `Summarizing chunk ${index + 1} of ${chunks.length}...`,
                requestCount: index + 1,
                requestTotal: chunks.length + 1,
                chunkIndex: index + 1,
                chunkTotal: chunks.length
            });
            const chunkPrompt = SummarizerPrompts.buildChunkSummaryPrompt(
                extracted,
                chunks[index],
                index,
                chunks.length,
                settings
            );
            const chunkSummary = await SummarizerProviders.generateText(providerId, chunkPrompt, settings);
            chunkSummaries.push(SummarizerCleaners.cleanText(chunkSummary));
        }

        await SummarizerWorkflowStore.markSummarizing(config.tabId, {
            stage: "summarizing",
            statusMessage: `Combining ${chunks.length} chunk summaries...`,
            requestCount: chunks.length + 1,
            requestTotal: chunks.length + 1,
            chunkIndex: chunks.length,
            chunkTotal: chunks.length
        });
        const finalPrompt = SummarizerPrompts.buildSynthesisPrompt(extracted, chunkSummaries, settings);
        const text = await SummarizerProviders.generateText(providerId, finalPrompt, settings);
        return {
            text,
            strategy: "bounded-chunking",
            requestCount: chunks.length + 1,
            chunkCount: chunks.length
        };
    }

    async function summarizeYoutubeWithCap(extracted, settings, providerId) {
        return summarizeWithBoundedChunking(extracted, settings, providerId, {
            tabId: extracted.tabId,
            maxRequests: YOUTUBE_MAX_REQUESTS
        });
    }

    function ensureTabIsOpen(tabId) {
        return new Promise((resolve, reject) => {
            chrome.tabs.get(tabId, (tab) => {
                if (chrome.runtime.lastError || !tab || !tab.id) {
                    reject(new Error("Tab was closed before summarization completed."));
                    return;
                }
                resolve(tab);
            });
        });
    }

    async function generateSummaryText(extracted, settings, providerId, tabId) {
        if (shouldUseYoutubeChunking(extracted)) {
            return summarizeYoutubeWithCap({ ...extracted, tabId }, settings, providerId);
        }

        if (shouldUseProgressiveSummarization(extracted)) {
            return summarizeWithBoundedChunking(extracted, settings, providerId, {
                tabId,
                maxRequests: extracted.sourceType === "course" ? COURSE_MAX_REQUESTS : WEBPAGE_MAX_REQUESTS
            });
        }

        await SummarizerWorkflowStore.markSummarizing(tabId, {
            stage: "preparing",
            statusMessage: `Preparing ${getSourceLabel(extracted)} summary...`,
            requestCount: 1,
            requestTotal: 1,
            chunkIndex: 0,
            chunkTotal: 0
        });
        const text = await SummarizerProviders.generateText(
            providerId,
            SummarizerPrompts.buildSummaryPrompt(extracted, settings),
            settings
        );
        return {
            text,
            strategy: "single",
            requestCount: 1,
            chunkCount: 0
        };
    }

    async function summarizeForTab(tabId) {
        if (inFlightSummaries.has(tabId)) {
            return inFlightSummaries.get(tabId);
        }

        const job = (async () => {
            const startTime = Date.now();
            const settings = await SummarizerStorage.getSettings();
            await SummarizerWorkflowStore.markExtracting(tabId, {
                lastMode: settings.promptMode,
                sourceType: "",
                hasTranscript: false,
                statusMessage: "Inspecting current tab..."
            });
            let tabUrl = "";
            try {
                const tab = await ensureTabIsOpen(tabId);
                tabUrl = tab.url || "";
            } catch (_) {
                tabUrl = "";
            }
            await SummarizerWorkflowStore.markExtracting(tabId, {
                lastMode: settings.promptMode,
                sourceType: "",
                hasTranscript: false,
                statusMessage: getExtractionStatusLabel(tabUrl)
            });
            const extracted = await SummarizerTabManager.requestExtraction(tabId);
            const providerId = settings.provider;
            await SummarizerWorkflowStore.markSummarizing(tabId, {
                stage: "preparing",
                lastMode: settings.promptMode,
                sourceType: extracted.sourceType,
                hasTranscript: Boolean(extracted.transcriptSegments && extracted.transcriptSegments.length),
                title: extracted.title,
                statusMessage: `Preparing ${getSourceLabel(extracted)} summary...`
            });
            const execution = await generateSummaryText(extracted, settings, providerId, tabId);
            await SummarizerWorkflowStore.markSummarizing(tabId, {
                stage: "saving",
                lastMode: settings.promptMode,
                sourceType: extracted.sourceType,
                hasTranscript: Boolean(extracted.transcriptSegments && extracted.transcriptSegments.length),
                title: extracted.title,
                statusMessage: "Saving result...",
                requestCount: execution.requestCount,
                requestTotal: execution.requestCount
            });
            const rawResponse = execution.text;
            const parsed = SummarizerCleaners.parseStructuredSummary(rawResponse);
            const result = buildResultFromExtraction(parsed, extracted, settings, providerId, tabId, execution);

            await ensureTabIsOpen(tabId);
            await SummarizerStorage.saveResultForTab(tabId, result);
            await SummarizerStorage.clearConversationForTab(tabId);
            await SummarizerStorage.recordSummary({
                provider: providerId,
                tone: settings.summaryTone,
                size: settings.summarySize,
                sourceType: extracted.sourceType,
                durationMs: Date.now() - startTime,
                contentLength: extracted.content.length
            });
            await SummarizerWorkflowStore.markCompleted(tabId, {
                lastMode: settings.promptMode,
                sourceType: extracted.sourceType,
                hasTranscript: Boolean(extracted.transcriptSegments && extracted.transcriptSegments.length),
                title: extracted.title,
                statusMessage: "Summary ready.",
                requestCount: execution.requestCount,
                requestTotal: execution.requestCount
            });
            SummarizerUiNotifier.notifyUi(result, tabId);
            return result;
        })();

        inFlightSummaries.set(tabId, job);
        try {
            return await job;
        } finally {
            inFlightSummaries.delete(tabId);
        }
    }

    async function answerFollowUp(tabId, question) {
        const settings = await SummarizerStorage.getSettings();
        const result = await SummarizerStorage.getResultForTab(tabId);
        if (!result) {
            throw new Error("Summarize this tab before asking a follow-up question.");
        }

        const conversationHistory = await SummarizerStorage.getConversationForTab(tabId);
        const prompt = SummarizerPrompts.buildDeepDivePrompt(
            { ...result, conversationHistory },
            question,
            settings
        );
        const answer = await SummarizerProviders.generateText(settings.provider, prompt, settings);
        const conversation = {
            question,
            answer: SummarizerCleaners.cleanText(answer),
            type: "user-question"
        };

        await SummarizerStorage.addMessageToConversation(tabId, conversation);
        return conversation;
    }

    globalThis.SummarizerSummaryService = {
        summarizeForTab,
        releaseTab: function releaseTab(tabId) {
            inFlightSummaries.delete(tabId);
        },
        answerFollowUp
    };
})();
