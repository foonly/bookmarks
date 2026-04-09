<script setup lang="ts">
import { ref, computed } from "vue";
import { useI18n } from "vue-i18n";
import { useBookmarkStore } from "../stores/bookmarkStore";
import { storageSchema } from "../types";
import { generateCredentials } from "../crypto";

import { SUPPORTED_LOCALES, localeLabels } from "../i18n";

// Icons
import eyeIcon from "/eye.svg?raw";
import eyeDashIcon from "/eye-dash.svg?raw";
import copyIcon from "/copy.svg?raw";
import diceIcon from "/dice.svg?raw";

const { t, locale, d } = useI18n();
const store = useBookmarkStore();

// Sync state
const isSyncing = ref(false);
const showCredentials = ref(false);
const syncCreds = ref(store.syncSettings?.credentials || "");
const copied = ref(false);

// Local settings mirrors
const language = computed({
	get: () => store.language || "en",
	set: (val: string) => {
		store.setLanguage(val);
		locale.value = val;
		document.documentElement.lang = val;
	},
});

const fetchFavicons = computed({
	get: () => store.fetchFavicons,
	set: (val: boolean) => store.toggleFetchFavicons(val),
});

// Actions
function toggleCredsVisibility() {
	showCredentials.value = !showCredentials.value;
}

function handleCredsChange() {
	store.updateSyncSettings({
		...store.syncSettings,
		credentials: syncCreds.value,
		lastSynced: 0,
	});
}

function handleGenerateCreds() {
	const hasCredentials = !!store.syncSettings?.credentials;
	if (!hasCredentials || confirm(t("settings.sync.generate_confirm"))) {
		const creds = generateCredentials();
		syncCreds.value = creds;
		store.updateSyncSettings({
			...store.syncSettings,
			credentials: creds,
			lastSynced: 0,
		});
	}
}

function handleCopyCreds() {
	if (syncCreds.value) {
		navigator.clipboard.writeText(syncCreds.value).then(() => {
			copied.value = true;
			setTimeout(() => {
				copied.value = false;
			}, 2000);
		});
	}
}

function handleToggleSync() {
	store.updateSyncSettings({
		...store.syncSettings,
		enabled: !store.syncSettings.enabled,
	});
}

async function handleSyncNow() {
	isSyncing.value = true;
	const result = await store.performSync();
	isSyncing.value = false;

	if (!result.success) {
		alert(result.message);
	}
}

function handleExport() {
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
}

