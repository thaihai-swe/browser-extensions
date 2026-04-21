(function () {
    function cleanText(input) {
        return String(input || "")
            .replace(/\r/g, "")
            .replace(/\t+/g, " ")
            .replace(/[ \u00a0]+/g, " ")
            .replace(/\n{3,}/g, "\n\n")
            .replace(/[ ]+\n/g, "\n")
            .trim();
    }

    function truncateText(input, maxLength) {
        const text = cleanText(input);
        if (!maxLength || text.length <= maxLength) {
            return text;
        }
        return text.slice(0, maxLength).trimEnd() + "\n\n[Content truncated]";
    }

    function decodeHtmlEntities(text) {
        const textarea = document.createElement("textarea");
        textarea.innerHTML = text;
        return textarea.value;
    }

    function sanitizeFilename(input) {
        return String(input || "summary")
            .replace(/[\\/:*?"<>|]+/g, "-")
            .replace(/\s+/g, "-")
            .replace(/-+/g, "-")
            .replace(/^-|-$/g, "")
            .slice(0, 80);
    }

    function parseListItems(block, maxItems) {
        const lines = cleanText(block)
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean);

        if (!lines.length) {
            return [];
        }

        const listItems = lines
            .map((line) => line.replace(/^[-*]\s+/, "").replace(/^\d+[.)]\s+/, "").trim())
            .filter(Boolean)
            .slice(0, maxItems || lines.length);

        return listItems;
    }

    function uniqueItems(items) {
        const seen = new Set();
        return items.filter((item) => {
            const key = cleanText(item).toLowerCase();
            if (!key || seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
    }

    function stripSectionHeadingLine(text, headingPattern) {
        const cleaned = cleanText(text);
        if (!cleaned) {
            return "";
        }
        const lines = cleaned.split("\n");
        if (lines.length && headingPattern.test(lines[0])) {
            return cleanText(lines.slice(1).join("\n"));
        }
        return cleaned;
    }

    function normalizeHeading(line) {
        return String(line || "")
            .replace(/^\s{0,3}#{1,6}\s*/, "")
            .replace(/^\*\*(.*?)\*\*\s*:?$/, "$1")
            .replace(/^__([^_]+)__\s*:?$/, "$1")
            .replace(/\*+/g, "")
            .replace(/_+/g, "")
            .replace(/`+/g, "")
            .replace(/\s*:+\s*$/, "")
            .replace(/\s+/g, " ")
            .trim()
            .toLowerCase();
    }

    function resolveSection(heading) {
        if (!heading) {
            return "";
        }

        const compact = heading.replace(/\s+/g, " ");

        if (/^(summary|executive summary)$/.test(compact)) {
            return "summary";
        }
        if (/^(key )?takeaways?$/.test(compact)) {
            return "keyTakeaways";
        }
        if (/^(core ideas|main points?|key points?)$/.test(compact)) {
            return "coreIdeas";
        }
        if (/^(flow ?\/ ?structure|flow|structure|details? of (the )?video|video details?|timeline|video timeline)$/.test(compact)) {
            return "flowStructure";
        }
        if (/^(evidence ?& ?examples|evidence and examples|key evidence|detailed breakdown|breakdown)$/.test(compact)) {
            return "evidenceExamples";
        }
        if (/^(nuances? ?& ?caveats|nuances? and caveats|expert commentary|commentary|analysis|insights?)$/.test(compact)) {
            return "nuancesCaveats";
        }
        if (/^(practical implications|implications)$/.test(compact)) {
            return "practicalImplications";
        }
        if (/^(suggested )?follow[- ]?up questions?$/.test(compact)) {
            return "followUpQuestions";
        }
        // Next Question section removed

        return "";
    }

    function parseStructuredSummary(rawText) {
        const text = cleanText(rawText);
        const defaultResult = {
            rawText: text,
            summary: text,
            executiveSummary: text,
            keyTakeaways: [],
            coreIdeas: "",
            flowStructure: "",
            evidenceExamples: "",
            nuancesCaveats: "",
            practicalImplications: "",
            mainPoints: "",
            detailsOfVideo: "",
            detailedBreakdown: "",
            expertCommentary: "",
            followUpQuestions: []
        };

        if (!text) {
            return defaultResult;
        }

        const lines = text.split("\n");
        const buffers = {
            summary: [],
            keyTakeaways: [],
            coreIdeas: [],
            flowStructure: [],
            evidenceExamples: [],
            nuancesCaveats: [],
            practicalImplications: [],
            followUpQuestions: []
        };

        let currentSection = "summary";

        lines.forEach((line) => {
            const section = resolveSection(normalizeHeading(line));
            if (section) {
                currentSection = section;
                return;
            }
            buffers[currentSection].push(line);
        });

        const summary = stripSectionHeadingLine(
            cleanText(buffers.summary.join("\n")) || text,
            /^(summary|executive summary)\s*:?$/i
        );

        const takeawayBlock = cleanText(buffers.keyTakeaways.join("\n"));
        const keyTakeaways = uniqueItems(
            takeawayBlock
                ? parseListItems(takeawayBlock, 8)
                : parseListItems(
                    text
                        .split("\n")
                        .filter((line) => /^[-*]\s+|^\s*\d+[.)]\s+/.test(line))
                        .join("\n"),
                    6
                )
        );

        let followUpQuestions = uniqueItems(
            parseListItems(cleanText(buffers.followUpQuestions.join("\n")), 5)
        ).filter((q) => q.length > 5);

        if (!followUpQuestions.length) {
            const questionsPattern = text.match(
                /(?:suggested\s+)?follow[- ]?up questions?\s*:?\s*\n([\s\S]*?)(?=\n\s*(?:#{1,6}\s+|\*\*[^*]+\*\*\s*:?\s*$|$))/i
            );
            if (questionsPattern) {
                followUpQuestions = uniqueItems(parseListItems(cleanText(questionsPattern[1]), 5))
                    .filter((q) => q.length > 5);
            }
        }

        // Fallback heuristics: if evidenceExamples/nuancesCaveats are empty,
        // try to recover them conservatively from nearby text in the raw response.
        let evidenceExamples = cleanText(buffers.evidenceExamples.join("\n"));
        if (!evidenceExamples) {
            const detMatch = text.match(/(?:^|\n)\s*(?:#+\s*)?(?:evidence\s*&\s*examples|evidence\s+and\s+examples|detailed\s+breakdown|breakdown)\s*:?\s*\n([\s\S]*?)(?=\n\s*(?:#{1,6}\s+|$))/i);
            if (detMatch && detMatch[1]) {
                evidenceExamples = cleanText(detMatch[1]);
            }
        }

        if (!evidenceExamples) {
            // Try paragraphs after Core Ideas / Main Points heading
            const mainHeading = text.search(/(?:^|\n)\s*(?:#+\s*)?(?:core ideas|main points)\s*:?\s*\n/i);
            if (mainHeading !== -1) {
                const after = text.slice(mainHeading);
                const paras = after.split(/\n\s*\n/).map((p) => cleanText(p)).filter(Boolean);
                if (paras.length > 1) {
                    evidenceExamples = paras[1];
                }
            }
        }

        let nuancesCaveats = cleanText(buffers.nuancesCaveats.join("\n"));
        if (!nuancesCaveats) {
            const expMatch = text.match(/(?:^|\n)\s*(?:#+\s*)?(?:nuances?\s*&\s*caveats|nuances?\s+and\s+caveats|expert\s+commentary|commentary|analysis)\s*:?\s*\n([\s\S]*?)(?=\n\s*(?:#{1,6}\s+|$))/i);
            if (expMatch && expMatch[1]) {
                nuancesCaveats = cleanText(expMatch[1]);
            }
        }

        if (!nuancesCaveats) {
            const keywordPara = text.split(/\n\s*\n/)
                .map((p) => cleanText(p))
                .find((p) => /tradeoff|strengths?|weaknesses?|implication|practical|recommendation/i.test(p));
            if (keywordPara) {
                nuancesCaveats = keywordPara;
            }
        }

        const coreIdeas = cleanText(buffers.coreIdeas.join("\n"));
        const flowStructure = cleanText(buffers.flowStructure.join("\n"));
        const practicalImplications = cleanText(buffers.practicalImplications.join("\n"));

        return {
            rawText: text,
            summary,
            executiveSummary: summary,
            keyTakeaways,
            coreIdeas,
            flowStructure,
            evidenceExamples: evidenceExamples,
            nuancesCaveats: nuancesCaveats,
            practicalImplications,
            mainPoints: coreIdeas,
            detailsOfVideo: flowStructure,
            detailedBreakdown: evidenceExamples,
            expertCommentary: nuancesCaveats,
            followUpQuestions
        };
    }

    globalThis.SummarizerCleaners = {
        cleanText,
        truncateText,
        decodeHtmlEntities,
        sanitizeFilename,
        parseStructuredSummary
    };
})();
