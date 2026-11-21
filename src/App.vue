<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, inject } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import { registerSW } from "virtual:pwa-register";
import { useBookmarkStore } from "./stores/bookmarkStore";
import AppNavigation from "./components/AppNavigation.vue";
import { syncStatus, CLOCK_WARNING_SECONDS } from "./syncStatus";
import { reloadWhenNotEditing } from "./utils/navigation";

const { t, locale } = useI18n();
const router = useRouter();
const store = useBookmarkStore();
const isOffline = ref(!navigator.onLine);
const appVersion = inject<string>("appVersion", "");

// Initialize store and sync
store.loadStore();
store.initAutoSync();

// Sync locale from store
if (store.language) {
	locale.value = store.language;
	document.documentElement.lang = store.language;
}

// Flag the Settings link when sync has a problem the user should look at.
// Network errors are left out: the offline indicator already covers them.
const syncNeedsAttention = computed(
	() =>
		store.syncSettings.enabled &&
		((syncStatus.error !== null && syncStatus.error.code !== "network") ||
			Math.abs(syncStatus.clockOffsetSeconds ?? 0) > CLOCK_WARNING_SECONDS),
);

// Offline status handling
const updateOnlineStatus = () => {
	isOffline.value = !navigator.onLine;
	document.body.classList.toggle("is-offline", isOffline.value);
};

// Register Service Worker
registerSW({
	onOfflineReady() {
		console.log(t("system.offline_ready"));
	},
	// With autoUpdate, a new version activates on its own and the page then
	// needs a reload to use it. Hold that off while a bookmark form is open.
	onNeedReload() {
		reloadWhenNotEditing(router);
	},
});

onMounted(() => {
	window.addEventListener("online", updateOnlineStatus);
	window.addEventListener("offline", updateOnlineStatus);
	updateOnlineStatus();
});

onUnmounted(() => {
	window.removeEventListener("online", updateOnlineStatus);
	window.removeEventListener("offline", updateOnlineStatus);
});
</script>

<template>
	<div class="container">
		<div v-if="isOffline" class="offline-indicator">
			{{ t("system.offline_indicator") }}
		</div>

		<AppNavigation />

		<main id="main-content">
			<router-view v-slot="{ Component }">
				<transition name="fade" mode="out-in">
					<component :is="Component" />
				</transition>
			</router-view>
		</main>

		<footer>
			<router-link to="/about" active-class="active">
				{{ t("nav.about") }}
			</router-link>
			<router-link to="/settings" active-class="active">
				{{ t("nav.settings") }}
				<span
					v-if="syncNeedsAttention"
					class="attention-marker"
					role="img"
					:title="t('settings.sync.needs_attention')"
					:aria-label="t('settings.sync.needs_attention')"
					>!</span
				>
			</router-link>
			<div id="version">
				{{ appVersion }}
			</div>
		</footer>
	</div>
</template>

<style>
.container {
	display: flex;
	flex-direction: column;
	min-height: 100vh;
	main {
		flex: 1;
	}
	footer {
		display: flex;
		flex-direction: row;
		gap: 1rem;
		align-items: center;
		justify-content: flex-end;

		a.active {
			font-weight: bold;
			text-decoration: underline;
		}
	}
	#version {
		color: var(--bm-text-dim);
		font-size: 0.75rem;
	}
}

.fade-enter-active,
.fade-leave-active {
	transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
	opacity: 0;
}

/* Offline indicator logic is partially in style.css,
   but we ensure the body class is managed by Vue here */
</style>
