import { describe, expect, it, vi } from "vitest";
import { bookmarkSchema, storageSchema } from "./types";
import { bookmark } from "./test/helpers";

describe("bookmarkSchema url", () => {
	it.each(["https://example.com", "http://localhost:3000/a?b#c", "HTTPS://EXAMPLE.COM"])(
		"accepts %s",
		(url) => {
			expect(bookmarkSchema.safeParse({ url }).success).toBe(true);
		},
	);

	it.each([
		"javascript:alert(document.cookie)",
		"data:text/html,<script>alert(1)</script>",
		"ftp://example.com/file",
		"/relative/path",
		"",
	])("rejects %s", (url) => {
		// These would run code or go nowhere when the bookmark is clicked.
		expect(bookmarkSchema.safeParse({ url }).success).toBe(false);
	});
});

describe("storageSchema", () => {
	it("fills in defaults for an empty store", () => {
		expect(storageSchema.parse({})).toEqual({
			favoriteTags: [],
			favoriteTagsMetadata: {},
			deletedIds: [],
			faviconFailures: {},
			bookmarks: [],
			fetchFavicons: false,
			layout: "launcher",
			syncSettings: { enabled: false, credentials: "", lastSynced: 0 },
		});
	});

	it("drops only the invalid bookmarks instead of failing the whole store", () => {
		vi.spyOn(console, "warn").mockImplementation(() => {});
		const parsed = storageSchema.parse({
			favoriteTags: ["kept"],
			bookmarks: [
				bookmark(1),
				{ ...bookmark(2), url: "javascript:alert(1)" },
				{ title: "no url" },
				"not even an object",
				bookmark(3),
			],
		});
		expect(parsed.bookmarks.map((b) => b.created)).toEqual([1, 3]);
		expect(parsed.favoriteTags).toEqual(["kept"]);
		expect(console.warn).toHaveBeenCalledTimes(3);
	});

	it("falls back to the launcher layout for an unknown value", () => {
		expect(storageSchema.parse({ layout: "grid" }).layout).toBe("launcher");
		expect(storageSchema.parse({ layout: "list" }).layout).toBe("list");
	});

	it("still fails when the store itself is malformed", () => {
		expect(storageSchema.safeParse({ bookmarks: "not a list" }).success).toBe(false);
	});
});
