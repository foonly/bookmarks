import type { LocationQuery } from "vue-router";
import type { Bookmark } from "../types";

export interface Prefill {
	url: string;
	title: string;
	description: string;
	tags: string[];
}

const first = (value: LocationQuery[string]): string =>
	(Array.isArray(value) ? value[0] : value)?.trim() ?? "";

/**
 * Reads a bookmark passed in the add link, as the browser extension opens it:
 * `#/add?url=…&title=…&description=…&tags=a,b`. Anything missing is empty.
 */
export function prefillFromQuery(query: LocationQuery): Prefill {
	return {
		url: first(query.url),
		title: first(query.title),
		description: first(query.description),
		tags: first(query.tags)
			.split(",")
			.map((tag) => tag.trim())
			.filter(Boolean),
	};
}

/** Ignores a trailing slash and the case of the scheme and host. */
function normalize(url: string): string {
	try {
		const parsed = new URL(url);
		parsed.hash = parsed.hash === "#" ? "" : parsed.hash;
		return parsed.href.replace(/\/$/, "");
	} catch {
		return url.trim().replace(/\/$/, "");
	}
}

/** The saved bookmark for this address, if there is one. */
export function findByUrl(bookmarks: Bookmark[], url: string): Bookmark | undefined {
	const target = normalize(url);
	return bookmarks.find((b) => normalize(b.url) === target);
}
