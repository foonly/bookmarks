<script setup lang="ts">
import { useI18n } from "vue-i18n";

const { t, tm, rt } = useI18n();

const features = tm("about.features.items") as string[];
const usageTips = tm("about.usage.items") as string[];

// Helper to handle bold text in list items manually or just use v-html for simple bolding
function formatItem(item: string) {
	return item.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
}
</script>

<template>
	<div class="about-view card">
		<h1>{{ t("about.title") }}</h1>

		<p class="description">{{ t("about.description") }}</p>

		<section>
			<h2>{{ t("about.features.title") }}</h2>
			<ul>
				<li
					v-for="(item, index) in features"
					:key="index"
					v-html="formatItem(rt(item))"
				></li>
			</ul>
		</section>

		<section>
			<h2>{{ t("about.usage.title") }}</h2>
			<ul>
				<li
					v-for="(item, index) in usageTips"
					:key="index"
					v-html="formatItem(rt(item))"
				></li>
			</ul>
		</section>

		<section>
			<h2>{{ t("about.privacy.title") }}</h2>
			<p>{{ t("about.privacy.content") }}</p>
			<p>
				{{ t("about.privacy.contact", { email: "" }) }}
				<a href="mailto:bookmarks@foonly.dev">bookmarks@foonly.dev</a>
			</p>
		</section>

		<section>
			<h2>{{ t("about.opensource.title") }}</h2>
			<p>{{ t("about.opensource.content") }}</p>
			<p>
				<a
					href="https://github.com/foonly/bookmarks"
					target="_blank"
					rel="noopener noreferrer"
				>
					{{ t("about.opensource.link") }}
				</a>
			</p>
		</section>
	</div>
</template>

<style scoped>
.about-view {
	text-align: left;
}

h1 {
	margin-top: 0;
	font-size: 1.5rem;
	border-bottom: 1px solid var(--bm-border-color);
	padding-bottom: 0.5rem;
	margin-bottom: 1.5rem;
}

.description {
	font-size: 1.1rem;
	line-height: 1.6;
	margin-bottom: 2rem;
}

section {
	margin-bottom: 2rem;
}

h2 {
	font-size: 1.25rem;
	margin-bottom: 0.75rem;
	color: var(--bm-text-color);
}

p {
	margin-bottom: 1rem;
	color: var(--bm-text-secondary);
	line-height: 1.6;
}

ul {
	margin-bottom: 1rem;
	padding-left: 1.25rem;
	color: var(--bm-text-secondary);
}

li {
	margin-bottom: 0.75rem;
	line-height: 1.5;
}

a {
	text-decoration: underline;
}

:deep(strong) {
	color: var(--bm-text-color);
}
</style>
