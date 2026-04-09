<script setup lang="ts">
import { onMounted, onUnmounted, ref, inject } from "vue";
import { useI18n } from "vue-i18n";
import { registerSW } from "virtual:pwa-register";
import { useBookmarkStore } from "./stores/bookmarkStore";
import AppNavigation from "./components/AppNavigation.vue";

const { t, locale } = useI18n();
const store = useBookmarkStore();
const isOffline = ref(!navigator.onLine);
const appVersion = inject<string>("appVersion", "");

// Initialize store and sync
store.loadStore();
store.initAutoSync();

// Sync locale from store
if (store.language) {
	locale.value = store.language;
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
	onNeedRefresh() {
		if (confirm(t("system.update_available"))) {
			location.reload();
		}
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
