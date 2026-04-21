(function () {
    function normalizeListText(value) {
        return String(value || "").replace(/\s+/g, " ").trim().toLowerCase();
    }

    function isSectionHeading(value) {
        return /^(executive summary|summary|key takeaways|core ideas|main points|flow\s*\/\s*structure|flow|structure|details of the video|video details|evidence\s*&\s*examples|evidence and examples|detailed breakdown|nuances\s*&\s*caveats|nuances and caveats|expert commentary|practical implications|follow-up questions|next question)\s*:?$/i.test(
            String(value || "").trim()
        );
    }

    function setupCollapsibleSections() {
        document.querySelectorAll(".collapsible-header").forEach((header) => {
            header.addEventListener("click", (event) => {
                event.preventDefault();
                const section = header.closest(".collapsible-section");
                if (section) {
                    section.classList.toggle("collapsed");
                }
            });
        });
    }

    function renderFollowUpQuestions(questions, elements, askFollowUp) {
        elements.followUpQuestions.innerHTML = "";
        if (!questions || questions.length === 0) {
            elements.followUpQuestionsWrap.hidden = true;
            return;
        }

        elements.followUpQuestionsWrap.hidden = false;
        questions.slice(0, 5).forEach((question) => {
            const btn = document.createElement("button");
            btn.className = "follow-up-btn";
            btn.textContent = question;
            btn.addEventListener("click", () => {
                elements.chatInput.value = question;
                askFollowUp();
            });
            elements.followUpQuestions.appendChild(btn);
        });
    }

    function clearAllContent(elements) {
        elements.title.textContent = "Summarizing...";
        elements.meta.textContent = "";
        elements.modeLabel.textContent = "";
        elements.summary.textContent = "Pulling content from the current tab and compressing it into a high-value replacement.";
        elements.takeaways.innerHTML = "<li class='placeholder'>Takeaways will appear after the summary is ready.</li>";
        elements.mainPoints.innerHTML = "";
        elements.detailsOfVideo.innerHTML = "";
        elements.breakdown.innerHTML = "";
        elements.commentary.innerHTML = "";
        elements.implications.innerHTML = "";
        elements.transcriptContent.textContent = "";
        elements.transcriptToolsWrap.hidden = true;
        elements.followUpQuestions.innerHTML = "";
        elements.mainPointsWrap.hidden = true;
        elements.mainPointsWrap.classList.remove("collapsed");
        elements.detailsOfVideoWrap.hidden = true;
        elements.detailsOfVideoWrap.classList.remove("collapsed");
        elements.breakdownWrap.hidden = true;
        elements.breakdownWrap.classList.remove("collapsed");
        elements.commentaryWrap.hidden = true;
        elements.commentaryWrap.classList.remove("collapsed");
        elements.implicationsWrap.hidden = true;
        elements.implicationsWrap.classList.remove("collapsed");
        elements.followUpQuestionsWrap.hidden = true;
        elements.chatLog.innerHTML = "";
    }

    function renderResult(result, elements, askFollowUp) {
        if (!result) {
            elements.title.textContent = "No summary yet";
            elements.meta.textContent = "";
            elements.modeLabel.textContent = "";
            elements.summary.textContent = "Generate a summary to get a compressed replacement for the source.";
            elements.takeaways.innerHTML = "<li class='placeholder'>No takeaways yet.</li>";
            elements.mainPointsWrap.hidden = true;
            elements.mainPointsWrap.classList.remove("collapsed");
            elements.detailsOfVideoWrap.hidden = true;
            elements.detailsOfVideoWrap.classList.remove("collapsed");
            elements.breakdownWrap.hidden = true;
            elements.breakdownWrap.classList.remove("collapsed");
            elements.commentaryWrap.hidden = true;
            elements.commentaryWrap.classList.remove("collapsed");
            elements.implicationsWrap.hidden = true;
            elements.implicationsWrap.classList.remove("collapsed");
            elements.followUpQuestionsWrap.hidden = true;
            elements.transcriptToolsWrap.hidden = true;
            return;
        }

        const executiveSummary = result.executiveSummary || result.summary || "";
        const coreIdeas = result.coreIdeas || result.mainPoints || "";
        const flowStructure = result.flowStructure || result.detailsOfVideo || "";
        const evidenceExamples = result.evidenceExamples || result.detailedBreakdown || "";
        const nuancesCaveats = result.nuancesCaveats || result.expertCommentary || "";
        const practicalImplications = result.practicalImplications || "";

        elements.title.textContent = result.title || "Summary";
        elements.meta.textContent =
            (result.sourceType || "") + (result.providerLabel ? "  |  " + result.providerLabel : "");
        elements.modeLabel.textContent = result.promptMode ? "Mode: " + result.promptMode : "";
        elements.summary.innerHTML = SummarizerMarkdown.renderMarkdown(executiveSummary);

        console.log("[Summarizer] Summary result payload", result || {});
        elements.transcriptToolsWrap.hidden = !(result.sourceType === "youtube" && (result.sourceContentRaw || result.transcriptSegments?.length));
        elements.transcriptContent.textContent = result.sourceContentRaw || result.sourceContentForPrompt || "";

        elements.takeaways.innerHTML = "";
        const items = result.keyTakeaways && result.keyTakeaways.length
            ? result.keyTakeaways
                .filter((item) => !isSectionHeading(item))
                .filter((item, index, arr) => {
                    const normalized = normalizeListText(item);
                    return normalized && arr.findIndex((other) => normalizeListText(other) === normalized) === index;
                })
            : ["No takeaways returned."];

        items.forEach((item) => {
            const li = document.createElement("li");
            if (item === "No takeaways returned.") {
                li.className = "placeholder";
            }
            li.innerHTML = SummarizerMarkdown.renderMarkdown(item);
            elements.takeaways.appendChild(li);
        });

        elements.mainPoints.innerHTML = SummarizerMarkdown.renderMarkdown(coreIdeas);
        elements.mainPointsWrap.hidden = !coreIdeas;
        if (coreIdeas) {
            elements.mainPointsWrap.classList.remove("collapsed");
        }

        elements.detailsOfVideo.innerHTML = SummarizerMarkdown.renderMarkdown(flowStructure);
        elements.detailsOfVideoWrap.hidden = !flowStructure;
        if (flowStructure) {
            elements.detailsOfVideoWrap.classList.remove("collapsed");
        }

        elements.breakdown.innerHTML = SummarizerMarkdown.renderMarkdown(evidenceExamples);
        elements.breakdownWrap.hidden = !evidenceExamples;
        if (evidenceExamples) {
            elements.breakdownWrap.classList.remove("collapsed");
        }

        elements.commentary.innerHTML = SummarizerMarkdown.renderMarkdown(nuancesCaveats);
        elements.commentaryWrap.hidden = !nuancesCaveats;
        if (nuancesCaveats) {
            elements.commentaryWrap.classList.remove("collapsed");
        }

        elements.implications.innerHTML = SummarizerMarkdown.renderMarkdown(practicalImplications);
        elements.implicationsWrap.hidden = !practicalImplications;
        if (practicalImplications) {
            elements.implicationsWrap.classList.remove("collapsed");
        }

        renderFollowUpQuestions(result.followUpQuestions || [], elements, askFollowUp);
    }

    globalThis.SummarizerSidepanelRender = {
        setupCollapsibleSections,
        renderResult,
        clearAllContent
    };
})();
