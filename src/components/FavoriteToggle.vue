<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useBookmarkStore } from "../stores/bookmarkStore";
import { icons } from "../icons";

const props = defineProps<{ tag: string }>();
const { t } = useI18n();
const store = useBookmarkStore();

const starred = computed(() => store.isFavoriteTag(props.tag));
const label = computed(() =>
	t(starred.value ? "bookmarks.unstar_tag" : "bookmarks.star_tag", { tag: props.tag }),
);
</script>

<template>
	<button
		type="button"
		class="iconButton favoriteToggle"
		:class="{ starred }"
		:aria-pressed="starred"
		:title="label"
		:aria-label="label"
		@click="store.toggleFavoriteTag(tag)"
		v-html="starred ? icons.starFilled : icons.star"
	></button>
</template>
