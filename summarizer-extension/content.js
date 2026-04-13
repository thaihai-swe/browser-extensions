(function () {
  const MSG = SummarizerMessages.types;
  const state = {
    host: null,
    shadow: null,
    button: null,
    panel: null,
    enabled: true,
    latestResult: null,
    latestError: ""
  };

  function renderPanel() {
    if (!state.panel) {
      return;
    }

    if (state.latestError) {
      state.panel.innerHTML = `
        <div class="head">
          <strong>Summary Error</strong>
          <button class="close-btn" data-close>Close</button>
        </div>
        <p class="error">${SummarizerMarkdown.escapeHtml(state.latestError)}</p>
        <div class="actions">
          <button data-retry>Retry</button>
        </div>
      `;
      wirePanelButtons();
      return;
    }

    if (!state.latestResult) {
      state.panel.innerHTML = `
        <div class="head">
          <strong>Floating Summary</strong>
          <button class="close-btn" data-close>Close</button>
        </div>
        <p>No summary yet. Use the floating button or the side panel.</p>
      `;
      wirePanelButtons();
      return;
    }

    const takeaways = (state.latestResult.keyTakeaways || [])
      .map((item) => `<li>${SummarizerMarkdown.escapeHtml(item)}</li>`)
      .join("");

    state.panel.innerHTML = `
      <div class="head">
        <strong>${SummarizerMarkdown.escapeHtml(state.latestResult.title || "Summary")}</strong>
        <button class="close-btn" data-close>Close</button>
      </div>
      <p class="meta">${SummarizerMarkdown.escapeHtml(state.latestResult.sourceType || "")}</p>
      <section>
        <h4>Summary</h4>
        <div class="summary">${SummarizerMarkdown.renderMarkdown(state.latestResult.summary || "")}</div>
      </section>
      <section>
        <h4>Key Takeaways</h4>
        <ul>${takeaways || "<li>No takeaways returned.</li>"}</ul>
      </section>
      <div class="actions">
        <button data-copy>Copy</button>
        <button data-retry>Retry</button>
        <button data-sidepanel>Open Side Panel</button>
      </div>
    `;

    wirePanelButtons();
  }

  function wirePanelButtons() {
    if (!state.panel) {
      return;
    }

    const closeBtn = state.panel.querySelector("[data-close]");
    if (closeBtn) {
      closeBtn.onclick = () => {
        state.panel.classList.remove("visible");
      };
    }

    const retryBtn = state.panel.querySelector("[data-retry]");
    if (retryBtn) {
      retryBtn.onclick = () => triggerSummarize();
    }

    const copyBtn = state.panel.querySelector("[data-copy]");
    if (copyBtn) {
      copyBtn.onclick = async () => {
        const result = state.latestResult;
        if (!result) {
          return;
        }
        const text = [
          result.title || "Summary",
          "",
          result.summary || "",
          "",
          "Key Takeaways",
          ...(result.keyTakeaways || []).map((item) => "- " + item)
        ].join("\n");
        await navigator.clipboard.writeText(text);
      };
    }

    const sidePanelBtn = state.panel.querySelector("[data-sidepanel]");
    if (sidePanelBtn) {
      sidePanelBtn.onclick = async () => {
        const response = await chrome.runtime.sendMessage({ type: MSG.OPEN_SIDE_PANEL });
        if (!response || !response.ok) {
          state.latestError =
            (response && response.error) ||
            "Use the extension toolbar button. Chrome restricts opening the side panel from this in-page control.";
          renderPanel();
          state.panel.classList.add("visible");
        }
      };
    }
  }

  async function triggerSummarize() {
    state.latestError = "";
    renderPanel();
    state.panel.classList.add("visible");
    state.button.disabled = true;
    state.button.textContent = "Summarizing...";

    try {
      const response = await chrome.runtime.sendMessage({
        type: MSG.SUMMARIZE_ACTIVE_TAB
      });
      if (!response || !response.ok) {
        throw new Error((response && response.error) || "Summary failed.");
      }
    } catch (error) {
      state.latestError = error.message || "Summary failed.";
      renderPanel();
    } finally {
      state.button.disabled = false;
      state.button.textContent = "Summarize";
    }
  }

  function createUi() {
    if (state.host || !state.enabled) {
      return;
    }

    state.host = document.createElement("div");
    state.host.style.position = "fixed";
    state.host.style.right = "20px";
    state.host.style.bottom = "20px";
    state.host.style.zIndex = "2147483647";

    state.shadow = state.host.attachShadow({ mode: "open" });
    state.shadow.innerHTML = `
      <style>
        :host { all: initial; }
        .fab {
          background: #111827;
          color: white;
          border: none;
          border-radius: 999px;
          padding: 10px 14px;
          cursor: pointer;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
          font: 600 13px/1.2 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }
        .panel {
          display: none;
          width: 340px;
          max-height: 70vh;
          overflow: auto;
          margin-top: 10px;
          background: #ffffff;
          color: #111827;
          border: 1px solid rgba(17, 24, 39, 0.12);
          border-radius: 18px;
          padding: 14px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
          font: 13px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }
        .panel.visible { display: block; }
        .head {
          display: flex;
          justify-content: space-between;
          gap: 8px;
          align-items: center;
          margin-bottom: 8px;
        }
        .close-btn, .actions button {
          border: 1px solid rgba(17, 24, 39, 0.12);
          background: #f9fafb;
          border-radius: 10px;
          padding: 8px 10px;
          cursor: pointer;
          font: inherit;
        }
        .actions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 12px;
        }
        h4 {
          font-size: 12px;
          margin: 12px 0 6px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: #6b7280;
        }
        .summary {
          white-space: pre-wrap;
        }
        ul {
          padding-left: 18px;
          margin: 0;
        }
        .meta {
          color: #6b7280;
          margin: 0 0 8px;
        }
        .error {
          color: #b91c1c;
        }
      </style>
      <button class="fab" type="button">Summarize</button>
      <div class="panel"></div>
    `;

    state.button = state.shadow.querySelector(".fab");
    state.panel = state.shadow.querySelector(".panel");
    state.button.addEventListener("click", () => {
      if (state.latestResult || state.latestError) {
        state.panel.classList.toggle("visible");
        renderPanel();
      } else {
        triggerSummarize();
      }
    });

    document.documentElement.appendChild(state.host);
  }

  function destroyUi() {
    if (state.host) {
      state.host.remove();
    }
    state.host = null;
    state.shadow = null;
    state.button = null;
    state.panel = null;
  }

  async function syncUiEnabled() {
    const settings = await SummarizerStorage.getSettings();
    state.enabled = settings.showFloatingUi !== false;
    if (state.enabled) {
      createUi();
    } else {
      destroyUi();
    }
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === MSG.FETCH_COURSE_CONTENT) {
      const selectedText = SummarizerSelectedTextExtractor.extractSelectedText();
      if (selectedText) {
        sendResponse({ ok: true, data: selectedText });
        return true;
      }

      SummarizerCourseExtractor.fetchCourseContent()
        .then((data) => sendResponse({ ok: true, data }))
        .catch((error) =>
          sendResponse({
            ok: false,
            error: error.message || "Course extraction failed."
          })
        );
      return true;
    }

    if (message.type === MSG.EXTRACT_CONTENT) {
      SummarizerExtractors.extractBestContent()
        .then((data) => sendResponse({ ok: true, data }))
        .catch((error) =>
          sendResponse({
            ok: false,
            error: error.message || "Extraction failed."
          })
        );
      return true;
    }

    if (message.type === MSG.SUMMARY_UPDATED) {
      state.latestError = "";
      state.latestResult = message.result || null;
      renderPanel();
      if (state.panel) {
        state.panel.classList.add("visible");
      }
      return;
    }

    if (message.type === MSG.SUMMARY_ERROR) {
      state.latestError = message.error || "Summary failed.";
      renderPanel();
      if (state.panel) {
        state.panel.classList.add("visible");
      }
    }
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "local" && changes.summarizerSettings) {
      syncUiEnabled();
    }
  });

  syncUiEnabled();
})();
