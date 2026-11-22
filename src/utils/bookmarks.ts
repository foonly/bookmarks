import type { Bookmark } from "../types";

/** The host name without "www.", or the URL itself when it cannot be parsed. */
export function domainOf(url: string): string {
	try {
		return new URL(url).hostname.replace(/^www\./, "");
	} catch {
		return url;
	}
}

/** Most clicked first, then alphabetically by title. */
export function byClicks(a: Bookmark, b: Bookmark): number {
	return (b.clicks || 0) - (a.clicks || 0) || a.title.localeCompare(b.title);
}

/** Whether the query appears in the title, URL, description or a tag. */
export function matchesQuery(bookmark: Bookmark, query: string): boolean {
	const q = query.trim().toLowerCase();
	if (!q) return true;
	return (
		bookmark.title.toLowerCase().includes(q) ||
		bookmark.url.toLowerCase().includes(q) ||
		bookmark.description.toLowerCase().includes(q) ||
		bookmark.tags.some((tag) => tag.toLowerCase().includes(q))
	);
}
