(function () {
  function buildVideoDetailLines(result) {
    const details = result.videoDetails || {};
    if (!details || result.sourceType !== "youtube") {
      return [];
    }

    return [
      details.channelName ? "- Channel: " + details.channelName : "",
      details.durationText ? "- Duration: " + details.durationText : "",
      details.publishDate ? "- Published: " + details.publishDate : "",
      details.viewCountText ? "- Views: " + details.viewCountText : "",
      details.transcriptLanguage ? "- Transcript Language: " + details.transcriptLanguage : "",
      details.captionTrackLabel ? "- Caption Track: " + details.captionTrackLabel : ""
    ].filter(Boolean);
  }

  function toMarkdown(result) {
    const takeaways = (result.keyTakeaways || [])
      .map((item) => "- " + item)
      .join("\n");
    const videoDetails = buildVideoDetailLines(result);
    const coreIdeas = result.coreIdeas || result.mainPoints || "";
    const flowStructure = result.flowStructure || result.detailsOfVideo || "";
    const evidenceExamples = result.evidenceExamples || result.detailedBreakdown || "";
    const nuancesCaveats = result.nuancesCaveats || result.expertCommentary || "";
    const practicalImplications = result.practicalImplications || "";

    return [
      "# " + (result.title || "Summary"),
      "",
      "- URL: " + (result.url || ""),
      "- Source Type: " + (result.sourceType || ""),
      "- Provider: " + ((result.providerLabel || result.provider || "") || ""),
      ...videoDetails,
      "",
      "## Executive Summary",
      "",
      (result.executiveSummary || result.summary || ""),
      "",
      "## Key Takeaways",
      "",
      takeaways || "- None",
      coreIdeas ? "\n## Core Ideas\n\n" + coreIdeas : "",
      flowStructure ? "\n## Flow / Structure\n\n" + flowStructure : "",
      evidenceExamples ? "\n## Evidence & Examples\n\n" + evidenceExamples : "",
      nuancesCaveats ? "\n## Nuances & Caveats\n\n" + nuancesCaveats : "",
      practicalImplications ? "\n## Practical Implications\n\n" + practicalImplications : ""
    ].join("\n");
  }

  function toText(result) {
    const takeaways = (result.keyTakeaways || [])
      .map((item) => "- " + item)
      .join("\n");
    const videoDetails = buildVideoDetailLines(result).map((line) => line.replace(/^- /, ""));
    const coreIdeas = result.coreIdeas || result.mainPoints || "";
    const flowStructure = result.flowStructure || result.detailsOfVideo || "";
    const evidenceExamples = result.evidenceExamples || result.detailedBreakdown || "";
    const nuancesCaveats = result.nuancesCaveats || result.expertCommentary || "";
    const practicalImplications = result.practicalImplications || "";

    return [
      result.title || "Summary",
      "",
      "URL: " + (result.url || ""),
      "Source Type: " + (result.sourceType || ""),
      "Provider: " + ((result.providerLabel || result.provider || "") || ""),
      ...videoDetails,
      "",
      "Executive Summary",
      (result.executiveSummary || result.summary || ""),
      "",
      "Key Takeaways",
      takeaways || "- None",
      coreIdeas ? "\nCore Ideas\n" + coreIdeas : "",
      flowStructure ? "\nFlow / Structure\n" + flowStructure : "",
      evidenceExamples ? "\nEvidence & Examples\n" + evidenceExamples : "",
      nuancesCaveats ? "\nNuances & Caveats\n" + nuancesCaveats : "",
      practicalImplications ? "\nPractical Implications\n" + practicalImplications : ""
    ].join("\n");
  }

  function toTranscriptText(result) {
    if (!result || result.sourceType !== "youtube") {
      return "";
    }
    return result.sourceContentRaw || result.sourceContentForPrompt || "";
  }

  function toTranscriptMarkdown(result) {
    const transcript = toTranscriptText(result);
    if (!transcript) {
      return "";
    }
    return [
      "# " + (result.title || "Transcript"),
      "",
      "- URL: " + (result.url || ""),
      "",
      "## Transcript",
      "",
      transcript
    ].join("\n");
  }

  globalThis.SummarizerExporters = {
    toMarkdown,
    toText,
    toTranscriptText,
    toTranscriptMarkdown
  };
})();