function handleImport() {
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
				if (store.mergeStores(result.data)) {
					alert(t("settings.data.import_success"));
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
}

function handlePurge() {
	if (confirm(t("settings.data.purge_confirm"))) {
		store.purgeDeleted(true);
		alert(t("settings.data.purge_success"));
	}
}

function handleClearAll() {
	if (confirm(t("settings.data.clear_confirm"))) {
		window.localStorage.clear();
		window.location.reload();
	}
}

function formatDate(timestamp: number) {
	return d(new Date(timestamp), "short");
}
</script>

<template>
	<div class="settings-view card">
		<div class="bookmarks-toolbar">
			<h1>{{ t("nav.settings") }}</h1>
		</div>

		<!-- Sync Section -->
		<section class="settings-section">
			<h2>{{ t("settings.sync.title") }}</h2>
			<p class="settings-description">
				{{ t("settings.sync.description") }}
			</p>

			<div class="formField">
				<label for="sync-creds">{{
					t("settings.sync.credentials_label")
				}}</label>
				<div class="sync-input-group">
					<input
						:type="showCredentials ? 'text' : 'password'"
						id="sync-creds"
						v-model="syncCreds"
						:placeholder="t('settings.sync.credentials_placeholder')"
						@change="handleCredsChange"
					/>
					<button
						type="button"
						class="icon"
						:title="
							showCredentials
								? t('settings.sync.hide')
								: t('settings.sync.show')
						"
						:aria-label="
							showCredentials
								? t('settings.sync.hide')
								: t('settings.sync.show')
						"
						@click="toggleCredsVisibility"
						v-html="showCredentials ? eyeDashIcon : eyeIcon"
					></button>

					<button
						v-if="store.syncSettings.enabled"
						type="button"
						class="icon"
						:title="t('settings.sync.copy')"
						:aria-label="t('settings.sync.copy')"
						@click="handleCopyCreds"
					>
						<span v-if="copied" class="copied-indicator">{{
							t("settings.sync.copied")
						}}</span>
						<span v-else v-html="copyIcon"></span>
					</button>
					<button
						v-else
						type="button"
						class="icon"
						:title="t('settings.sync.generate_new')"
						:aria-label="t('settings.sync.generate_new')"
						@click="handleGenerateCreds"
						v-html="diceIcon"
					></button>
				</div>
			</div>

			<div class="settings-actions">
				<button
					type="button"
					:class="
						store.syncSettings.enabled ? 'danger-button' : 'primary-button'
					"
					@click="handleToggleSync"
				>
					{{
						store.syncSettings.enabled
							? t("settings.sync.disable_sync")
							: t("settings.sync.enable_sync")
					}}
				</button>
				<button
					type="button"
					:disabled="!store.syncSettings.enabled || isSyncing"
					@click="handleSyncNow"
				>
					{{
						isSyncing ? t("settings.sync.syncing") : t("settings.sync.sync_now")
					}}
				</button>
			</div>

			<p v-if="store.syncSettings.lastSynced" class="sync-status">
				{{
					t("settings.sync.last_synced", {
						date: formatDate(store.syncSettings.lastSynced),
					})
				}}
			</p>
		</section>

		<!-- Language Section -->
		<section class="settings-section">
			<h2>{{ t("settings.language") }}</h2>
			<div class="formField">
				<select id="language-select" v-model="language">
					<option v-for="loc in SUPPORTED_LOCALES" :key="loc" :value="loc">
						{{ localeLabels[loc] }}
					</option>
				</select>
			</div>
		</section>

		<!-- Privacy Section -->
		<section class="settings-section">
			<h2>{{ t("settings.privacy.title") }}</h2>
			<p class="settings-description">
				{{ t("settings.privacy.fetch_favicons_description") }}
			</p>
			<div class="formField formRow">
				<label for="fetch-favicons-toggle">{{
					t("settings.privacy.fetch_favicons")
				}}</label>
				<input
					type="checkbox"
					id="fetch-favicons-toggle"
					v-model="fetchFavicons"
				/>
			</div>
		</section>

		<!-- Data Management Section -->
		<section class="settings-section">
			<h2>{{ t("settings.data.title") }}</h2>
			<div class="settings-actions">
				<button type="button" @click="handleExport">
					{{ t("settings.data.export") }}
				</button>
				<button type="button" @click="handleImport">
					{{ t("settings.data.import") }}
				</button>
				<button
					type="button"
					:title="t('settings.data.purge_tooltip')"
					@click="handlePurge"
				>
					{{ t("settings.data.purge") }}
				</button>
				<button type="button" class="danger-button" @click="handleClearAll">
					{{ t("settings.data.clear_all") }}
				</button>
			</div>
		</section>
	</div>
</template>

<style scoped>
h1 {
	margin: 0;
	font-size: 1.5rem;
}

.settings-view {
	max-width: 800px;
	margin: 0 auto;
}

.copied-indicator {
	font-size: 0.75rem;
	font-weight: bold;
	margin: 0 0.5rem;
}

.settings-actions button {
	min-width: 140px;
}

.sync-input-group .icon {
	display: flex;
	align-items: center;
	justify-content: center;
}

select {
	padding: 0.5rem;
	border-radius: 4px;
	background-color: var(--bm-input-bg);
	color: var(--bm-text-color);
	border: 1px solid var(--bm-border-color);
}
</style>
