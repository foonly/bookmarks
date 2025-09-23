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

export function addBookmark(bookmark: Bookmark) {
  store = { ...store, bookmarks: [...store.bookmarks, bookmark] };
  saveStore();
}
