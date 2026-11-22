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

describe("favicon failures", () => {
	const url = "https://example.com/page";

	it("show the placeholder for 30 days, then try the icon again", () => {
		const store = useBookmarkStore();
		const now = Date.now();
		store.markFaviconFailed(url);
		expect(store.isFaviconFailed(url)).toBe(true);
		expect(store.failedFaviconCount).toBe(1);

		vi.spyOn(Date, "now").mockReturnValue(now + 29 * DAY_MS);
		expect(store.isFaviconFailed(url)).toBe(true);
		vi.spyOn(Date, "now").mockReturnValue(now + 31 * DAY_MS);
		expect(store.isFaviconFailed(url)).toBe(false);
		store.pruneFaviconFailures(); // runs on every load
		expect(store.failedFaviconCount).toBe(0);
	});

	it("can all be retried at once", () => {
		const store = useBookmarkStore();
		store.markFaviconFailed(url);
		store.markFaviconFailed("https://other.example");
		store.retryFavicons();
		expect(store.isFaviconFailed(url)).toBe(false);
		expect(store.failedFaviconCount).toBe(0);
	});

	it("are not merged from other devices, nor are the old synced list's entries", () => {
		const store = useBookmarkStore();
		const fromOtherDevice = remote({
			failedFavicons: ["example.com"],
			faviconFailures: { "example.com": Date.now() },
		} as Partial<Storage>);
		expect(store.mergeStores(fromOtherDevice)).toBe(false);
		expect(store.isFaviconFailed(url)).toBe(false);
	});

	it("drop the old synced list and expired failures when loading", () => {
		vi.spyOn(console, "log").mockImplementation(() => {});
		const now = Date.now();
		localStorage.setItem(
			STORAGE_KEY,
			JSON.stringify({
				failedFavicons: ["legacy.example"],
				faviconFailures: { "old.example": now - 31 * DAY_MS, "new.example": now - DAY_MS },
			}),
		);
		const store = useBookmarkStore();
		store.loadStore();
		expect(store.faviconFailures).toEqual({ "new.example": now - DAY_MS });
		expect("failedFavicons" in store.$state).toBe(false);
	});
});

describe("importData", () => {
	it("gives bookmarks without IDs their own IDs instead of merging them", () => {
		const store = useBookmarkStore();
		const imported = remote({
			bookmarks: [
				{ url: "https://a.example" },
				{ url: "https://b.example" },
				{ url: "https://c.example" },
			] as Storage["bookmarks"],
		});
		expect(store.importData(imported)).toBe(true);
		expect(store.bookmarks.map((b) => b.url).sort()).toEqual([
			"https://a.example",
			"https://b.example",
			"https://c.example",
		]);
		expect(new Set(store.bookmarks.map((b) => b.created)).size).toBe(3);
		expect(store.bookmarks.every((b) => b.created > 0 && b.modified > 0)).toBe(true);
	});

	it("does not add ID-less bookmarks again when the same file is imported twice", () => {
		const store = useBookmarkStore();
		const file = () =>
			remote({ bookmarks: [{ url: "https://a.example" }] as Storage["bookmarks"] });
		store.importData(file());
		expect(store.importData(file())).toBe(false);
		expect(store.bookmarks).toHaveLength(1);
	});

	it("restores bookmarks deleted since the backup, under new IDs", () => {
		const store = useBookmarkStore();
		store.bookmarks.push(bookmark(1));
		store.removeBookmark(1);
		expect(store.importData(remote({ bookmarks: [bookmark(1, { title: "restored" })] }))).toBe(
			true,
		);
		expect(store.bookmarks).toHaveLength(1);
		expect(store.bookmarks[0]).toMatchObject({ title: "restored" });
		expect(store.bookmarks[0].created).not.toBe(1);
		expect(store.deletedIds).toEqual([1]);
	});

	it("does not apply deletions recorded in the backup", () => {
		const store = useBookmarkStore();
		store.bookmarks.push(bookmark(1));
		store.importData(remote({ bookmarks: [bookmark(1, { deleted: true, modified: Date.now() })] }));
		expect(store.bookmarks.map((b) => b.created)).toEqual([1]);
		expect(store.deletedIds).toEqual([]);
	});

	it("merges bookmarks that have IDs as usual", () => {
		const store = useBookmarkStore();
		store.bookmarks.push(bookmark(1, { title: "old", modified: 10 }));
		store.importData(remote({ bookmarks: [bookmark(1, { title: "new", modified: 20 })] }));
		expect(store.bookmarks).toHaveLength(1);
		expect(store.bookmarks[0].title).toBe("new");
	});
});

