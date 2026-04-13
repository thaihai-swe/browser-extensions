(function () {
    const CONTENT_SCRIPT_FILES = [
        "lib/messages.js",
        "lib/storage.js",
        "lib/cleaners.js",
        "lib/debug.js",
        "lib/markdown.js",
        "lib/extractors/core.js",
        "lib/extractors/accessibility-tree.js",
        "lib/extractors/selected-text.js",
        "lib/extractors/youtube.js",
        "lib/extractors/webpage.js",
        "lib/extractors/course.js",
        "lib/extractors.js",
        "content.js"
    ];

    function isCourseLessonUrl(url) {
        return /(coursera\.org\/learn\/.*\/(lecture|supplement)\/|udemy\.com\/course\/.*\/learn\/)/i.test(
            url || ""
        );
    }

    function getActiveTab() {
        return new Promise((resolve, reject) => {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                const tab = tabs && tabs[0];
                if (!tab || !tab.id) {
                    reject(new Error("No active tab found."));
                    return;
                }
                resolve(tab);
            });
        });
    }

    function requestExtraction(tabId) {
        return new Promise((resolve, reject) => {
            chrome.tabs.get(tabId, (tab) => {
                if (chrome.runtime.lastError) {
                    reject(new Error("This page cannot be summarized. Try a regular webpage instead."));
                    return;
                }

                const messageType = isCourseLessonUrl(tab && tab.url)
                    ? SummarizerMessages.types.FETCH_COURSE_CONTENT
                    : SummarizerMessages.types.EXTRACT_CONTENT;

                sendExtractionMessage(tabId, messageType)
                    .then(resolve)
                    .catch(reject);
            });
        });
    }

    function sendTabMessage(tabId, payload) {
        return new Promise((resolve, reject) => {
            chrome.tabs.sendMessage(tabId, payload, (response) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message || "Tab messaging failed."));
                    return;
                }
                resolve(response);
            });
        });
    }

    function injectContentScripts(tabId) {
        return new Promise((resolve, reject) => {
            chrome.scripting.executeScript(
                {
                    target: { tabId },
                    files: CONTENT_SCRIPT_FILES
                },
                () => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message || "Script injection failed."));
                        return;
                    }
                    resolve();
                }
            );
        });
    }

    async function sendExtractionMessage(tabId, messageType) {
        try {
            const response = await sendTabMessage(tabId, { type: messageType });
            if (!response || !response.ok) {
                throw new Error((response && response.error) || "Extraction failed.");
            }
            SummarizerDebug.logExtraction("content-script response", response.data);
            return response.data;
        } catch (error) {
            const message = String(error && error.message || "");
            const shouldRetryWithInjection =
                /receiving end does not exist|could not establish connection|message port closed/i.test(message);

            if (!shouldRetryWithInjection) {
                throw error;
            }

            await injectContentScripts(tabId);
            const retryResponse = await sendTabMessage(tabId, { type: messageType });
            if (!retryResponse || !retryResponse.ok) {
                throw new Error((retryResponse && retryResponse.error) || "Extraction failed.");
            }
            SummarizerDebug.logExtraction("content-script response (after inject retry)", retryResponse.data);
            return retryResponse.data;
        }
    }

    async function openSidePanel() {
        try {
            const tab = await getActiveTab();
            await SummarizerBrowserApi.openPrimarySidebar({ windowId: tab.windowId });
            return { ok: true };
        } catch (error) {
            if (SummarizerBrowserApi.getPrimarySidebarType() === "side_panel") {
                throw new Error("Chrome only allows opening the side panel from a direct extension user click. Use the extension toolbar button.");
            }
            throw new Error(error && error.message ? error.message : "Unable to open the extension sidebar.");
        }
    }

    globalThis.SummarizerTabManager = {
        getActiveTab,
        requestExtraction,
        openSidePanel,
        isCourseLessonUrl
    };
})();
