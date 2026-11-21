import { vi } from "vitest";
import type { Bookmark } from "../types";

/** A valid bookmark with the given creation time as its ID. */
export function bookmark(created: number, overrides: Partial<Bookmark> = {}): Bookmark {
	return {
		title: `bookmark ${created}`,
		url: `https://example.com/${created}`,
		description: "",
		tags: [],
		created,
		modified: created,
		deleted: false,
		clicks: 0,
		...overrides,
	};
}

/**
 * Loads fresh copies of the app modules. The sync client keeps the measured
 * clock offset in module state, so each test that syncs starts from a clean
 * module graph, like a freshly loaded page.
 */
export async function loadApp() {
	vi.resetModules();
	const { createPinia } = await import("pinia");
	const { useBookmarkStore } = await import("../stores/bookmarkStore");
	const { syncStatus } = await import("../syncStatus");
	const syncClient = await import("../syncClient");

	/** A separate device (its own Pinia store) with sync enabled. */
	function device(credentials: string, bookmarks: Bookmark[] = []) {
		const store = useBookmarkStore(createPinia());
		store.syncSettings = { enabled: true, credentials, lastSynced: 0 };
		store.bookmarks.push(...bookmarks);
		return store;
	}

	return { device, syncStatus, syncClient };
}

/** Moves the device clock (Date.now) by the given number of seconds. */
export function skewClock(seconds: number) {
	const realNow = Date.now.bind(Date);
	vi.spyOn(Date, "now").mockImplementation(() => realNow() + seconds * 1000);
}

/** Order-independent snapshot of a device's bookmarks, for comparing devices. */
export function snapshot(store: { bookmarks: Bookmark[] }) {
	return [...store.bookmarks]
		.sort((a, b) => a.created - b.created)
		.map(({ created, title, clicks, deleted }) => ({ created, title, clicks, deleted }));
}
