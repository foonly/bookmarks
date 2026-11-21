/**
 * Generates the favicon URL for a given domain.
 * We use favicon.im as it's reliable and handles most site formats.
 */
export function getIconUrl(url: string): string {
	try {
		const domain = new URL(url).hostname;
		return `https://favicon.im/${domain}?throw-error-on-404=true`;
	} catch {
		return "";
	}
}

/**
 * Tells whether a failed icon load was the icon's fault rather than the
 * network's. An <img> error looks the same either way, but a fetch only
 * rejects when no response arrived (offline, DNS failure, connection reset).
 * The response is opaque, so a 404 still counts as "the server answered".
 */
export async function iconFailedOnServer(iconUrl: string): Promise<boolean> {
	if (!navigator.onLine) return false;
	try {
		await fetch(iconUrl, { mode: "no-cors", cache: "no-store" });
		return true;
	} catch {
		return false;
	}
}
