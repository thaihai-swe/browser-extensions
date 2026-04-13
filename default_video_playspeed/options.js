// ============================================================================
// OPTIONS PAGE: Settings Management with Validation
// ============================================================================

const speedInput = document.getElementById("speed");
const saveBtn = document.getElementById("save");
const status = document.getElementById("status");

// Preset buttons
const presetButtons = document.querySelectorAll(".preset-btn");

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate speed value
 */
const validateSpeed = (speed) => {
    const num = parseFloat(speed);
    if (isNaN(num)) return { valid: false, error: "Speed must be a number" };
    if (num < 0.25) return { valid: false, error: "Minimum speed is 0.25x" };
    if (num > 5) return { valid: false, error: "Maximum speed is 5x" };
    return { valid: true, value: num };
};

/**
 * Show status message
 */
const showStatus = (element, message, type = "success", duration = 2000) => {
    element.textContent = message;
    element.className = `status ${type}`;

    if (duration > 0) {
        setTimeout(() => {
            element.className = "status";
            element.textContent = "";
        }, duration);
    }
};

// ============================================================================
// LOAD INITIAL SETTINGS
// ============================================================================

const loadSettings = () => {
    chrome.storage.sync.get(
        ["defaultSpeed"],
        (result) => {
            const speed = result.defaultSpeed || 1.25;
            speedInput.value = speed;
            updatePresetButtons(speed);
        }
    );
};

/**
 * Update preset button active state
 */
const updatePresetButtons = (speed) => {
    presetButtons.forEach(btn => {
        const btnSpeed = parseFloat(btn.dataset.speed);
        if (Math.abs(btnSpeed - parseFloat(speed)) < 0.01) {
            btn.classList.add("active");
        } else {
            btn.classList.remove("active");
        }
    });
};

// ============================================================================
// EVENT LISTENERS: Main Speed Settings
// ============================================================================

// Save main speed setting
saveBtn.addEventListener("click", () => {
    const validation = validateSpeed(speedInput.value);

    if (!validation.valid) {
        showStatus(status, validation.error, "error");
        return;
    }

    const speed = validation.value;
    chrome.storage.sync.set({ defaultSpeed: speed }, () => {
        showStatus(status, "Speed updated successfully!", "success");
        updatePresetButtons(speed);
    });
});

// Preset button clicks
presetButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
        const speed = parseFloat(btn.dataset.speed);
        speedInput.value = speed;
        updatePresetButtons(speed);

        chrome.storage.sync.set({ defaultSpeed: speed }, () => {
            showStatus(status, `Speed set to ${speed}x`, "success");
        });
    });
});

// Enter key on speed input
speedInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
        saveBtn.click();
    }
});

// Update preset buttons on input change
speedInput.addEventListener("input", (e) => {
    updatePresetButtons(e.target.value);
});

// ============================================================================
// INITIALIZE
// ============================================================================

loadSettings();
