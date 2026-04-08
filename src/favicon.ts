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
