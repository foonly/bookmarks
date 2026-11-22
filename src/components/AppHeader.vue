<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import { useBookmarkStore } from "../stores/bookmarkStore";
import { syncStatus, CLOCK_WARNING_SECONDS } from "../syncStatus";
import { ui, pendingCount } from "../ui";
import { icons } from "../icons";
import type { Layout } from "../types";

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const store = useBookmarkStore();
const searchInput = ref<HTMLInputElement | null>(null);

const currentTag = computed(() =>
	typeof route.params.tag === "string" ? route.params.tag : undefined,
);

const addLink = computed(() =>
	currentTag.value ? `/tag/${encodeURIComponent(currentTag.value)}/add` : "/add",
);

// Flag Settings when sync has a problem the user should look at. Network
// errors are left out: the offline indicator already covers them.
const syncNeedsAttention = computed(
	() =>
		store.syncSettings.enabled &&
		((syncStatus.error !== null && syncStatus.error.code !== "network") ||
			Math.abs(syncStatus.clockOffsetSeconds ?? 0) > CLOCK_WARNING_SECONDS),
);

const layouts: { value: Layout; icon: string; label: string }[] = [
	{ value: "launcher", icon: icons.tiles, label: "settings.layout.launcher" },
	{ value: "list", icon: icons.list, label: "settings.layout.list" },
];

/** Searching from Settings or About takes you to the bookmarks. */
function handleInput() {
	if (route.name !== "bookmarks" && route.name !== "tag-bookmarks") {
		router.push("/");
	}
}

function handleKeydown(event: KeyboardEvent) {
	if (event.key === "Escape" && ui.query) {
		event.preventDefault();
		ui.query = "";
	}
}

/** "/" jumps to search from anywhere outside a text field. */
function handleGlobalKeydown(event: KeyboardEvent) {
	if (event.key !== "/" || event.ctrlKey || event.metaKey || event.altKey) return;
	const target = event.target as HTMLElement;
	if (target.closest("input, textarea, select, [contenteditable], dialog")) return;
	event.preventDefault();
	searchInput.value?.focus();
}

onMounted(() => {
	document.addEventListener("keydown", handleGlobalKeydown);
	// Opening the app is usually about finding something, so start in search
	// on screens with a physical keyboard. Phones would pop up the keyboard.
	if (route.name === "bookmarks" && matchMedia("(hover: hover)").matches) {
		searchInput.value?.focus();
	}
});

onUnmounted(() => document.removeEventListener("keydown", handleGlobalKeydown));
</script>

<template>
	<header class="appHeader">
		<div class="appHeaderInner">
			<router-link to="/" class="brand" @click="ui.query = ''">
				<span v-html="icons.ribbon"></span>{{ t("nav.bookmarks") }}
			</router-link>

			<label class="searchField">
				<span v-html="icons.search"></span>
				<input
					id="search-input"
					ref="searchInput"
					v-model="ui.query"
					type="search"
					:placeholder="t('bookmarks.search_placeholder', { n: store.activeBookmarks.length - pendingCount() })"
					:aria-label="t('bookmarks.search_label')"
					autocomplete="off"
					enterkeyhint="go"
					@input="handleInput"
					@keydown="handleKeydown"
				/>
				<kbd class="searchHint" aria-hidden="true">/</kbd>
			</label>

			<div class="headerActions">
				<div class="layoutToggle" role="group" :aria-label="t('settings.layout.title')">
					<button
						v-for="option in layouts"
						:key="option.value"
						type="button"
						class="iconButton"
						:aria-pressed="store.layout === option.value"
						:title="t(option.label)"
						:aria-label="t(option.label)"
						@click="store.setLayout(option.value)"
						v-html="option.icon"
					></button>
				</div>

				<router-link :to="addLink" class="button primaryButton addButton">
					<span v-html="icons.plus"></span>
					<span class="addLabel">{{ t("bookmarks.add") }}</span>
				</router-link>

				<router-link
					to="/settings"
					class="iconButton settingsLink"
					:title="syncNeedsAttention ? t('settings.sync.needs_attention') : t('nav.settings')"
					:aria-label="
						syncNeedsAttention
							? `${t('nav.settings')}: ${t('settings.sync.needs_attention')}`
							: t('nav.settings')
					"
				>
					<span v-html="icons.gear"></span>
					<span v-if="syncNeedsAttention" class="attentionDot"></span>
				</router-link>
			</div>
		</div>
	</header>
</template>
