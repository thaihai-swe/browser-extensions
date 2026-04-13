(function () {
    function normalizeListText(value) {
        return String(value || "").replace(/\s+/g, " ").trim().toLowerCase();
    }

    function isSectionHeading(value) {
        return /^(summary|key takeaways|main points|details of the video|video details|detailed breakdown|expert commentary|follow-up questions|next question)\s*:?$/i.test(
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
        elements.summary.textContent = "Pulling content from the current tab and building the first pass.";
        elements.takeaways.innerHTML = "<li class='placeholder'>Takeaways will appear after the summary is ready.</li>";
        elements.mainPoints.innerHTML = "";
        elements.detailsOfVideo.innerHTML = "";
        elements.breakdown.innerHTML = "";
        elements.commentary.innerHTML = "";
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
        elements.followUpQuestionsWrap.hidden = true;
        elements.chatLog.innerHTML = "";
    }

    function renderResult(result, elements, askFollowUp) {
        if (!result) {
            elements.title.textContent = "No summary yet";
            elements.meta.textContent = "";
            elements.modeLabel.textContent = "";
            elements.summary.textContent = "Run a summary from here or use the floating button.";
            elements.takeaways.innerHTML = "<li class='placeholder'>No takeaways yet.</li>";
            elements.mainPointsWrap.hidden = true;
            elements.mainPointsWrap.classList.remove("collapsed");
            elements.detailsOfVideoWrap.hidden = true;
            elements.detailsOfVideoWrap.classList.remove("collapsed");
            elements.breakdownWrap.hidden = true;
            elements.breakdownWrap.classList.remove("collapsed");
            elements.commentaryWrap.hidden = true;
            elements.commentaryWrap.classList.remove("collapsed");
            elements.followUpQuestionsWrap.hidden = true;
            elements.transcriptToolsWrap.hidden = true;
            return;
        }

        elements.title.textContent = result.title || "Summary";
        elements.meta.textContent =
            (result.sourceType || "") + (result.providerLabel ? "  |  " + result.providerLabel : "");
        elements.modeLabel.textContent = result.promptMode ? "Mode: " + result.promptMode : "";
        elements.summary.innerHTML = SummarizerMarkdown.renderMarkdown(result.summary || "");

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

        elements.mainPoints.innerHTML = SummarizerMarkdown.renderMarkdown(result.mainPoints || "");
        elements.mainPointsWrap.hidden = !result.mainPoints;
        if (result.mainPoints) {
            elements.mainPointsWrap.classList.remove("collapsed");
        }

        elements.detailsOfVideo.innerHTML = SummarizerMarkdown.renderMarkdown(result.detailsOfVideo || "");
        elements.detailsOfVideoWrap.hidden = !(result.sourceType === "youtube" && result.detailsOfVideo);
        if (result.sourceType === "youtube" && result.detailsOfVideo) {
            elements.detailsOfVideoWrap.classList.remove("collapsed");
        }

        elements.breakdown.innerHTML = SummarizerMarkdown.renderMarkdown(result.detailedBreakdown || "");
        elements.breakdownWrap.hidden = !result.detailedBreakdown;
        if (result.detailedBreakdown) {
            elements.breakdownWrap.classList.remove("collapsed");
        }

        elements.commentary.innerHTML = SummarizerMarkdown.renderMarkdown(result.expertCommentary || "");
        elements.commentaryWrap.hidden = !result.expertCommentary;
        if (result.expertCommentary) {
            elements.commentaryWrap.classList.remove("collapsed");
        }

        renderFollowUpQuestions(result.followUpQuestions || [], elements, askFollowUp);
    }

    globalThis.SummarizerSidepanelRender = {
        setupCollapsibleSections,
        renderResult,
        clearAllContent
    };
})();
