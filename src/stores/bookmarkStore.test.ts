import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useBookmarkStore } from "./bookmarkStore";
import { storageSchema } from "../types";
import type { Storage } from "../types";
import { STORAGE_KEY } from "../constants";
import { bookmark } from "../test/helpers";

const DAY_MS = 24 * 60 * 60 * 1000;

/** A remote store as it arrives from another device. */
function remote(data: Partial<Storage>): Storage {
	return storageSchema.parse(data);
}

beforeEach(() => {
	setActivePinia(createPinia());
});

describe("mergeStores: bookmarks", () => {
	it("adds bookmarks that only exist remotely", () => {
		const store = useBookmarkStore();
		store.bookmarks.push(bookmark(1));
		expect(store.mergeStores(remote({ bookmarks: [bookmark(2)] }))).toBe(true);
		expect(store.bookmarks.map((b) => b.created).sort()).toEqual([1, 2]);
	});

	it("takes the remote copy when it was edited more recently", () => {
		const store = useBookmarkStore();
		store.bookmarks.push(bookmark(1, { title: "old", modified: 10 }));
		store.mergeStores(remote({ bookmarks: [bookmark(1, { title: "new", modified: 20 })] }));
		expect(store.bookmarks[0].title).toBe("new");
	});

	it("keeps the local copy when it was edited more recently", () => {
		const store = useBookmarkStore();
		store.bookmarks.push(bookmark(1, { title: "local", modified: 20 }));
		expect(
			store.mergeStores(remote({ bookmarks: [bookmark(1, { title: "remote", modified: 10 })] })),
		).toBe(false);
		expect(store.bookmarks[0].title).toBe("local");
	});

	it("takes the higher click count whichever copy's content wins", () => {
		const store = useBookmarkStore();
		store.bookmarks.push(bookmark(1, { title: "stale", modified: 10, clicks: 9 }));
		store.mergeStores(
			remote({ bookmarks: [bookmark(1, { title: "edited", modified: 20, clicks: 4 })] }),
		);
		expect(store.bookmarks[0]).toMatchObject({ title: "edited", clicks: 9 });
	});

	it("reports no changes when both sides are the same", () => {
		const store = useBookmarkStore();
		store.bookmarks.push(bookmark(1), bookmark(2));
		expect(store.mergeStores(remote({ bookmarks: [bookmark(2), bookmark(1)] }))).toBe(false);
	});
});

describe("incrementClick", () => {
	it("counts the click without touching modified", () => {
		// modified decides whose copy wins a merge, so a click on a stale copy
		// must not beat an edit made on another device.
		const store = useBookmarkStore();
		store.bookmarks.push(bookmark(1, { modified: 10, clicks: 2 }));
		store.incrementClick(1);
		expect(store.bookmarks[0]).toMatchObject({ modified: 10, clicks: 3 });
	});
});

describe("mergeStores: favorite tags", () => {
	it("follows the side that changed the tag most recently", () => {
		const store = useBookmarkStore();
		store.favoriteTags = ["a", "b"];
		store.favoriteTagsMetadata = { a: 10, b: 30 };
		// Remote unfavorited "a" later, and has an older view of "b".
		store.mergeStores(remote({ favoriteTags: [], favoriteTagsMetadata: { a: 20, b: 5 } }));
		expect(store.favoriteTags).toEqual(["b"]);
		expect(store.favoriteTagsMetadata).toEqual({ a: 20, b: 30 });
	});

	it("keeps a tag without a timestamp on either side if either side has it", () => {
		// Favorited before timestamps were recorded: without this, the device
		// lacking the tag never picks it up and both re-upload forever.
		const store = useBookmarkStore();
		expect(store.mergeStores(remote({ favoriteTags: ["legacy"] }))).toBe(true);
		expect(store.favoriteTags).toEqual(["legacy"]);
	});
});

describe("mergeStores: failed favicons", () => {
	it("keeps the union of both sides", () => {
		const store = useBookmarkStore();
		store.failedFavicons = ["b.example", "a.example"];
		store.mergeStores(remote({ failedFavicons: ["c.example", "a.example"] }));
		expect(store.failedFavicons).toEqual(["a.example", "b.example", "c.example"]);
	});
});

describe("purgeDeleted", () => {
	it("removes deleted bookmarks after 30 days, or all of them when forced", () => {
		const store = useBookmarkStore();
		const now = Date.now();
		store.bookmarks.push(
			bookmark(1),
			bookmark(2, { deleted: true, modified: now - 31 * DAY_MS }),
			bookmark(3, { deleted: true, modified: now - 1 * DAY_MS }),
		);
		store.purgeDeleted();
		expect(store.bookmarks.map((b) => b.created)).toEqual([1, 3]);
		store.purgeDeleted(true);
		expect(store.bookmarks.map((b) => b.created)).toEqual([1]);
	});
});

describe("loadStore", () => {
	it("loads valid bookmarks and drops invalid ones", () => {
		vi.spyOn(console, "log").mockImplementation(() => {});
		vi.spyOn(console, "warn").mockImplementation(() => {});
		localStorage.setItem(
			STORAGE_KEY,
			JSON.stringify({
				bookmarks: [bookmark(1), { ...bookmark(2), url: "javascript:alert(1)" }],
			}),
		);
		const store = useBookmarkStore();
		store.loadStore();
		expect(store.bookmarks.map((b) => b.created)).toEqual([1]);
	});

	it("backs up storage it cannot read before anything overwrites it", () => {
		vi.spyOn(console, "log").mockImplementation(() => {});
		vi.spyOn(console, "error").mockImplementation(() => {});
		localStorage.setItem(STORAGE_KEY, "{not json");
		const store = useBookmarkStore();
		store.loadStore();
		store.updateBookmark(bookmark(1)); // saves, overwriting STORAGE_KEY

		const backupKey = Array.from({ length: localStorage.length }, (_, i) =>
			localStorage.key(i),
		).find((key) => key?.startsWith(`${STORAGE_KEY}-unreadable-`));
		expect(backupKey).toBeDefined();
		expect(localStorage.getItem(backupKey!)).toBe("{not json");
	});
});
