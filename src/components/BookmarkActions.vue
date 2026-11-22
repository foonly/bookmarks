<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import type { Bookmark } from "../types";
import { useBookmarkStore } from "../stores/bookmarkStore";
import { deleteWithUndo } from "../ui";
import { icons } from "../icons";

interface Props {
	bookmark: Bookmark;
	filterTag?: string;
}

const props = defineProps<Props>();
const { t } = useI18n();
const store = useBookmarkStore();

const title = computed(() => props.bookmark.title || props.bookmark.url);

const editLink = computed(() =>
	props.filterTag
		? `/tag/${encodeURIComponent(props.filterTag)}/edit/${props.bookmark.created}`
		: `/edit/${props.bookmark.created}`,
);
</script>

<template>
	<span class="bookmarkActions">
		<router-link
			:to="editLink"
			class="iconButton"
			:title="t('bookmarks.edit_button_title', { title })"
			:aria-label="t('bookmarks.edit_button_title', { title })"
			v-html="icons.edit"
		></router-link>
		<button
			type="button"
			class="iconButton"
			:title="t('bookmarks.delete_button_title', { title })"
			:aria-label="t('bookmarks.delete_button_title', { title })"
			@click="deleteWithUndo(bookmark, store.removeBookmark)"
			v-html="icons.trash"
		></button>
	</span>
</template>
