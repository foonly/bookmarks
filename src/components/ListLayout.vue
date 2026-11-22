<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import type { Bookmark } from "../types";
import { useBookmarkStore } from "../stores/bookmarkStore";
import { domainOf } from "../utils/bookmarks";
import BookmarkIcon from "./BookmarkIcon.vue";
import BookmarkActions from "./BookmarkActions.vue";
import FavoriteToggle from "./FavoriteToggle.vue";
import { pendingCount } from "../ui";

interface Props {
	bookmarks: Bookmark[];
	total: number;
	tag?: string;
	searching: boolean;
	selected: number;
	/** Shown only by the launcher; declared so it is not rendered as an attribute. */
	mostUsed?: Bookmark[];
}

defineProps<Props>();
const emit = defineEmits<{ open: [bookmark: Bookmark] }>();
const { t } = useI18n();
const store = useBookmarkStore();

const starred = computed(() => store.tagList.filter((entry) => entry.favorite));
const others = computed(() => store.tagList.filter((entry) => !entry.favorite));
</script>

<template>
	<div class="listLayout">
		<nav class="tagSidebar" :aria-label="t('bookmarks.tags_label')">
			<router-link to="/" class="sideLink" :class="{ active: !tag }" :aria-current="!tag ? 'page' : undefined">
				{{ t("bookmarks.all") }} <span class="count">{{ store.activeBookmarks.length - pendingCount() }}</span>
			</router-link>
			<template v-for="group in [{ key: 'starred', items: starred }, { key: 'tags', items: others }]" :key="group.key">
				<div v-if="group.items.length > 0" class="sideGroup">
					<div class="sideGroupLabel">
						{{ group.key === "starred" ? t("bookmarks.starred") : t("bookmarks.tags_label") }}
					</div>
					<router-link
						v-for="entry in group.items"
						:key="entry.tag"
						:to="`/tag/${encodeURIComponent(entry.tag)}`"
						class="sideLink"
						:class="{ active: tag === entry.tag }"
						:aria-current="tag === entry.tag ? 'page' : undefined"
					>
						{{ entry.tag }} <span class="count">{{ entry.count - pendingCount(entry.tag) }}</span>
					</router-link>
				</div>
			</template>
		</nav>

		<div class="listMain">
			<div class="listHeading">
				<h1 class="listTitle">
					{{ searching ? t("bookmarks.matches", total) : tag || t("bookmarks.all") }}
				</h1>
				<span v-if="!searching" class="count">{{ total }}</span>
				<FavoriteToggle v-if="tag && !searching" :tag="tag" />
			</div>

			<ul v-if="bookmarks.length > 0" class="entries">
				<li
					v-for="(bookmark, index) in bookmarks"
					:key="bookmark.created"
					class="entry"
					:class="{ selected: searching && index === selected }"
				>
					<BookmarkIcon :url="bookmark.url" />
					<a
						:href="bookmark.url"
						target="_blank"
						rel="noopener noreferrer"
						class="entryTitle"
						:title="bookmark.url"
						@click="emit('open', bookmark)"
						>{{ bookmark.title || bookmark.url }}</a
					>
					<BookmarkActions :bookmark="bookmark" :filter-tag="tag" />
					<p class="entryMeta">
						<span class="entryDomain">{{ domainOf(bookmark.url) }}</span>
						<template v-if="bookmark.description"> · {{ bookmark.description }}</template>
					</p>
					<p v-if="bookmark.tags.length > 0" class="entryTags">
						<router-link
							v-for="entryTag in bookmark.tags"
							:key="entryTag"
							:to="`/tag/${encodeURIComponent(entryTag)}`"
							>#{{ entryTag }}</router-link
						>
					</p>
				</li>
			</ul>
			<slot name="empty" v-else></slot>
			<slot name="more"></slot>
		</div>
	</div>
</template>
