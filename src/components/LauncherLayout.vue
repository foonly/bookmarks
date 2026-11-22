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
	/** The sites shown as tiles; empty while searching or filtering. */
	mostUsed: Bookmark[];
	tag?: string;
	searching: boolean;
	selected: number;
}

defineProps<Props>();
const emit = defineEmits<{ open: [bookmark: Bookmark] }>();
const { t } = useI18n();
const store = useBookmarkStore();

const allCount = computed(() => store.activeBookmarks.length - pendingCount());
</script>

<template>
	<div class="launcher">
		<section v-if="mostUsed.length > 0" :aria-label="t('bookmarks.most_used')">
			<h2 class="sectionLabel">{{ t("bookmarks.most_used") }}</h2>
			<div class="tiles">
				<a
					v-for="bookmark in mostUsed"
					:key="bookmark.created"
					:href="bookmark.url"
					target="_blank"
					rel="noopener noreferrer"
					class="tile"
					:title="bookmark.url"
					@click="emit('open', bookmark)"
				>
					<BookmarkIcon :url="bookmark.url" :size="32" />
					<span class="tileText">
						<span class="tileTitle">{{ bookmark.title || domainOf(bookmark.url) }}</span>
						<span class="tileDomain">{{ domainOf(bookmark.url) }}</span>
					</span>
				</a>
			</div>
		</section>

		<nav class="chips" :aria-label="t('bookmarks.tags_label')">
			<router-link to="/" class="chip" :class="{ active: !tag }" :aria-current="!tag ? 'page' : undefined">
				{{ t("bookmarks.filter_all") }} <span class="count">{{ allCount }}</span>
			</router-link>
			<router-link
				v-for="entry in store.tagList"
				:key="entry.tag"
				:to="`/tag/${encodeURIComponent(entry.tag)}`"
				class="chip"
				:class="{ active: tag === entry.tag, starred: entry.favorite }"
				:aria-current="tag === entry.tag ? 'page' : undefined"
			>
				{{ entry.tag }} <span class="count">{{ entry.count - pendingCount(entry.tag) }}</span>
			</router-link>
		</nav>

		<section>
			<div class="listHeading">
				<h2 class="sectionLabel">
					<template v-if="searching">{{ t("bookmarks.matches", total) }}</template>
					<template v-else-if="tag">{{ tag }}</template>
					<template v-else>{{ t("bookmarks.all") }}</template>
				</h2>
				<FavoriteToggle v-if="tag && !searching" :tag="tag" />
				<span v-if="searching && total > 0" class="keyboardHint">{{ t("bookmarks.keyboard_hint") }}</span>
			</div>

			<ul v-if="bookmarks.length > 0" class="rows">
				<li
					v-for="(bookmark, index) in bookmarks"
					:key="bookmark.created"
					class="row"
					:class="{ selected: searching && index === selected }"
				>
					<BookmarkIcon :url="bookmark.url" />
					<a
						:href="bookmark.url"
						target="_blank"
						rel="noopener noreferrer"
						class="rowLink"
						:title="bookmark.description || bookmark.url"
						@click="emit('open', bookmark)"
					>
						<span class="rowTitle">{{ bookmark.title || bookmark.url }}</span>
						<span class="rowDomain">{{ domainOf(bookmark.url) }}</span>
					</a>
					<span class="rowTags">
						<router-link
							v-for="rowTag in bookmark.tags"
							:key="rowTag"
							:to="`/tag/${encodeURIComponent(rowTag)}`"
							>#{{ rowTag }}</router-link
						>
					</span>
					<span v-if="searching && index === selected" class="enterHint" aria-hidden="true">↵</span>
					<BookmarkActions :bookmark="bookmark" :filter-tag="tag" />
				</li>
			</ul>
			<slot name="empty" v-else></slot>
			<slot name="more"></slot>
		</section>
	</div>
</template>
