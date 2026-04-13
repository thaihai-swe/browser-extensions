// Ensure the script initializes only once per page/frame to avoid
// multiple observers and duplicated event listeners which can cause
// high memory usage and browser instability.
if (window.__defaultVideoSpeedSetterInitialized) {
    // Already initialized in this frame - do nothing.
    console.debug('Default Video Speed Setter: already initialized');
} else {
    window.__defaultVideoSpeedSetterInitialized = true;

    // ============================================================================
    // PERFORMANCE & MEMORY OPTIMIZATION
    // ============================================================================

    // Cache for storage values to avoid repeated I/O
    let cachedSpeed = 1.25;
    let cacheExpiry = 0;

    // Map to track video elements and their cleanup handlers
    const videoTracking = new WeakMap();

    // Debounce timer for mutation observer
    let mutationDebounceTimer = null;
    const MUTATION_DEBOUNCE_MS = 100;

    /**
     * Load speed settings from storage (cached)
     */
    const loadSpeedSettings = () => {
        return new Promise((resolve) => {
            const now = Date.now();
            // Cache for 5 seconds to reduce I/O
            if (now < cacheExpiry) {
                resolve({ speed: cachedSpeed });
                return;
            }

            chrome.storage.sync.get(["defaultSpeed"], (result) => {
                cachedSpeed = result.defaultSpeed || 1.25;
                cacheExpiry = now + 5000;
                console.log('Loaded speed from storage:', cachedSpeed);
                resolve({ speed: cachedSpeed });
            });
        });
    };

    /**
     * Get the target speed
     */
    const getTargetSpeed = async () => {
        const { speed } = await loadSpeedSettings();
        return speed;
    };

    /**
     * Apply speed to video with proper error handling
     */
    const applySpeed = async (video) => {
        if (!video) return;

        try {
            const targetSpeed = await getTargetSpeed();

            // Validate speed
            if (targetSpeed < 0.25 || targetSpeed > 5) {
                console.warn(`Invalid speed value: ${targetSpeed}`);
                return;
            }

            // Set speed immediately
            video.playbackRate = targetSpeed;
            console.log('Speed set to:', targetSpeed, 'on video:', video);

            // YouTube and other players need repeated application
            // Apply immediately
            setTimeout(() => {
                if (video.parentElement) {
                    video.playbackRate = targetSpeed;
                    console.log('Re-applied speed: ', targetSpeed);
                }
            }, 100);

            // Apply again after 500ms (for YouTube metadata loading)
            setTimeout(() => {
                if (video.parentElement) {
                    video.playbackRate = targetSpeed;
                    console.log('Re-applied speed (delayed): ', targetSpeed);
                }
            }, 500);
        } catch (err) {
            console.error('Error applying speed:', err);
        }
    };

    /**
     * Setup video element with proper cleanup handlers
     */
    const setupVideo = (video) => {
        if (!video) return;

        // Prevent attaching duplicate listeners to the same element
        if (videoTracking.has(video)) return;

        // Create abort controller for this video's listeners
        const abortController = new AbortController();
        videoTracking.set(video, { abortController });

        console.log('Setting up video element');

        // 1. Try to set it immediately
        applySpeed(video);

        // 2. Set it when the video actually starts playing
        video.addEventListener('play', () => {
            console.log('Play event triggered');
            applySpeed(video);
        }, { signal: abortController.signal });

        // 3. Set it when the video finishes loading its data (Crucial for YouTube)
        video.addEventListener('loadedmetadata', () => {
            console.log('Metadata loaded');
            applySpeed(video);
        }, { signal: abortController.signal });

        // 4. If the site tries to change it back, snap it back
        video.addEventListener('ratechange', async () => {
            const targetSpeed = await getTargetSpeed();
            if (Math.abs(video.playbackRate - targetSpeed) > 0.01) {
                console.log('Speed changed, reapplying:', targetSpeed);
                try {
                    video.playbackRate = targetSpeed;
                } catch (e) {
                    console.error('Error resetting speed:', e);
                }
            }
        }, { signal: abortController.signal });

        // Cleanup when video is removed from DOM
        const observer = new MutationObserver(() => {
            if (!document.contains(video)) {
                console.log('Video removed from DOM, cleaning up');
                abortController.abort();
                observer.disconnect();
                videoTracking.delete(video);
            }
        });

        observer.observe(video.parentElement || document.body, {
            childList: true,
            subtree: false
        });
    };

    /**
     * Debounced mutation observer to process DOM changes efficiently
     */
    if (!window.__defaultVideoSpeedSetterObserver) {
        const processMutations = (mutations) => {
            for (const mutation of mutations) {
                mutation.addedNodes.forEach(node => {
                    if (!node) return;
                    if (node.nodeName === 'VIDEO') {
                        setupVideo(node);
                    } else if (node.querySelectorAll) {
                        try {
                            node.querySelectorAll('video').forEach(setupVideo);
                        } catch (e) {
                            // Some elements throw on querySelectorAll (e.g., SVG)
                        }
                    }
                });
            }
        };

        const debouncedMutationProcessor = (mutations) => {
            if (mutationDebounceTimer) clearTimeout(mutationDebounceTimer);
            mutationDebounceTimer = setTimeout(() => {
                processMutations(mutations);
                mutationDebounceTimer = null;
            }, MUTATION_DEBOUNCE_MS);
        };

        window.__defaultVideoSpeedSetterObserver = new MutationObserver(debouncedMutationProcessor);

        window.__defaultVideoSpeedSetterObserver.observe(document.documentElement, {
            childList: true,
            subtree: true
        });
    }

    // Initial scan for existing videos
    document.querySelectorAll('video').forEach(setupVideo);

    // Listen for storage changes from other tabs/windows
    chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName === 'sync' && changes.defaultSpeed) {
            console.log('Speed changed in storage, invalidating cache and reapplying');
            // Invalidate cache
            cacheExpiry = 0;
            // Reapply speed to all videos
            document.querySelectorAll('video').forEach(applySpeed);
        }
    });
}
