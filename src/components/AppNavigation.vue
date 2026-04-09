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
	</nav>
</template>

<style scoped>
/* Styles are inherited from global style.css,
   but we can add component-specific overrides here if needed */

.main-nav {
	display: flex;
	flex-wrap: wrap;
	justify-content: flex-start;
	gap: 0.5rem 1.5rem;
	margin-bottom: 2rem;
	padding: 0.5rem 0;
	border-bottom: 1px solid var(--bm-border-color);
	a {
		padding: 0.25rem 0.75rem;
		border-radius: 4px;
		text-decoration: none;
		&:hover {
			background-color: var(--bm-nav-link-hover-bg);
		}
		&.active {
			background-color: var(--bm-primary-color);
			color: white;
		}
	}
}
</style>
