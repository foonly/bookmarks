<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useBookmarkStore } from "../stores/bookmarkStore";
import Modal from "../components/Modal.vue";
import BookmarkForm from "../components/BookmarkForm.vue";

// Icons
import starIcon from "/star.svg?raw";
import starFilledIcon from "/star-filled.svg?raw";

interface Props {
	showModal?: "edit";
	bookmarkId?: number;
}

const props = defineProps<Props>();
const { t } = useI18n();
const store = useBookmarkStore();

const tagsWithCounts = computed(() => store.tagsWithCounts);
const sortedTags = computed(() => store.sortedTags);

const isModalOpen = computed(() => !!props.showModal);

function getBookmarksForTag(tag: string) {
	return store.getBookmarksByTag(tag).sort((a, b) => {
		const clicksA = a.clicks || 0;
		const clicksB = b.clicks || 0;
		if (clicksB !== clicksA) {
			return clicksB - clicksA;
		}
		return a.title.localeCompare(b.title);
	});
}
</script>

<template>
	<div class="tags-view">
		<div class="bookmarks-toolbar">
			<h1>{{ t("nav.tags") }}</h1>
		</div>

		<div v-if="sortedTags.length > 0" class="tags-grid">
			<section v-for="tag in sortedTags" :key="tag" class="tag-section">
				<h2>
					<router-link :to="`/tag/${encodeURIComponent(tag)}`">
						{{ tag }}
					</router-link>
					<span class="tag-count">{{ tagsWithCounts[tag] || 0 }}</span>
					<button
						class="star-button icon"
						@click="store.toggleFavoriteTag(tag)"
						:aria-label="t('tags.toggle_favorite')"
						v-html="store.isFavoriteTag(tag) ? starFilledIcon : starIcon"
					></button>
				</h2>
				<ul class="tag-bookmark-list">
					<li
						v-for="bookmark in getBookmarksForTag(tag)"
						:key="bookmark.created"
					>
						<a
							:href="bookmark.url"
							target="_blank"
							rel="noopener noreferrer"
							class="bookmark-link"
							@click="store.incrementClick(bookmark.created)"
						>
							{{ bookmark.title || bookmark.url }}
						</a>
						<router-link
							:to="`/tags/edit/${bookmark.created}`"
							class="tag-edit-link"
						>
							{{ t("tags.edit") }}
						</router-link>
					</li>
				</ul>
			</section>
		</div>
		<div v-else class="card">
			<p>{{ t("tags.no_tags") }}</p>
		</div>

		<!-- Modal for Editing -->
		<Modal :show="isModalOpen">
			<BookmarkForm v-if="isModalOpen" :id="bookmarkId" />
		</Modal>
	</div>
</template>

<style scoped>
h1 {
	margin: 0;
	font-size: 1.5rem;
}

.bookmark-link {
	font-size: 0.9rem;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	max-width: 80%;
}
</style>
