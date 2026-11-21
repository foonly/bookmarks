<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from "vue";
import { useRouter } from "vue-router";
import { closeModalRoute } from "../utils/navigation";

interface Props {
	show?: boolean;
}

const props = defineProps<Props>();
const emit = defineEmits(["close"]);
const router = useRouter();
const dialogRef = ref<HTMLDialogElement | null>(null);

function handleClose() {
	emit("close");
	// If the modal was opened via a route, go back
	if (props.show) {
		closeModalRoute(router);
	}
}

function handleBackdropClick(event: MouseEvent) {
	if (event.target === dialogRef.value) {
		handleClose();
	}
}

watch(
	() => props.show,
	(newVal) => {
		if (newVal) {
			dialogRef.value?.showModal();
		} else {
			dialogRef.value?.close();
		}
	},
);

onMounted(() => {
	// Add escape key listener if needed (though <dialog> handles it by default)
	dialogRef.value?.addEventListener("close", handleClose);
	// The watcher only sees changes, and the dialog element does not exist
	// before mount, so open it here when the page loads onto a modal route.
	if (props.show) {
		dialogRef.value?.showModal();
	}
});

onUnmounted(() => {
	dialogRef.value?.removeEventListener("close", handleClose);
});
</script>

<template>
	<dialog
		ref="dialogRef"
		id="modalDialog"
		@click="handleBackdropClick"
		@cancel.prevent="handleClose"
	>
		<slot></slot>
	</dialog>
</template>

<style scoped>
/* Basic styles are inherited from global style.css #modalDialog */
#modalDialog {
	display: block;
	pointer-events: none;
	opacity: 0;
	transition: opacity 0.2s ease;
	margin: auto;
}

#modalDialog[open] {
	pointer-events: auto;
	opacity: 1;
}

/* Ensure the backdrop is styled as expected */
#modalDialog::backdrop {
	background-color: var(--bm-modal-backdrop);
	backdrop-filter: blur(5px);
}
</style>
