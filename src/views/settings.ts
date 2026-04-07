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

export function renderSettingsView(): HTMLElement {
	const container = document.createElement("div");
	container.classList.add("card", "settings-view");

	// Sync Section
	const syncSection = document.createElement("section");
	syncSection.classList.add("settings-section");

	const syncEnabled = store.sync?.enabled ?? false;
	const syncCreds = store.sync?.credentials ?? "";

	syncSection.innerHTML = `
		<h2>${t("settings.sync.title")}</h2>
		<p class="settings-description">
			${t("settings.sync.description")}
		</p>
		<div class="formField">
			<label for="sync-creds">${t("settings.sync.credentials_label")}</label>
			<div class="sync-input-group">
				<input type="password" id="sync-creds" placeholder="${t("settings.sync.credentials_placeholder")}" value="${syncCreds}">
				<button type="button" id="toggle-creds-visibility">${t("settings.sync.show")}</button>
				${
					syncEnabled
						? `<button type="button" id="copy-creds">${t("settings.sync.copy")}</button>`
						: `<button type="button" id="generate-creds">${t("settings.sync.generate_new")}</button>`
				}
			</div>
		</div>
		<div class="settings-actions">
			<button type="button" class="${syncEnabled ? "danger-button" : "primary-button"}" id="toggle-sync">
				${syncEnabled ? t("settings.sync.disable_sync") : t("settings.sync.enable_sync")}
			</button>
			<button type="button" id="sync-now" ${!syncEnabled ? "disabled" : ""}>${t("settings.sync.sync_now")}</button>
		</div>
		${store.sync?.lastSynced ? `<p class="sync-status">${t("settings.sync.last_synced", { date: formatDate(store.sync.lastSynced) })}</p>` : ""}
	`;
	container.appendChild(syncSection);

	// Language Section
	const languageSection = document.createElement("section");
	languageSection.classList.add("settings-section");

	const currentLocale = getCurrentLocale();
	languageSection.innerHTML = `
		<h2>${t("settings.language")}</h2>
		<div class="formField">
			<select id="language-select">
				${SUPPORTED_LOCALES.map(
					(locale) =>
						`<option value="${locale}" ${locale === currentLocale ? "selected" : ""}>${localeLabels[locale]}</option>`,
				).join("")}
			</select>
		</div>
	`;
	container.appendChild(languageSection);

	// Data Management Section
	const dataSection = document.createElement("section");
	dataSection.classList.add("settings-section");
	dataSection.innerHTML = `
		<h2>${t("settings.data.title")}</h2>
		<div class="settings-actions">
			<button type="button" id="export-data">${t("settings.data.export")}</button>
			<button type="button" id="import-data">${t("settings.data.import")}</button>
			<button type="button" id="purge-tombstones" title="${t("settings.data.purge_tooltip")}">${t("settings.data.purge")}</button>
			<button type="button" class="danger-button" id="clear-data">${t("settings.data.clear_all")}</button>
		</div>
	`;
	container.appendChild(dataSection);

	// Event Listeners
	setupEventListeners(container);

	return container;
}

function setupEventListeners(container: HTMLElement) {
	const syncInput = container.querySelector<HTMLInputElement>("#sync-creds");
	const toggleVisibilityBtn = container.querySelector(
		"#toggle-creds-visibility",
	);
	const generateBtn = container.querySelector("#generate-creds");
	const copyBtn = container.querySelector("#copy-creds");
	const toggleSyncBtn = container.querySelector("#toggle-sync");
	const syncNowBtn = container.querySelector("#sync-now");
	const clearBtn = container.querySelector("#clear-data");
	const exportBtn = container.querySelector("#export-data");
	const importBtn = container.querySelector("#import-data");
	const purgeBtn = container.querySelector("#purge-tombstones");
	const languageSelect =
		container.querySelector<HTMLSelectElement>("#language-select");

	languageSelect?.addEventListener("change", async () => {
		const newLang = languageSelect.value;
		updateStore({ language: newLang });
		await initI18n(newLang);
		// Reload to update navigation and other parts
		window.location.reload();
	});

	syncInput?.addEventListener("change", () => {
		updateStore({
			sync: {
				...store.sync,
				credentials: syncInput.value,
				lastSynced: 0,
			},
		});
	});

	toggleVisibilityBtn?.addEventListener("click", () => {
		if (syncInput) {
			const isPassword = syncInput.type === "password";
			syncInput.type = isPassword ? "text" : "password";
			toggleVisibilityBtn.textContent = isPassword
				? t("settings.sync.hide")
				: t("settings.sync.show");
		}
	});

	generateBtn?.addEventListener("click", () => {
		const hasCredentials = !!store.sync?.credentials;
		if (!hasCredentials || confirm(t("settings.sync.generate_confirm"))) {
			const creds = generateCredentials();
			if (syncInput) {
				syncInput.value = creds;
				updateStore({
					sync: {
						...store.sync,
						credentials: creds,
						lastSynced: 0,
					},
				});
			}
		}
	});

	copyBtn?.addEventListener("click", () => {
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
	});

	toggleSyncBtn?.addEventListener("click", () => {
		const newEnabledState = !(store.sync?.enabled ?? false);
		updateStore({
			sync: {
				...store.sync,
				enabled: newEnabledState,
			},
		});
		// Re-render view to update button states
		const mainContent = document.querySelector("#main-content");
		if (mainContent) {
			mainContent.innerHTML = "";
			mainContent.append(renderSettingsView());
		}
	});

	exportBtn?.addEventListener("click", () => {
		// Create a clean export without sync metadata
		const exportData = {
			favoriteTags: store.favoriteTags,
			bookmarks: store.bookmarks,
		};
		const dataStr = JSON.stringify(exportData, null, 2);
		const dataUri =
			"data:application/json;charset=utf-8," + encodeURIComponent(dataStr);
		const exportFileDefaultName = "bookmarks-backup.json";

		const linkElement = document.createElement("a");
		linkElement.setAttribute("href", dataUri);
		linkElement.setAttribute("download", exportFileDefaultName);
		linkElement.click();
	});

	importBtn?.addEventListener("click", () => {
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

					// Validate the schema (partial is okay for import)
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
	});

	syncNowBtn?.addEventListener("click", async () => {
		if (syncNowBtn instanceof HTMLButtonElement) {
			syncNowBtn.disabled = true;
			syncNowBtn.textContent = t("settings.sync.syncing");

			const result = await sync();

			syncNowBtn.disabled = false;
			syncNowBtn.textContent = t("settings.sync.sync_now");

			if (result.success) {
				// Re-render to update the last synced timestamp
				const mainContent = document.querySelector("#main-content");
				if (mainContent) {
					mainContent.innerHTML = "";
					mainContent.append(renderSettingsView());
				}
			} else {
				alert(result.message);
			}
		}
	});

	purgeBtn?.addEventListener("click", () => {
		if (confirm(t("settings.data.purge_confirm"))) {
			purgeDeletedBookmarks(true);
			alert(t("settings.data.purge_success"));
			window.location.reload();
		}
	});

	clearBtn?.addEventListener("click", () => {
		if (confirm(t("settings.data.clear_confirm"))) {
			window.localStorage.clear();
			window.location.hash = "#/";
			window.location.reload();
		}
	});
}
