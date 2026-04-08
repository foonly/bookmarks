import {
	store,
	updateStore,
	mergeStores,
	purgeDeletedBookmarks,
} from "../store";
import { storageSchema } from "../types";
import { generateCredentials } from "../crypto";
import { sync } from "../sync";
import {
	t,
	formatDate,
	SUPPORTED_LOCALES,
	localeLabels,
	getCurrentLocale,
	initI18n,
} from "../i18n";

/**
 * Re-renders the settings view in the main content area.
 */
function reRender() {
	const mainContent = document.querySelector("#main-content");
	if (mainContent) {
		mainContent.replaceChildren(renderSettingsView());
	}
}

function renderSyncSection(): HTMLElement {
	const section = document.createElement("section");
	section.classList.add("settings-section");

	const syncEnabled = store.sync?.enabled ?? false;
	const syncCreds = store.sync?.credentials ?? "";

	const title = document.createElement("h2");
	title.textContent = t("settings.sync.title");
	section.appendChild(title);

	const description = document.createElement("p");
	description.classList.add("settings-description");
	description.textContent = t("settings.sync.description");
	section.appendChild(description);

	const formField = document.createElement("div");
	formField.classList.add("formField");

	const label = document.createElement("label");
	label.htmlFor = "sync-creds";
	label.textContent = t("settings.sync.credentials_label");
	formField.appendChild(label);

	const inputGroup = document.createElement("div");
	inputGroup.classList.add("sync-input-group");

	const input = document.createElement("input");
	input.type = "password";
	input.id = "sync-creds";
	input.placeholder = t("settings.sync.credentials_placeholder");
	input.value = syncCreds;
	input.onchange = () => {
		updateStore({
			sync: {
				...store.sync,
				credentials: input.value,
				lastSynced: 0,
			},
		});
	};
	inputGroup.appendChild(input);

	const toggleVisibilityBtn = document.createElement("button");
	toggleVisibilityBtn.type = "button";
	toggleVisibilityBtn.id = "toggle-creds-visibility";
	toggleVisibilityBtn.textContent = t("settings.sync.show");
	toggleVisibilityBtn.onclick = () => {
		const isPassword = input.type === "password";
		input.type = isPassword ? "text" : "password";
		toggleVisibilityBtn.textContent = isPassword
			? t("settings.sync.hide")
			: t("settings.sync.show");
	};
	inputGroup.appendChild(toggleVisibilityBtn);

	if (syncEnabled) {
		const copyBtn = document.createElement("button");
		copyBtn.type = "button";
		copyBtn.id = "copy-creds";
		copyBtn.textContent = t("settings.sync.copy");
		copyBtn.onclick = () => {
			const creds = store.sync?.credentials ?? "";
			if (creds) {
				navigator.clipboard.writeText(creds).then(() => {
					const originalText = copyBtn.textContent;
					copyBtn.textContent = t("settings.sync.copied");
					setTimeout(() => {
						copyBtn.textContent = originalText;
					}, 2000);
				});
			}
		};
		inputGroup.appendChild(copyBtn);
	} else {
		const generateBtn = document.createElement("button");
		generateBtn.type = "button";
		generateBtn.id = "generate-creds";
		generateBtn.textContent = t("settings.sync.generate_new");
		generateBtn.onclick = () => {
			const hasCredentials = !!store.sync?.credentials;
			if (!hasCredentials || confirm(t("settings.sync.generate_confirm"))) {
				const creds = generateCredentials();
				input.value = creds;
				updateStore({
					sync: {
						...store.sync,
						credentials: creds,
						lastSynced: 0,
					},
				});
			}
		};
		inputGroup.appendChild(generateBtn);
	}

	formField.appendChild(inputGroup);
	section.appendChild(formField);

	const actions = document.createElement("div");
	actions.classList.add("settings-actions");

	const toggleSyncBtn = document.createElement("button");
	toggleSyncBtn.type = "button";
	toggleSyncBtn.id = "toggle-sync";
	toggleSyncBtn.classList.add(syncEnabled ? "danger-button" : "primary-button");
	toggleSyncBtn.textContent = syncEnabled
		? t("settings.sync.disable_sync")
		: t("settings.sync.enable_sync");
	toggleSyncBtn.onclick = () => {
		const newEnabledState = !(store.sync?.enabled ?? false);
		updateStore({
			sync: {
				...store.sync,
				enabled: newEnabledState,
			},
		});
		reRender();
	};
	actions.appendChild(toggleSyncBtn);

	const syncNowBtn = document.createElement("button");
	syncNowBtn.type = "button";
	syncNowBtn.id = "sync-now";
	syncNowBtn.textContent = t("settings.sync.sync_now");
	syncNowBtn.disabled = !syncEnabled;
	syncNowBtn.onclick = async () => {
		syncNowBtn.disabled = true;
		syncNowBtn.textContent = t("settings.sync.syncing");

		const result = await sync();

		syncNowBtn.disabled = false;
		syncNowBtn.textContent = t("settings.sync.sync_now");

		if (result.success) {
			reRender();
		} else {
			alert(result.message);
		}
	};
	actions.appendChild(syncNowBtn);

	section.appendChild(actions);

	if (store.sync?.lastSynced) {
		const status = document.createElement("p");
		status.classList.add("sync-status");
		status.textContent = t("settings.sync.last_synced", {
			date: formatDate(store.sync.lastSynced),
		});
		section.appendChild(status);
	}

	return section;
}

