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

    return [
      "# " + (result.title || "Summary"),
      "",
      "- URL: " + (result.url || ""),
      "- Source Type: " + (result.sourceType || ""),
      "- Provider: " + ((result.providerLabel || result.provider || "") || ""),
      ...videoDetails,
      "",
      "## Summary",
      "",
      result.summary || "",
      "",
      "## Key Takeaways",
      "",
      takeaways || "- None",
      result.mainPoints ? "\n## Main Points\n\n" + result.mainPoints : "",
      result.sourceType === "youtube" && result.detailsOfVideo
        ? "\n## Details of the Video\n\n" + result.detailsOfVideo
        : "",
      result.detailedBreakdown ? "\n## Detailed Breakdown\n\n" + result.detailedBreakdown : "",
      result.expertCommentary ? "\n## Expert Commentary\n\n" + result.expertCommentary : ""
    ].join("\n");
  }

  function toText(result) {
    const takeaways = (result.keyTakeaways || [])
      .map((item) => "- " + item)
      .join("\n");
    const videoDetails = buildVideoDetailLines(result).map((line) => line.replace(/^- /, ""));

    return [
      result.title || "Summary",
      "",
      "URL: " + (result.url || ""),
      "Source Type: " + (result.sourceType || ""),
      "Provider: " + ((result.providerLabel || result.provider || "") || ""),
      ...videoDetails,
      "",
      "Summary",
      result.summary || "",
      "",
      "Key Takeaways",
      takeaways || "- None",
      result.mainPoints ? "\nMain Points\n" + result.mainPoints : "",
      result.sourceType === "youtube" && result.detailsOfVideo
        ? "\nDetails of the Video\n" + result.detailsOfVideo
        : "",
      result.detailedBreakdown ? "\nDetailed Breakdown\n" + result.detailedBreakdown : "",
      result.expertCommentary ? "\nExpert Commentary\n" + result.expertCommentary : ""
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
