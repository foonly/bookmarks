<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import { closeModalRoute } from "../utils/navigation";
import { useBookmarkStore } from "../stores/bookmarkStore";
import { bookmarkSchema } from "../types";
import { findByUrl, prefillFromQuery } from "../utils/prefill";

interface Props {
	id?: number;
	initialTags?: string[];
}

const props = defineProps<Props>();
const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const store = useBookmarkStore();

const form = ref({
	title: "",
	url: "",
	description: "",
	tags: [] as string[],
});

const newTag = ref("");
const urlInput = ref<HTMLInputElement | null>(null);
const tagInput = ref<HTMLInputElement | null>(null);

/**
 * The bookmark being edited: the one in the route, or an existing bookmark
 * for the address passed in from the browser extension.
 */
const editId = ref(props.id && props.id > 0 ? props.id : 0);
const isEdit = computed(() => editId.value > 0);
/** The address passed in was already saved, so that bookmark is shown. */
const alreadySaved = ref(false);

const availableTags = computed(() =>
	store.sortedTags.filter((tag) => !form.value.tags.includes(tag)),
);

const suggestedTags = computed(() =>
	store.suggestedTags.filter((tag) => !form.value.tags.includes(tag)),
);

function loadBookmark(id: number) {
	const bookmark = store.getBookmarkById(id);
	if (bookmark) {
		form.value = {
			title: bookmark.title,
			url: bookmark.url,
			description: bookmark.description,
			tags: [...bookmark.tags],
		};
	}
}

onMounted(() => {
	if (isEdit.value) {
		loadBookmark(editId.value);
		return;
	}
	const prefill = prefillFromQuery(route.query);
	const existing = prefill.url ? findByUrl(store.activeBookmarks, prefill.url) : undefined;
	if (existing) {
		editId.value = existing.created;
		alreadySaved.value = true;
		loadBookmark(existing.created);
		focusAfterOpen(tagInput);
		return;
	}
	form.value.tags = [...new Set([...(props.initialTags ?? []), ...prefill.tags])];
	form.value.url = prefill.url;
	form.value.title = prefill.title;
	form.value.description = prefill.description;
	// With the address filled in, tags are usually what is left to add.
	focusAfterOpen(prefill.url ? tagInput : urlInput);
});

/**
 * The dialog moves focus to its first field when it opens, which happens
 * after this component mounts, so focus is set once that is done.
 */
function focusAfterOpen(input: typeof urlInput) {
	nextTick(() => input.value?.focus());
}

function addTag(value = newTag.value) {
	const tag = value.trim().replace(/,$/, "").trim();
	if (tag && !form.value.tags.includes(tag)) {
		form.value.tags.push(tag);
	}
	newTag.value = "";
}

function removeTag(tag: string) {
	form.value.tags = form.value.tags.filter((t) => t !== tag);
}

function handleTagKeydown(event: KeyboardEvent) {
	if (event.isComposing) return;
	if (event.key === "Enter" || event.key === ",") {
		event.preventDefault();
		addTag();
	} else if (event.key === "Backspace" && newTag.value === "" && form.value.tags.length) {
		form.value.tags.pop();
	}
}

function handleTagInput(event: Event) {
	// Picking from the datalist fires 'input' without a keydown.
	if (event instanceof InputEvent && event.inputType === "insertReplacementText") {
		addTag();
	} else if (newTag.value.endsWith(",")) {
		// Phone keyboards do not always send a keydown for the comma.
		addTag();
	}
}

function handleSubmit() {
	// A tag typed but not yet added would otherwise be lost.
	addTag();
	const existing = isEdit.value ? store.getBookmarkById(editId.value) : undefined;
	if (isEdit.value && !existing) {
		closeModalRoute(router);
		return;
	}

	// Validate edits as well as new bookmarks, so a disallowed URL scheme
	// cannot be saved either way.
	const result = bookmarkSchema.safeParse(
		existing ? { ...existing, ...form.value } : { ...form.value, created: Date.now() },
	);
	if (!result.success) {
		console.warn("Invalid bookmark", result.error.issues);
		return;
	}
	store.updateBookmark(result.data);
	closeModalRoute(router);
}

function handleCancel() {
	closeModalRoute(router);
}
</script>

<template>
	<form class="bookmarkForm" @submit.prevent="handleSubmit" @reset.prevent="handleCancel">
		<h2 class="formTitle">{{ isEdit ? t("form.edit_bookmark") : t("form.add_bookmark") }}</h2>
		<p v-if="alreadySaved" class="formNotice" role="status">{{ t("form.already_saved") }}</p>

		<div class="formField">
			<label for="url">{{ t("form.url") }}</label>
			<input
				id="url"
				ref="urlInput"
				v-model="form.url"
				type="url"
				required
				pattern="[Hh][Tt][Tt][Pp][Ss]?://.+"
				placeholder="https://"
				autocomplete="off"
			/>
		</div>

		<div class="formField">
			<label for="title">{{ t("form.title") }}</label>
			<input id="title" v-model="form.title" type="text" autocomplete="off" />
		</div>

		<div class="formField">
			<label for="tags">{{ t("form.tags") }}</label>
			<div class="tagInput" @click.self="tagInput?.focus()">
				<span v-for="tag in form.tags" :key="tag" class="tagPill">
					{{ tag }}
					<button
						type="button"
						:title="t('form.remove_tag_title', { tag })"
						:aria-label="t('form.remove_tag_title', { tag })"
						@click="removeTag(tag)"
					>
						&times;
					</button>
				</span>
				<input
					id="tags"
					ref="tagInput"
					v-model="newTag"
					type="text"
					:placeholder="form.tags.length ? '' : t('form.add_tag_placeholder')"
					list="availableTagsList"
					autocomplete="off"
					enterkeyhint="enter"
					@keydown="handleTagKeydown"
					@input="handleTagInput"
				/>
			</div>
			<datalist id="availableTagsList">
				<option v-for="tag in availableTags" :key="tag" :value="tag" />
			</datalist>
			<div v-if="suggestedTags.length > 0" class="suggestedTags">
				<span>{{ t("form.suggested_tags_label") }}</span>
				<button
					v-for="tag in suggestedTags"
					:key="tag"
					type="button"
					class="suggestedTag"
					@click="addTag(tag)"
				>
					+ {{ tag }}
				</button>
			</div>
		</div>

		<div class="formField">
			<label for="description">{{ t("form.description") }}</label>
			<textarea id="description" v-model="form.description"></textarea>
		</div>

		<div class="buttonBar">
			<button type="reset" class="button">{{ t("form.cancel") }}</button>
			<button type="submit" class="button primaryButton">
				{{ isEdit ? t("form.save") : t("form.add_bookmark") }}
			</button>
		</div>
	</form>
</template>
