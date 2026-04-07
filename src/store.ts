import { STORAGE_KEY } from "./constants";
import { storageSchema } from "./types";
import type { Bookmark, Storage } from "./types";

export let store = storageSchema.parse({});

export function loadStore() {
	console.log("Loading storage...");
	const dataRaw = window.localStorage.getItem(STORAGE_KEY);
	if (dataRaw) {
		try {
			store = storageSchema.parse(JSON.parse(dataRaw));
		} catch (error) {
			console.error("Error parsing storage:", error);
		}
	}
	purgeDeletedBookmarks();
}

// Listen for changes from other tabs
window.addEventListener("storage", (event) => {
	if (event.key === STORAGE_KEY) {
		loadStore();
		window.dispatchEvent(new Event("store-updated"));
	}
});

export function saveStore() {
	window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
	window.dispatchEvent(new Event("store-updated"));
}

export function updateStore(newObject: object) {
	store = { ...store, ...newObject };
	saveStore();
}

/**
 * Updates the 'bookmarks' array in the store by replacing an existing bookmark.
 * The bookmark to replace is identified by its 'created' timestamp.
 * If the bookmark is not found, it is added to the store.
 *
 * @param {Bookmark} updatedBookmark The updated bookmark object.
 * @returns {void}
 */
export function updateBookmark(updatedBookmark: Bookmark): void {
	updatedBookmark.modified = Date.now();
	const index = store.bookmarks.findIndex(
		(bookmark) => bookmark.created === updatedBookmark.created,
	);

	if (index !== -1) {
		store.bookmarks[index] = updatedBookmark;
	} else {
		store.bookmarks.push(updatedBookmark);
	}
	saveStore();
}

/**
 * Retrieves a bookmark from the store by its creation timestamp.
 *
 * @param {number} id The creation timestamp (id) of the bookmark to retrieve.
 * @returns {Bookmark | undefined} The bookmark with the matching id, or undefined if not found.
 */
export function getBookmark(id: number): Bookmark | undefined {
	return store.bookmarks.find(
		(bookmark) => bookmark.created === id && !bookmark.deleted,
	);
}

/**
 * Removes a bookmark from the store by its creation timestamp.
 * Marks it as deleted and updates the modified timestamp for syncing.
 *
 * @param {number} id The creation timestamp (id) of the bookmark to remove.
 * @returns {void}
 */
export function removeBookmark(id: number): void {
	const bookmark = store.bookmarks.find((b) => b.created === id);
	if (bookmark) {
		bookmark.deleted = true;
		bookmark.modified = Date.now();
		saveStore();
	}
}

export function getTags(): Array<string> {
	const tags = [...store.favoriteTags];
	store.bookmarks.forEach((bookmark) => {
		if (bookmark.deleted) return;
		bookmark.tags.forEach((tag) => {
			if (!tags.includes(tag)) {
				tags.push(tag);
			}
		});
	});

	return tags.sort();
}

export function getTagsWithCounts(): Record<string, number> {
	const counts: Record<string, number> = {};
	store.bookmarks.forEach((bookmark) => {
		if (bookmark.deleted) return;
		bookmark.tags.forEach((tag) => {
			counts[tag] = (counts[tag] || 0) + 1;
		});
	});
	return counts;
}

/**
 * Merges a remote storage object into the local store.
 * Uses 'created' as ID and 'modified' as version check.
 */
export function mergeStores(remoteStore: Storage): boolean {
	let hasChanges = false;

	// 1. Merge favorite tags (union)
	const mergedFavoriteTags = [
		...new Set([...store.favoriteTags, ...remoteStore.favoriteTags]),
	];
	if (
		JSON.stringify(mergedFavoriteTags.sort()) !==
		JSON.stringify([...store.favoriteTags].sort())
	) {
		store.favoriteTags = mergedFavoriteTags.sort();
		hasChanges = true;
	}

	// 2. Merge bookmarks
	const localBookmarks = [...store.bookmarks];
	const remoteBookmarks = remoteStore.bookmarks;

	remoteBookmarks.forEach((remote) => {
		const localIndex = localBookmarks.findIndex(
			(l) => l.created === remote.created,
		);

		if (localIndex === -1) {
			// New bookmark from remote
			localBookmarks.push(remote);
			hasChanges = true;
		} else {
			const local = localBookmarks[localIndex];
			// Conflict resolution: Newer modified timestamp wins
			if (remote.modified > (local.modified || 0)) {
				localBookmarks[localIndex] = remote;
				hasChanges = true;
			}
		}
	});

	if (hasChanges) {
		store.bookmarks = localBookmarks;
		saveStore();
	}

	return hasChanges;
}

/**
 * Permanently removes bookmarks marked as deleted.
 * By default, only removes those older than 30 days to allow sync propagation.
 * Set forceAll to true to remove all deleted bookmarks immediately.
 */
export function purgeDeletedBookmarks(forceAll: boolean = false): void {
	const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
	const now = Date.now();
	const initialCount = store.bookmarks.length;

	store.bookmarks = store.bookmarks.filter((bookmark) => {
		if (!bookmark.deleted) return true;
		if (forceAll === true) return false;
		// Keep tombstones if they were modified recently (to allow sync propagation)
		return now - bookmark.modified < THIRTY_DAYS_MS;
	});

	if (store.bookmarks.length !== initialCount) {
		saveStore();
	}
}
