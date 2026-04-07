import {
	store,
	updateStore,
	mergeStores,
	purgeDeletedBookmarks,
} from "../store";
import { storageSchema } from "../types";
import { generateCredentials } from "../crypto";
import { sync } from "../sync";

export function renderSettingsView(): HTMLElement {
	const container = document.createElement("div");
	container.classList.add("card", "settings-view");

	// Sync Section
	const syncSection = document.createElement("section");
	syncSection.classList.add("settings-section");

	const syncEnabled = store.sync?.enabled ?? false;
	const syncCreds = store.sync?.credentials ?? "";

	syncSection.innerHTML = `
		<h2>Syncing</h2>
		<p class="settings-description">
			Sync your bookmarks across devices using an ID and Secret key.
			Your data is encrypted locally before being uploaded.
		</p>
		<div class="formField">
			<label for="sync-creds">Sync Credentials (ID:Secret)</label>
			<div class="sync-input-group">
				<input type="password" id="sync-creds" placeholder="Paste your ID:Secret here..." value="${syncCreds}">
				<button type="button" id="toggle-creds-visibility">Show</button>
				${
					syncEnabled
						? '<button type="button" id="copy-creds">Copy</button>'
						: '<button type="button" id="generate-creds">Generate New</button>'
				}
			</div>
		</div>
		<div class="settings-actions">
			<button type="button" class="${syncEnabled ? "danger-button" : "primary-button"}" id="toggle-sync">
				${syncEnabled ? "Disable Sync" : "Enable Sync"}
			</button>
			<button type="button" id="sync-now" ${!syncEnabled ? "disabled" : ""}>Sync Now</button>
		</div>
		${store.sync?.lastSynced ? `<p class="sync-status">Last synced: ${new Date(store.sync.lastSynced).toLocaleString()}</p>` : ""}
	`;
	container.appendChild(syncSection);

	// Data Management Section
	const dataSection = document.createElement("section");
	dataSection.classList.add("settings-section");
	dataSection.innerHTML = `
		<h2>Data Management</h2>
		<div class="settings-actions">
			<button type="button" id="export-data">Export JSON</button>
			<button type="button" id="import-data">Import JSON</button>
			<button type="button" id="purge-tombstones" title="Permanently remove bookmarks marked as deleted">Purge Deleted</button>
			<button type="button" class="danger-button" id="clear-data">Clear All Data</button>
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

	syncInput?.addEventListener("change", () => {
		updateStore({
			sync: {
				...store.sync,
				credentials: syncInput.value,
			},
		});
	});

	toggleVisibilityBtn?.addEventListener("click", () => {
		if (syncInput) {
			const isPassword = syncInput.type === "password";
			syncInput.type = isPassword ? "text" : "password";
			toggleVisibilityBtn.textContent = isPassword ? "Hide" : "Show";
		}
	});

	generateBtn?.addEventListener("click", () => {
		const hasCredentials = !!store.sync?.credentials;
		if (
			!hasCredentials ||
			confirm(
				"Generating new credentials will replace your current ones. If you have synced data on the server, you will lose access to it unless you have backed up the old credentials. Continue?",
			)
		) {
			const creds = generateCredentials();
			if (syncInput) {
				syncInput.value = creds;
				updateStore({
					sync: {
						...store.sync,
						credentials: creds,
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
				copyBtn.textContent = "Copied!";
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
						alert("Invalid backup file format.");
						return;
					}

					if (mergeStores(result.data)) {
						alert("Bookmarks imported and merged successfully!");
						window.location.reload();
					} else {
						alert("No new changes found in the backup file.");
					}
				} catch (err) {
					console.error("Import error:", err);
					alert("Failed to parse the backup file.");
				}
			};
			reader.readAsText(file);
		};

		input.click();
	});

	syncNowBtn?.addEventListener("click", async () => {
		if (syncNowBtn instanceof HTMLButtonElement) {
			syncNowBtn.disabled = true;
			syncNowBtn.textContent = "Syncing...";

			const result = await sync();

			syncNowBtn.disabled = false;
			syncNowBtn.textContent = "Sync Now";

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
		if (
			confirm(
				"Permanently remove all bookmarks marked as deleted? Only do this if you are sure all your devices have synced the deletions.",
			)
		) {
			purgeDeletedBookmarks(true);
			alert("Tombstones purged.");
			window.location.reload();
		}
	});

	clearBtn?.addEventListener("click", () => {
		if (
			confirm(
				"Are you sure you want to delete ALL bookmarks and settings? This cannot be undone.",
			)
		) {
			window.localStorage.clear();
			window.location.hash = "#/";
			window.location.reload();
		}
	});
}
