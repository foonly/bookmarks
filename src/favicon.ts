import { ICON_STORAGE_KEY } from "./constants";
import { store } from "./store";
import type { Bookmark } from "./types";

/**
 * Gets the icon store from localStorage.
 */
function getIconStore(): Record<string, string> {
	const data = localStorage.getItem(ICON_STORAGE_KEY);
	if (!data) return {};
	try {
		return JSON.parse(data);
	} catch (error) {
		console.error("Error parsing icon storage:", error);
		return {};
	}
}

/**
 * Saves the icon store to localStorage.
 */
function saveIconStore(store: Record<string, string>): void {
	try {
		localStorage.setItem(ICON_STORAGE_KEY, JSON.stringify(store));
	} catch (error) {
		console.error("Error saving icon storage:", error);
	}
}

/**
 * Generates the favicon URL for a given domain.
 * We use Google's favicon service as it's reliable and handles most site formats.
 */
export function getIconUrl(url: string): string {
	try {
		const domain = new URL(url).hostname;
		return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
	} catch {
		return "";
	}
}

/**
 * Retrieves a cached icon URL for a given URL (by domain).
 */
export function getCachedIcon(url: string): string | null {
	try {
		const domain = new URL(url).hostname;
		const store = getIconStore();
		return store[domain] || null;
	} catch {
		return null;
	}
}

/**
 * Caches the location (URL) of the icon and updates the image element.
 *
 * To avoid CORS issues, we use the URL directly in an <img> tag rather than
 * attempting to fetch the image data. The Service Worker can then be
 * configured to cache these URLs for offline use.
 *
 * @param bookmark The bookmark object.
 * @param imgElement Optional image element to update.
 */
export async function cacheBookmarkIcon(
	bookmark: Bookmark,
	imgElement?: HTMLImageElement,
): Promise<void> {
	if (bookmark.deleted || !store.fetchFavicons) return;

	try {
		const domain = new URL(bookmark.url).hostname;
		const iconUrl = getIconUrl(bookmark.url);

		if (!iconUrl) return;

		// Persist the location (URL) in local storage
		const store = getIconStore();
		if (store[domain] !== iconUrl) {
			store[domain] = iconUrl;
			saveIconStore(store);
		}

		// Update the image element directly.
		// Browser handles the cross-origin request for <img> tags.
		if (imgElement) {
			imgElement.src = iconUrl;
		}
	} catch (error) {
		console.error("Error processing icon:", error);
	}
}