function renderLanguageSection(): HTMLElement {
	const section = document.createElement("section");
	section.classList.add("settings-section");

	const title = document.createElement("h2");
	title.textContent = t("settings.language");
	section.appendChild(title);

	const currentLocale = getCurrentLocale();
	const formField = document.createElement("div");
	formField.classList.add("formField");

	const select = document.createElement("select");
	select.id = "language-select";
	select.onchange = async () => {
		const newLang = select.value;
		updateStore({ language: newLang });
		await initI18n(newLang);
		window.location.reload();
	};

	SUPPORTED_LOCALES.forEach((locale) => {
		const option = document.createElement("option");
		option.value = locale;
		option.textContent = localeLabels[locale];
		if (locale === currentLocale) {
			option.selected = true;
		}
		select.appendChild(option);
	});

	formField.appendChild(select);
	section.appendChild(formField);
	return section;
}

function renderPrivacySection(): HTMLElement {
	const section = document.createElement("section");
	section.classList.add("settings-section");
	const fetchFavicons = store.fetchFavicons ?? false;

	const title = document.createElement("h2");
	title.textContent = t("settings.privacy.title");
	section.appendChild(title);

	const description = document.createElement("p");
	description.classList.add("settings-description");
	description.textContent = t("settings.privacy.fetch_favicons_description");
	section.appendChild(description);

	const formField = document.createElement("div");
	formField.classList.add("formField");
	formField.classList.add("formRow");

	const label = document.createElement("label");
	label.htmlFor = "fetch-favicons-toggle";
	label.textContent = t("settings.privacy.fetch_favicons");
	formField.appendChild(label);

	const toggle = document.createElement("input");
	toggle.type = "checkbox";
	toggle.id = "fetch-favicons-toggle";
	toggle.checked = fetchFavicons;
	toggle.onchange = () => {
		updateStore({ fetchFavicons: toggle.checked });
	};
	formField.appendChild(toggle);

	section.appendChild(formField);
	return section;
}

function renderDataSection(): HTMLElement {
	const section = document.createElement("section");
	section.classList.add("settings-section");

	const title = document.createElement("h2");
	title.textContent = t("settings.data.title");
	section.appendChild(title);

	const actions = document.createElement("div");
	actions.classList.add("settings-actions");

	const exportBtn = document.createElement("button");
	exportBtn.type = "button";
	exportBtn.textContent = t("settings.data.export");
	exportBtn.onclick = () => {
		const exportData = {
			favoriteTags: store.favoriteTags,
			bookmarks: store.bookmarks,
		};
		const dataStr = JSON.stringify(exportData, null, 2);
		const dataUri =
			"data:application/json;charset=utf-8," + encodeURIComponent(dataStr);
		const link = document.createElement("a");
		link.setAttribute("href", dataUri);
		link.setAttribute("download", "bookmarks-backup.json");
		link.click();
	};
	actions.appendChild(exportBtn);

	const importBtn = document.createElement("button");
	importBtn.type = "button";
	importBtn.textContent = t("settings.data.import");
	importBtn.onclick = () => {
		const input = document.createElement("input");
		input.type = "file";
		input.accept = "application/json";
		input.onchange = (e) => {
			const file = (e.target as HTMLInputElement).files?.[0];
			if (!file) return;

			const reader = new FileReader();
			reader.onload = (e) => {
				try {
					const content = e.target?.result as string;
					const data = JSON.parse(content);
					const result = storageSchema.safeParse(data);
					if (!result.success) {
						alert(t("settings.data.import_invalid"));
						return;
					}
					if (mergeStores(result.data)) {
						alert(t("settings.data.import_success"));
						window.location.reload();
					} else {
						alert(t("settings.data.import_no_changes"));
					}
				} catch (err) {
					console.error("Import error:", err);
					alert(t("settings.data.import_error"));
				}
			};
			reader.readAsText(file);
		};
		input.click();
	};
	actions.appendChild(importBtn);

	const purgeBtn = document.createElement("button");
	purgeBtn.type = "button";
	purgeBtn.title = t("settings.data.purge_tooltip");
	purgeBtn.textContent = t("settings.data.purge");
	purgeBtn.onclick = () => {
		if (confirm(t("settings.data.purge_confirm"))) {
			purgeDeletedBookmarks(true);
			alert(t("settings.data.purge_success"));
			window.location.reload();
		}
	};
	actions.appendChild(purgeBtn);

	const clearBtn = document.createElement("button");
	clearBtn.type = "button";
	clearBtn.classList.add("danger-button");
	clearBtn.textContent = t("settings.data.clear_all");
	clearBtn.onclick = () => {
		if (confirm(t("settings.data.clear_confirm"))) {
			window.localStorage.clear();
			window.location.hash = "#/";
			window.location.reload();
		}
	};
	actions.appendChild(clearBtn);

	section.appendChild(actions);
	return section;
}

export function renderSettingsView(): HTMLElement {
	const container = document.createElement("div");
	container.classList.add("card", "settings-view");

	container.appendChild(renderSyncSection());
	container.appendChild(renderLanguageSection());
	container.appendChild(renderPrivacySection());
	container.appendChild(renderDataSection());

	return container;
}
