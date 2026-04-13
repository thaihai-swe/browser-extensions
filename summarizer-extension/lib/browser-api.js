(function () {
    const api = globalThis.browser || globalThis.chrome;
    let toolbarSidebarHandlerRegistered = false;

    function hasChromeSidePanel() {
        return Boolean(globalThis.chrome && chrome.sidePanel && typeof chrome.sidePanel.open === "function");
    }

    function hasFirefoxSidebarAction() {
        return Boolean(api && api.sidebarAction && typeof api.sidebarAction.open === "function");
    }

    async function configurePrimarySidebarBehavior() {
        if (hasChromeSidePanel() && typeof chrome.sidePanel.setPanelBehavior === "function") {
            await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
            return;
        }

        if (
            !toolbarSidebarHandlerRegistered &&
            hasFirefoxSidebarAction() &&
            api.action &&
            api.action.onClicked &&
            typeof api.action.onClicked.addListener === "function"
        ) {
            api.action.onClicked.addListener(() => {
                api.sidebarAction.open().catch(() => { });
            });
            toolbarSidebarHandlerRegistered = true;
        }
    }

    async function openPrimarySidebar(options) {
        if (hasChromeSidePanel()) {
            return chrome.sidePanel.open(options || {});
        }

        if (hasFirefoxSidebarAction()) {
            return api.sidebarAction.open();
        }

        throw new Error("This browser does not expose a supported extension sidebar API.");
    }

    function getPrimarySidebarType() {
        if (hasChromeSidePanel()) {
            return "side_panel";
        }

        if (hasFirefoxSidebarAction()) {
            return "sidebar_action";
        }

        return "unsupported";
    }

    globalThis.SummarizerBrowserApi = {
        configurePrimarySidebarBehavior,
        openPrimarySidebar,
        getPrimarySidebarType
    };
})();
