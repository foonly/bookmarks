import { describe, expect, it, vi } from "vitest";
import { getIconUrl, iconFailedOnServer } from "./favicon";

describe("getIconUrl", () => {
	it("asks favicon.im for the bookmark's host", () => {
		expect(getIconUrl("https://sub.example.com/page?q=1")).toBe(
			"https://favicon.im/sub.example.com?throw-error-on-404=true",
		);
	});

	it("returns an empty string for an invalid URL", () => {
		expect(getIconUrl("not a url")).toBe("");
	});
});

describe("iconFailedOnServer", () => {
	const iconUrl = "https://favicon.im/example.com?throw-error-on-404=true";

	it("blames the icon when the server answered, even with an error", async () => {
		vi.stubGlobal("navigator", { onLine: true });
		vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 404 })));
		expect(await iconFailedOnServer(iconUrl)).toBe(true);
	});

	it("blames the network when no response arrived", async () => {
		// Recording these would disable the icon on every device for good.
		vi.stubGlobal("navigator", { onLine: true });
		vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
		expect(await iconFailedOnServer(iconUrl)).toBe(false);
	});

	it("blames the network without asking when the browser is offline", async () => {
		const fetch = vi.fn();
		vi.stubGlobal("navigator", { onLine: false });
		vi.stubGlobal("fetch", fetch);
		expect(await iconFailedOnServer(iconUrl)).toBe(false);
		expect(fetch).not.toHaveBeenCalled();
	});
});
