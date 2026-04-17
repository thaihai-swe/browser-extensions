import { DEFAULT_SETTINGS, getSettings, normalizeSettings, saveSettings } from "../src/shared/storage.js";

const form = document.querySelector("#settings-form");
const status = document.querySelector("#status");

hydrate();
form.addEventListener("submit", handleSubmit);

async function hydrate() {
    const settings = await getSettings();

    for (const [key, defaultValue] of Object.entries(DEFAULT_SETTINGS)) {
        const field = form.elements.namedItem(key);
        if (!field) {
            continue;
        }

        if (field.type === "checkbox") {
            field.checked = Boolean(settings[key]);
        } else {
            field.value = settings[key] ?? defaultValue ?? "";
        }
    }
}

async function handleSubmit(event) {
    event.preventDefault();

    const formData = new FormData(form);
    const payload = normalizeSettings({
        enableSelectionTrigger: form.elements.namedItem("enableSelectionTrigger").checked,
        enableDoubleClickTrigger: form.elements.namedItem("enableDoubleClickTrigger").checked,
        enableShortcutTrigger: form.elements.namedItem("enableShortcutTrigger").checked,
        enableContextMenuTrigger: form.elements.namedItem("enableContextMenuTrigger").checked,
        selectionModifier: formData.get("selectionModifier"),
        doubleClickModifier: formData.get("doubleClickModifier"),
        defaultTab: formData.get("defaultTab"),
        translateTargetLanguage: formData.get("translateTargetLanguage"),
        popupWidth: formData.get("popupWidth"),
        popupHeight: formData.get("popupHeight"),
        aiBaseUrl: formData.get("aiBaseUrl"),
        aiApiKey: formData.get("aiApiKey"),
        aiModel: formData.get("aiModel"),
        aiPromptTemplate: formData.get("aiPromptTemplate"),
        enableTranslate: form.elements.namedItem("enableTranslate").checked,
        enableDictionary: form.elements.namedItem("enableDictionary").checked,
        enableAI: form.elements.namedItem("enableAI").checked,
        enableAiPreload: form.elements.namedItem("enableAiPreload").checked
    });

    await saveSettings(payload);

    if (payload.aiPromptTemplate && payload.aiPromptTemplate.trim() !== DEFAULT_SETTINGS.aiPromptTemplate.trim()) {
        status.textContent = "✓ Settings saved (AI prompt updated)!";
    } else {
        status.textContent = "✓ Settings saved successfully!";
    }
    status.classList.add("is-success");
    status.classList.remove("is-error");

    window.setTimeout(() => {
        status.textContent = "";
        status.classList.remove("is-success", "is-error");
    }, 3000);
}
