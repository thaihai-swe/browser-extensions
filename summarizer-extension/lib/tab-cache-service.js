(function () {
    /**
     * Per-Tab Session Management Service
     *
     * Maintains per-tab cache of summary results and state.
     * When switching tabs, cached state is preserved and automatically restored.
     *
     * Key features:
     * - In-memory cache for active tab's data
     * - Tracks current active tab ID
     * - Notifies listeners when tab switches
     * - Clears cache when tabs are closed
     */

    // In-memory cache: Map<tabId, cachedData>
    const tabCache = new Map();

    /**
     * Gets or initializes cache for a tab
     * @param {number} tabId - Browser tab ID
     * @returns {Object} Tab cache object
     */
    function getOrCreateCache(tabId) {
        if (!tabCache.has(tabId)) {
            tabCache.set(tabId, {
                result: null,
                conversation: [],
                workflow: { phase: null, lastError: "" },
                scrollY: 0,
                loadingState: "idle" // idle, loading, completed, failed
            });
        }
        return tabCache.get(tabId);
    }

    /**
     * Caches result for a tab
     * @param {number} tabId - Browser tab ID
     * @param {Object} result - Summary result to cache
     */
    function cacheResult(tabId, result) {
        const cache = getOrCreateCache(tabId);
        cache.result = result;
        cache.loadingState = result ? "completed" : "idle";
    }

    /**
     * Gets cached result for a tab
     * @param {number} tabId - Browser tab ID
     * @returns {Object|null}
     */
    function getCachedResult(tabId) {
        const cache = tabCache.get(tabId);
        return cache ? cache.result : null;
    }

    /**
     * Caches conversation for a tab
     * @param {number} tabId - Browser tab ID
     * @param {Array} conversation - Conversation history
     */
    function cacheConversation(tabId, conversation) {
        const cache = getOrCreateCache(tabId);
        cache.conversation = conversation || [];
    }

    /**
     * Gets cached conversation for a tab
     * @param {number} tabId - Browser tab ID
     * @returns {Array}
     */
    function getCachedConversation(tabId) {
        const cache = tabCache.get(tabId);
        return cache ? cache.conversation : [];
    }

    /**
     * Sets loading state for a tab
     * @param {number} tabId - Browser tab ID
     * @param {string} state - 'idle', 'loading', 'completed', 'failed'
     */
    function setLoadingState(tabId, state) {
        const cache = getOrCreateCache(tabId);
        cache.loadingState = state;
    }

    /**
     * Clears cache for a specific tab (e.g., when tab closed)
     * @param {number} tabId - Browser tab ID
     */
    function clearTabCache(tabId) {
        tabCache.delete(tabId);
    }

    /**
     * Clears all cached data
     */
    function clearAllCache() {
        tabCache.clear();
    }

    /**
     * Gets cache statistics for debugging
     * @returns {Object}
     */
    function getStats() {
        return {
            cachedTabs: Array.from(tabCache.keys()),
            cacheSize: tabCache.size
        };
    }

    // Export service
    globalThis.SummarizerTabCacheService = {
        getOrCreateCache,
        cacheResult,
        getCachedResult,
        cacheConversation,
        getCachedConversation,
        setLoadingState,
        clearTabCache,
        clearAllCache,
        getStats
    };

    console.log("[tabCacheService] Initialized tab cache service");
})();
