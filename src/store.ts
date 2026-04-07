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
}

export function saveStore() {
	window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
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
	return store.bookmarks.find((bookmark) => bookmark.created === id);
}

/**
 * Removes a bookmark from the store by its creation timestamp.
 *
 * @param {number} id The creation timestamp (id) of the bookmark to remove.
 * @returns {void}
 */
export function removeBookmark(id: number): void {
	const index = store.bookmarks.findIndex(
		(bookmark) => bookmark.created === id,
	);
	if (index !== -1) {
		store.bookmarks.splice(index, 1);
	}
	saveStore();
}

export function getTags(): Array<string> {
	const tags = [...store.favoriteTags];
	store.bookmarks.forEach((bookmark) => {
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
