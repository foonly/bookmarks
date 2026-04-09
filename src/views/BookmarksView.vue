<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useBookmarkStore } from "../stores/bookmarkStore";
import BookmarkItem from "../components/BookmarkItem.vue";
import Modal from "../components/Modal.vue";
import BookmarkForm from "../components/BookmarkForm.vue";
import addIcon from "/bookmark-plus.svg?raw";
import { PAGE_SIZE } from "../constants";

interface Props {
	tag?: string;
	showModal?: "add" | "edit";
	bookmarkId?: number;
}

const props = defineProps<Props>();
const { t } = useI18n();
const store = useBookmarkStore();

const searchQuery = ref("");
const debouncedSearchQuery = ref("");

const visibleCount = ref(PAGE_SIZE);

let debounceTimeout: number | undefined;
watch(searchQuery, (newVal) => {
	if (debounceTimeout) clearTimeout(debounceTimeout);
	debounceTimeout = window.setTimeout(() => {
		debouncedSearchQuery.value = newVal;
	}, 300);
});

const sortedBookmarks = computed(() => {
	let bookmarks = store.activeBookmarks;

	if (props.tag) {
		bookmarks = bookmarks.filter((b) => b.tags.includes(props.tag!));
	}

	if (debouncedSearchQuery.value) {
		const q = debouncedSearchQuery.value.toLowerCase();
		bookmarks = bookmarks.filter(
			(b) =>
				b.title.toLowerCase().includes(q) ||
				b.description.toLowerCase().includes(q) ||
				b.tags.some((tag) => tag.toLowerCase().includes(q)),
		);
	}

	return [...bookmarks].sort((a, b) => {
		const clicksA = a.clicks || 0;
		const clicksB = b.clicks || 0;
		if (clicksB !== clicksA) {
			return clicksB - clicksA;
		}
		return a.title.localeCompare(b.title);
	});
});

const paginatedBookmarks = computed(() => {
	return sortedBookmarks.value.slice(0, visibleCount.value);
});

const hasMore = computed(() => {
	return visibleCount.value < sortedBookmarks.value.length;
});

function loadMore() {
	visibleCount.value += PAGE_SIZE;
}

watch([() => props.tag, debouncedSearchQuery], () => {
	visibleCount.value = PAGE_SIZE;
});

const displayedTags = computed(() => {
	const suggested = store.suggestedTags;
	if (props.tag && !suggested.includes(props.tag)) {
		return [...suggested, props.tag].sort();
	}
	return suggested;
});

const addLink = computed(() => {
	return props.tag ? `/tag/${encodeURIComponent(props.tag)}/add` : "/add";
});

const isModalOpen = computed(() => !!props.showModal);
const initialTags = computed(() => (props.tag ? [props.tag] : []));
</script>

<template>
	<div class="bookmarks-view">
		<div class="search-bar">
			<input
				type="text"
				v-model="searchQuery"
				:placeholder="t('bookmarks.search_placeholder')"
				class="search-input"
			/>
		</div>

		<div class="bookmarks-toolbar">
			<div class="tag-filter-bar">
				<router-link to="/" class="tag-filter-item" :class="{ active: !tag }">
					{{ t("bookmarks.filter_all") }}
				</router-link>
				<router-link
					v-for="tagName in displayedTags"
					:key="tagName"
					:to="`/tag/${encodeURIComponent(tagName)}`"
					class="tag-filter-item"
					:class="{ active: tag === tagName }"
				>
					{{ tagName }}
				</router-link>
			</div>

			<router-link
				:to="addLink"
				class="bookmarkButton icon"
				:title="t('bookmarks.add_button_title')"
				:aria-label="t('bookmarks.add_button_title')"
			>
				<span v-html="addIcon"></span>
			</router-link>
		</div>

		<div class="card">
			<div id="bookmarksList">
				<template v-if="paginatedBookmarks.length > 0">
					<BookmarkItem
						v-for="bookmark in paginatedBookmarks"
						:key="bookmark.created"
						:bookmark="bookmark"
						:filter-tag="tag"
					/>
					<div v-if="hasMore" class="show-more-container">
						<button @click="loadMore" class="show-more-button">
							{{ t("bookmarks.show_more") }}
						</button>
					</div>
				</template>
				<p v-else class="no-bookmarks">
					{{
						tag
							? t("bookmarks.no_bookmarks_tag", { tag })
							: t("bookmarks.no_bookmarks")
					}}
				</p>
			</div>
		</div>

		<!-- Modal for Add/Edit -->
		<Modal :show="isModalOpen">
			<BookmarkForm
				v-if="isModalOpen"
				:id="bookmarkId"
				:initial-tags="initialTags"
			/>
		</Modal>
	</div>
</template>

<style scoped>
.bookmarks-view {
	width: 100%;
}

.search-bar {
	margin-bottom: 1.5rem;
}

.search-input {
	width: 100%;
	padding: 0.75rem 1rem;
	border: 1px solid var(--bm-border-color);
	border-radius: 8px;
	background-color: var(--bm-input-bg);
	color: var(--bm-text-color);
	font-size: 1rem;
	transition: all 0.2s ease;
}

.search-input:focus {
	outline: none;
	border-color: var(--bm-primary-color);
	background-color: var(--bm-input-focus-bg);
	box-shadow: 0 0 0 2px var(--bm-nav-link-hover-bg);
}

.no-bookmarks {
	color: var(--bm-text-dim);
	font-style: italic;
	padding: 1rem 0;
}

.icon {
	display: flex;
	align-items: center;
	justify-content: center;
}

.show-more-container {
	width: 100%;
	display: flex;
	justify-content: center;
	padding: 1rem 0;
}

.show-more-button {
	padding: 0.5rem 1.5rem;
	background-color: var(--bm-button-secondary-bg);
	border: 1px solid var(--bm-border-color);
	border-radius: 4px;
	color: var(--bm-text-color);
	font-weight: 600;
	cursor: pointer;
	transition: all 0.2s ease;
}

.show-more-button:hover {
	background-color: var(--bm-button-secondary-hover-bg);
	border-color: var(--bm-text-dim);
}
</style>
