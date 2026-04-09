<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import { useI18n } from "vue-i18n";

const route = useRoute();
const { t } = useI18n();

const isBookmarksActive = computed(() => {
	const path = route.path;
	return (
		path === "/" ||
		path.startsWith("/tag/") ||
		path.startsWith("/add") ||
		path.startsWith("/edit")
	);
});
</script>

<template>
	<nav class="main-nav">
		<router-link to="/" :class="{ active: isBookmarksActive }">
			{{ t("nav.bookmarks") }}
		</router-link>
		<router-link to="/tags" active-class="active">
			{{ t("nav.tags") }}
		</router-link>
		<router-link to="/about" active-class="active">
			{{ t("nav.about") }}
		</router-link>
		<router-link to="/settings" active-class="active">
			{{ t("nav.settings") }}
		</router-link>
	</nav>
</template>

<style scoped>
/* Styles are inherited from global style.css,
   but we can add component-specific overrides here if needed */
</style>
