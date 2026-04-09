<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import type { Bookmark } from "../types";
import { useBookmarkStore } from "../stores/bookmarkStore";
import { getIconUrl } from "../favicon";
import TagBadge from "./TagBadge.vue";

// Icons
import trashIcon from "/trash.svg?raw";
import editIcon from "/pen-to-square.svg?raw";

interface Props {
	bookmark: Bookmark;
	filterTag?: string;
}

const props = defineProps<Props>();
const { t } = useI18n();
const store = useBookmarkStore();

const truncatedDescription = computed(() => {
	if (!props.bookmark.description) return "";
	return props.bookmark.description.length > 160
		? props.bookmark.description.substring(0, 160) + "..."
		: props.bookmark.description;
});

const displayTitle = computed(() => {
	return props.bookmark.title || props.bookmark.url;
});

const iconUrl = computed(() => {
	if (!store.fetchFavicons || store.isFaviconFailed(props.bookmark.url)) {
		return "/bookmark.svg";
	}
	return getIconUrl(props.bookmark.url);
});

const editLink = computed(() => {
	const tag = props.filterTag;
	return tag
		? `/tag/${encodeURIComponent(tag)}/edit/${props.bookmark.created}`
		: `/edit/${props.bookmark.created}`;
});

function handleLinkClick() {
	store.incrementClick(props.bookmark.created);
}

function handleDelete() {
	if (confirm(t("bookmarks.delete_confirm"))) {
		store.removeBookmark(props.bookmark.created);
	}
}

function handleIconError(event: Event) {
	const img = event.target as HTMLImageElement;

	// Mark as failed in store to prevent future attempts
	store.markFaviconFailed(props.bookmark.url);

	// Prevent infinite loop if fallback also fails
	if (!img.src.includes("/bookmark.svg")) {
		img.src = "/bookmark.svg";
	}
}
</script>

<template>
	<div class="bookmarkItem">
		<div class="bookmarkContent">
			<a
				:href="bookmark.url"
				target="_blank"
				rel="noopener noreferrer"
				class="bookmarkLink"
				:title="bookmark.url"
				@click="handleLinkClick"
			>
				<img
					:src="iconUrl"
					alt=""
					class="bookmarkIcon"
					loading="lazy"
					@error="handleIconError"
				/>
				<span>{{ displayTitle }}</span>
			</a>

			<div v-if="truncatedDescription" class="bookmarkDescription">
				{{ truncatedDescription }}
			</div>

			<div
				v-if="bookmark.tags && bookmark.tags.length > 0"
				class="bookmarkTags"
			>
				<TagBadge v-for="tag in bookmark.tags" :key="tag" :tag="tag" />
			</div>
		</div>

		<div class="bookmarkButtons">
			<router-link
				:to="editLink"
				class="editButton icon"
				:title="t('bookmarks.edit_button_title', { title: displayTitle })"
				:aria-label="t('bookmarks.edit_button_title', { title: displayTitle })"
			>
				<span v-html="editIcon"></span>
			</router-link>

			<button
				type="button"
				class="deleteButton icon"
				:title="t('bookmarks.delete_button_title', { title: displayTitle })"
				:aria-label="
					t('bookmarks.delete_button_title', { title: displayTitle })
				"
				@click="handleDelete"
			>
				<span v-html="trashIcon"></span>
			</button>
		</div>
	</div>
</template>

<style scoped>
.bookmarkButtons {
	display: flex;
	gap: 0.5rem;
}

.icon {
	display: flex;
	align-items: center;
	justify-content: center;
}
</style>
