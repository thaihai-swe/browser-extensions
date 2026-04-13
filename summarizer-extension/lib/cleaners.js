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

        if (/^summary$/.test(compact)) {
            return "summary";
        }
        if (/^(key )?takeaways?$/.test(compact)) {
            return "keyTakeaways";
        }
        if (/^(main|key) points?$/.test(compact)) {
            return "mainPoints";
        }
        if (/^(details? of (the )?video|video details?|timeline|video timeline)$/.test(compact)) {
            return "detailsOfVideo";
        }
        if (/^(detailed )?breakdown$/.test(compact)) {
            return "detailedBreakdown";
        }
        if (/^(expert )?(commentary|analysis|insights?)$/.test(compact)) {
            return "expertCommentary";
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
            keyTakeaways: [],
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
            mainPoints: [],
            detailsOfVideo: [],
            detailedBreakdown: [],
            expertCommentary: [],
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
            /^summary\s*:?$/i
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

        // Fallback heuristics: if detailedBreakdown/expertCommentary/nextQuestion are empty,
        // try to recover them conservatively from nearby text in the raw response.
        let detailedBreakdown = cleanText(buffers.detailedBreakdown.join("\n"));
        if (!detailedBreakdown) {
            const detMatch = text.match(/(?:^|\n)\s*(?:#+\s*)?(?:detailed\s+breakdown|breakdown)\s*:?\s*\n([\s\S]*?)(?=\n\s*(?:#{1,6}\s+|$))/i);
            if (detMatch && detMatch[1]) {
                detailedBreakdown = cleanText(detMatch[1]);
            }
        }

        if (!detailedBreakdown) {
            // Try paragraphs after Main Points heading
            const mainHeading = text.search(/(?:^|\n)\s*(?:#+\s*)?main points\s*:?\s*\n/i);
            if (mainHeading !== -1) {
                const after = text.slice(mainHeading);
                const paras = after.split(/\n\s*\n/).map((p) => cleanText(p)).filter(Boolean);
                if (paras.length > 1) {
                    // take second paragraph (first is heading + maybe list)
                    detailedBreakdown = paras[1];
                }
            }
        }

        let expertCommentary = cleanText(buffers.expertCommentary.join("\n"));
        if (!expertCommentary) {
            const expMatch = text.match(/(?:^|\n)\s*(?:#+\s*)?(?:expert\s+commentary|commentary|analysis)\s*:?\s*\n([\s\S]*?)(?=\n\s*(?:#{1,6}\s+|$))/i);
            if (expMatch && expMatch[1]) {
                expertCommentary = cleanText(expMatch[1]);
            }
        }

        if (!expertCommentary) {
            // heuristic: find paragraphs containing keywords
            const keywordPara = text.split(/\n\s*\n/)
                .map((p) => cleanText(p))
                .find((p) => /tradeoff|strengths?|weaknesses?|implication|practical|recommendation/i.test(p));
            if (keywordPara) {
                expertCommentary = keywordPara;
            }
        }


        return {
            rawText: text,
            summary,
            keyTakeaways,
            mainPoints: cleanText(buffers.mainPoints.join("\n")),
            detailsOfVideo: cleanText(buffers.detailsOfVideo.join("\n")),
            detailedBreakdown: detailedBreakdown,
            expertCommentary: expertCommentary,

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