describe("deleting", () => {
	it("removes the bookmark and keeps only its ID", () => {
		const store = useBookmarkStore();
		store.bookmarks.push(bookmark(1), bookmark(2, { title: "private" }));
		store.removeBookmark(2);
		expect(store.bookmarks.map((b) => b.created)).toEqual([1]);
		expect(store.deletedIds).toEqual([2]);
		expect(localStorage.getItem(STORAGE_KEY)).not.toContain("private");
	});

	it("applies deletions from another device", () => {
		const store = useBookmarkStore();
		store.bookmarks.push(bookmark(1), bookmark(2));
		expect(store.mergeStores(remote({ bookmarks: [bookmark(1)], deletedIds: [2] }))).toBe(true);
		expect(store.bookmarks.map((b) => b.created)).toEqual([1]);
		expect(store.deletedIds).toEqual([2]);
	});

	it("wins over an edit made later on another device", () => {
		// There is no undelete, so a deletion is final.
		const store = useBookmarkStore();
		store.removeBookmark(1);
		store.mergeStores(
			remote({ bookmarks: [bookmark(1, { title: "edited", modified: Date.now() + DAY_MS })] }),
		);
		expect(store.bookmarks).toEqual([]);
	});

	it("keeps the deleted IDs of both devices", () => {
		const store = useBookmarkStore();
		store.removeBookmark(1);
		store.mergeStores(remote({ deletedIds: [2, 3] }));
		expect([...store.deletedIds].sort()).toEqual([1, 2, 3]);
		expect(store.mergeStores(remote({ deletedIds: [3, 1] }))).toBe(false);
	});

	it("understands deletion markers from older versions", () => {
		const store = useBookmarkStore();
		store.bookmarks.push(bookmark(1), bookmark(2));
		store.mergeStores(remote({ bookmarks: [bookmark(2, { deleted: true, modified: 5 })] }));
		expect(store.bookmarks.map((b) => b.created)).toEqual([1]);
		expect(store.deletedIds).toEqual([2]);
	});

	it("converts stored deletion markers when loading", () => {
		vi.spyOn(console, "log").mockImplementation(() => {});
		localStorage.setItem(
			STORAGE_KEY,
			JSON.stringify({
				bookmarks: [bookmark(1), bookmark(2, { deleted: true, title: "private" })],
				deletedIds: [3],
			}),
		);
		const store = useBookmarkStore();
		store.loadStore();
		expect(store.bookmarks.map((b) => b.created)).toEqual([1]);
		expect([...store.deletedIds].sort()).toEqual([2, 3]);
		expect(localStorage.getItem(STORAGE_KEY)).not.toContain("private");
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

describe("tagList", () => {
	beforeEach(() => setActivePinia(createPinia()));

	it("lists starred tags first, then by bookmark count, then by name", () => {
		const store = useBookmarkStore();
		store.bookmarks.push(
			bookmark(1, { tags: ["dev", "news"] }),
			bookmark(2, { tags: ["dev", "cooking"] }),
			bookmark(3, { tags: ["dev", "news"] }),
			bookmark(4, { tags: ["art"] }),
		);
		store.favoriteTags = ["cooking", "unused"];
		expect(store.tagList).toEqual([
			{ tag: "cooking", count: 1, favorite: true },
			{ tag: "unused", count: 0, favorite: true },
			{ tag: "dev", count: 3, favorite: false },
			{ tag: "news", count: 2, favorite: false },
			{ tag: "art", count: 1, favorite: false },
		]);
	});
});

describe("setLayout", () => {
	beforeEach(() => {
		localStorage.clear();
		setActivePinia(createPinia());
	});

	it("is saved on this device", () => {
		const store = useBookmarkStore();
		store.setLayout("list");
		expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).layout).toBe("list");
	});
});

describe("loadFromOtherTab", () => {
	beforeEach(() => {
		localStorage.clear();
		setActivePinia(createPinia());
	});

	it("takes over the state another tab saved, including removals", () => {
		const store = useBookmarkStore();
		store.bookmarks.push(bookmark(1));
		store.faviconFailures = { "a.example": 1, "b.example": 2 };

		const other = storageSchema.parse({
			bookmarks: [bookmark(1), bookmark(2)],
			faviconFailures: { "a.example": 1 },
			layout: "list",
		});
		store.loadFromOtherTab(JSON.stringify(other));

		expect(store.bookmarks.map((b) => b.created)).toEqual([1, 2]);
		expect(store.faviconFailures).toEqual({ "a.example": 1 });
		expect(store.layout).toBe("list");
	});

	it("keeps its state when the saved data cannot be read", () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		const store = useBookmarkStore();
		store.bookmarks.push(bookmark(1));
		store.loadFromOtherTab("{not json");
		expect(store.bookmarks.map((b) => b.created)).toEqual([1]);
	});
});
