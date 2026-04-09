<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useBookmarkStore } from "../stores/bookmarkStore";
import BookmarkItem from "../components/BookmarkItem.vue";
import Modal from "../components/Modal.vue";
import BookmarkForm from "../components/BookmarkForm.vue";
import addIcon from "/bookmark-plus.svg?raw";

interface Props {
	tag?: string;
	showModal?: "add" | "edit";
	bookmarkId?: number;
}

const props = defineProps<Props>();
const { t } = useI18n();
const store = useBookmarkStore();

const sortedBookmarks = computed(() => {
	let bookmarks = store.activeBookmarks;

	if (props.tag) {
		bookmarks = bookmarks.filter((b) => b.tags.includes(props.tag!));
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

const allTags = computed(() => store.sortedTags);

const addLink = computed(() => {
	return props.tag ? `/tag/${encodeURIComponent(props.tag)}/add` : "/add";
});

const isModalOpen = computed(() => !!props.showModal);
const initialTags = computed(() => (props.tag ? [props.tag] : []));
</script>

<template>
	<div class="bookmarks-view">
		<div class="bookmarks-toolbar">
			<div class="tag-filter-bar">
				<router-link to="/" class="tag-filter-item" :class="{ active: !tag }">
					{{ t("bookmarks.filter_all") }}
				</router-link>
				<router-link
					v-for="tagName in allTags"
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
				<template v-if="sortedBookmarks.length > 0">
					<BookmarkItem
						v-for="bookmark in sortedBookmarks"
						:key="bookmark.created"
						:bookmark="bookmark"
						:filter-tag="tag"
					/>
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
</style>
