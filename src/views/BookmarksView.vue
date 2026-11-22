<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from "vue";
import { useI18n } from "vue-i18n";
import { useBookmarkStore } from "../stores/bookmarkStore";
import type { Bookmark } from "../types";
import { ui, pendingDelete } from "../ui";
import { byClicks, matchesQuery } from "../utils/bookmarks";
import { PAGE_SIZE } from "../constants";
import LauncherLayout from "../components/LauncherLayout.vue";
import ListLayout from "../components/ListLayout.vue";
import Modal from "../components/Modal.vue";
import BookmarkForm from "../components/BookmarkForm.vue";

interface Props {
	tag?: string;
	showModal?: "add" | "edit";
	bookmarkId?: number;
}

const props = defineProps<Props>();
const { t } = useI18n();
const store = useBookmarkStore();

const MOST_USED_COUNT = 8;
const visibleCount = ref(PAGE_SIZE);

const searching = computed(() => ui.query.trim() !== "");

/** Bookmarks not waiting to be deleted. */
const visible = computed(() => {
	const pendingId = pendingDelete.bookmark?.created;
	return store.activeBookmarks.filter((b) => b.created !== pendingId);
});

const results = computed(() =>
	visible.value
		.filter((b) => !props.tag || b.tags.includes(props.tag))
		.filter((b) => matchesQuery(b, ui.query))
		.sort(byClicks),
);

const shown = computed(() => results.value.slice(0, visibleCount.value));
const hasMore = computed(() => visibleCount.value < results.value.length);

const mostUsed = computed(() => {
	if (searching.value || props.tag) return [];
	return visible.value
		.filter((b) => (b.clicks || 0) > 0)
		.sort(byClicks)
		.slice(0, MOST_USED_COUNT);
});

watch([() => props.tag, () => ui.query], () => {
	visibleCount.value = PAGE_SIZE;
	ui.selected = 0;
});

function handleOpen(bookmark: Bookmark) {
	store.incrementClick(bookmark.created);
}

/** Arrow keys move through the results and Enter opens one, from the search field. */
function handleSearchKeys(event: KeyboardEvent) {
	if ((event.target as HTMLElement | null)?.id !== "search-input" || !searching.value) return;
	const last = shown.value.length - 1;
	if (event.key === "ArrowDown") {
		event.preventDefault();
		ui.selected = Math.min(ui.selected + 1, last);
	} else if (event.key === "ArrowUp") {
		event.preventDefault();
		ui.selected = Math.max(ui.selected - 1, 0);
	} else if (event.key === "Enter" && !event.isComposing) {
		const bookmark = shown.value[ui.selected];
		if (!bookmark) return;
		event.preventDefault();
		handleOpen(bookmark);
		window.open(bookmark.url, "_blank", "noopener,noreferrer");
		return;
	} else {
		return;
	}
	nextTick(() => document.querySelector(".selected")?.scrollIntoView({ block: "nearest" }));
}

onMounted(() => document.addEventListener("keydown", handleSearchKeys));
onUnmounted(() => document.removeEventListener("keydown", handleSearchKeys));

const isModalOpen = computed(() => !!props.showModal);
const initialTags = computed(() => (props.tag ? [props.tag] : []));

const emptyMessage = computed(() => {
	if (searching.value) return t("bookmarks.no_matches", { query: ui.query.trim() });
	if (props.tag) return t("bookmarks.no_bookmarks_tag", { tag: props.tag });
	return t("bookmarks.no_bookmarks");
});
</script>

<template>
	<div class="bookmarks-view">
		<component
			:is="store.layout === 'list' ? ListLayout : LauncherLayout"
			:bookmarks="shown"
			:total="results.length"
			:most-used="mostUsed"
			:tag="tag"
			:searching="searching"
			:selected="ui.selected"
			@open="handleOpen"
		>
			<template #empty>
				<div class="emptyState">
					<p>{{ emptyMessage }}</p>
					<router-link
						:to="tag ? `/tag/${encodeURIComponent(tag)}/add` : '/add'"
						class="button primaryButton"
						>{{ t("bookmarks.add") }}</router-link
					>
				</div>
			</template>
			<template #more>
				<div v-if="hasMore" class="showMore">
					<button type="button" class="button" @click="visibleCount += PAGE_SIZE">
						{{ t("bookmarks.show_more") }}
					</button>
				</div>
			</template>
		</component>

		<Modal :show="isModalOpen">
			<BookmarkForm v-if="isModalOpen" :id="bookmarkId" :initial-tags="initialTags" />
		</Modal>
	</div>
</template>
