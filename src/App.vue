<script setup lang="ts">
import { onMounted, onUnmounted, ref, inject } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import { registerSW } from "virtual:pwa-register";
import { useBookmarkStore } from "./stores/bookmarkStore";
import AppHeader from "./components/AppHeader.vue";
import UndoToast from "./components/UndoToast.vue";
import { reloadWhenNotEditing } from "./utils/navigation";
import { commitPendingDelete } from "./ui";

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
	// A deletion waiting for Undo goes through when the page is closed.
	window.addEventListener("pagehide", commitPendingDelete);
	updateOnlineStatus();
});

onUnmounted(() => {
	window.removeEventListener("online", updateOnlineStatus);
	window.removeEventListener("offline", updateOnlineStatus);
	window.removeEventListener("pagehide", commitPendingDelete);
});
</script>

<template>
	<div v-if="isOffline" class="offline-indicator">
		{{ t("system.offline_indicator") }}
	</div>

	<AppHeader />

	<div class="container">
		<main id="main-content">
			<router-view v-slot="{ Component }">
				<transition name="fade" mode="out-in">
					<component :is="Component" />
				</transition>
			</router-view>
		</main>

		<footer class="appFooter">
			<router-link to="/about">{{ t("nav.about") }}</router-link>
			<span>{{ appVersion }}</span>
		</footer>
	</div>

	<UndoToast />
</template>
