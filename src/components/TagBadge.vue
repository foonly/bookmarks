<script setup lang="ts">
interface Props {
	tag: string;
}

defineProps<Props>();
</script>

<template>
	<router-link :to="`/tag/${encodeURIComponent(tag)}`" class="tagBadge">
		{{ tag }}
	</router-link>
</template>

<style scoped>
/* Styles are inherited from global style.css */
</style>
