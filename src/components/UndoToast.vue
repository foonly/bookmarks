<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { pendingDelete, undoDelete } from "../ui";

const { t } = useI18n();
</script>

<template>
	<transition name="toast">
		<div v-if="pendingDelete.bookmark" class="toast" role="status">
			<span class="toastText">{{
				t("bookmarks.deleted", {
					title: pendingDelete.bookmark.title || pendingDelete.bookmark.url,
				})
			}}</span>
			<button type="button" @click="undoDelete">{{ t("bookmarks.undo") }}</button>
		</div>
	</transition>
</template>
