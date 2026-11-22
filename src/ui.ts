import { reactive } from "vue";
import type { Bookmark } from "./types";

/** The search field lives in the header, the results in the bookmark list. */
export const ui = reactive({
	query: "",
	/** Index of the search result that Enter opens. */
	selected: 0,
});

/** How long a deleted bookmark can be brought back. */
export const UNDO_MS = 6000;

/**
 * A deleted bookmark waiting out the undo time. It is hidden from the list
 * but not yet removed from the store, because a removal is synced and final:
 * once another device has seen it, it cannot be taken back.
 */
export const pendingDelete = reactive<{ bookmark: Bookmark | null }>({
	bookmark: null,
});

let timer: ReturnType<typeof setTimeout> | undefined;
let remove: ((id: number) => void) | undefined;

/** Hides the bookmark now and removes it with `removeBookmark` after UNDO_MS. */
export function deleteWithUndo(bookmark: Bookmark, removeBookmark: (id: number) => void) {
	commitPendingDelete();
	pendingDelete.bookmark = bookmark;
	remove = removeBookmark;
	timer = setTimeout(commitPendingDelete, UNDO_MS);
}

/** Brings back the bookmark waiting to be deleted. */
export function undoDelete() {
	clearTimeout(timer);
	pendingDelete.bookmark = null;
	remove = undefined;
}

/** Removes the waiting bookmark now, e.g. when the page is being closed. */
export function commitPendingDelete() {
	clearTimeout(timer);
	const bookmark = pendingDelete.bookmark;
	pendingDelete.bookmark = null;
	if (bookmark && remove) remove(bookmark.created);
	remove = undefined;
}

/**
 * How many bookmarks to leave out of a count while one waits to be deleted:
 * 1 when the waiting bookmark is counted (it has `tag`, or no tag is given).
 */
export function pendingCount(tag?: string): number {
	const bookmark = pendingDelete.bookmark;
	if (!bookmark) return 0;
	return tag === undefined || bookmark.tags.includes(tag) ? 1 : 0;
}
