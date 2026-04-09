<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import { useBookmarkStore } from "../stores/bookmarkStore";
import { bookmarkSchema } from "../types";

interface Props {
	id?: number;
	initialTags?: string[];
}

const props = defineProps<Props>();
const { t } = useI18n();
const router = useRouter();
const store = useBookmarkStore();

const form = ref({
	title: "",
	url: "",
	description: "",
	tags: [] as string[],
});

const newTag = ref("");

const isEdit = computed(() => props.id && props.id > 0);

const availableTags = computed(() => {
	return store.sortedTags.filter((tag) => !form.value.tags.includes(tag));
});

onMounted(() => {
	if (isEdit.value) {
		const bookmark = store.getBookmarkById(props.id!);
		if (bookmark) {
			form.value = {
				title: bookmark.title,
				url: bookmark.url,
				description: bookmark.description,
				tags: [...bookmark.tags],
			};
		}
	} else if (props.initialTags) {
		form.value.tags = [...props.initialTags];
	}
});

function addTag() {
	const tag = newTag.value.trim();
	if (tag && !form.value.tags.includes(tag)) {
		form.value.tags.push(tag);
	}
	newTag.value = "";
}

function removeTag(tag: string) {
	form.value.tags = form.value.tags.filter((t) => t !== tag);
}

function handleInputTag(event: Event) {
	// Support datalist selection which might trigger 'input' but not 'keydown'
	if (
		event instanceof InputEvent &&
		event.inputType === "insertReplacementText"
	) {
		addTag();
	}
}

function handleSubmit() {
	if (isEdit.value) {
		const bookmark = store.getBookmarkById(props.id!);
		if (bookmark) {
			store.updateBookmark({
				...bookmark,
				...form.value,
			});
		}
	} else {
		const newBookmark = bookmarkSchema.parse({
			...form.value,
			created: Date.now(),
		});
		store.updateBookmark(newBookmark);
	}
	router.back();
}

function handleCancel() {
	router.back();
}
</script>

<template>
	<form @submit.prevent="handleSubmit" @reset.prevent="handleCancel">
		<!-- Title -->
		<div class="formField">
			<label for="title">{{ t("form.title") }}</label>
			<input type="text" id="title" v-model="form.title" autocomplete="off" />
		</div>

		<!-- URL -->
		<div class="formField">
			<label for="url">{{ t("form.url") }}</label>
			<input
				type="url"
				id="url"
				v-model="form.url"
				required
				autocomplete="off"
			/>
		</div>

		<!-- Tags -->
		<div class="formField formFieldTags">
			<label for="tags">{{ t("form.tags") }}</label>
			<div class="tagInputGroup">
				<input
					type="text"
					id="tags"
					v-model="newTag"
					:placeholder="t('form.add_tag_placeholder')"
					list="availableTagsList"
					@keydown.enter.prevent="addTag"
					@input="handleInputTag"
				/>
				<datalist id="availableTagsList">
					<option v-for="tag in availableTags" :key="tag" :value="tag" />
				</datalist>
				<button type="button" class="addTagButton" @click="addTag">
					{{ t("form.add_tag_button") }}
				</button>
			</div>

			<div class="addedTagsSection">
				<div class="tagSectionLabel">{{ t("form.added_tags_label") }}</div>
				<div class="tagContainer">
					<template v-if="form.tags.length > 0">
						<div v-for="tag in form.tags" :key="tag" class="tagBadge">
							{{ tag }}
							<span
								class="removeTagBtn"
								:title="t('form.remove_tag_title', { tag })"
								@click="removeTag(tag)"
								>&times;</span
							>
						</div>
					</template>
					<span v-else class="emptyTagsMsg">{{ t("form.no_tags") }}</span>
				</div>
			</div>
		</div>

		<!-- Description -->
		<div class="formField">
			<label for="description">{{ t("form.description") }}</label>
			<textarea id="description" v-model="form.description"></textarea>
		</div>

		<!-- Buttons -->
		<div class="buttonBar">
			<button type="submit">{{ t("form.save") }}</button>
			<button type="reset">{{ t("form.cancel") }}</button>
		</div>
	</form>
</template>

<style scoped>
/* Basic styles are inherited from global style.css */
</style>
