<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useBookmarkStore } from "../stores/bookmarkStore";
import { getIconUrl, iconFailedOnServer } from "../favicon";

interface Props {
	url: string;
	/** Edge length in pixels. */
	size?: number;
}

const props = withDefaults(defineProps<Props>(), { size: 20 });
const store = useBookmarkStore();
const failed = ref(false);

watch(
	() => props.url,
	() => (failed.value = false),
);

const domain = computed(() => {
	try {
		return new URL(props.url).hostname.replace(/^www\./, "");
	} catch {
		return props.url;
	}
});

const showImage = computed(
	() => store.fetchFavicons && !failed.value && !store.isFaviconFailed(props.url),
);

/** A steady colour per domain, so the same site always gets the same tile. */
const tileStyle = computed(() => {
	let hue = 0;
	for (const ch of domain.value) hue = (hue * 31 + ch.charCodeAt(0)) % 360;
	return {
		width: `${props.size}px`,
		height: `${props.size}px`,
		fontSize: `${Math.round(props.size * 0.5)}px`,
		backgroundColor: `hsl(${hue} 48% 42%)`,
	};
});

async function handleError(event: Event) {
	const src = (event.target as HTMLImageElement).src;
	failed.value = true;
	// The failure is kept for 30 days, so only record icons the server really
	// could not provide. After a network failure the icon is retried on the
	// next render.
	if (await iconFailedOnServer(src)) {
		store.markFaviconFailed(props.url);
	}
}
</script>

<template>
	<img
		v-if="showImage"
		:src="getIconUrl(url)"
		alt=""
		class="siteIcon"
		:width="size"
		:height="size"
		loading="lazy"
		@error="handleError"
	/>
	<span v-else class="siteIcon siteIconLetter" :style="tileStyle" aria-hidden="true">
		{{ domain.charAt(0).toUpperCase() }}
	</span>
</template>
