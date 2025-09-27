import { STORAGE_KEY } from "./constants";
import { storageSchema } from "./types";
import type { Bookmark } from "./types";

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
