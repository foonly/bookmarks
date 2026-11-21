import { describe, expect, it, vi } from "vitest";
import type { Router } from "vue-router";
import { closeModalRoute } from "./navigation";

function fakeRouter(path: string, back: string | null) {
	return {
		options: { history: { state: { back } } },
		currentRoute: { value: { path } },
		back: vi.fn(),
		replace: vi.fn(),
	};
}

describe("closeModalRoute", () => {
	it("goes back when the modal was opened from inside the app", () => {
		const router = fakeRouter("/tag/news/add", "/tag/news");
		closeModalRoute(router as unknown as Router);
		expect(router.back).toHaveBeenCalled();
		expect(router.replace).not.toHaveBeenCalled();
	});

	it.each([
		["/add", "/"],
		["/edit/1700000000000", "/"],
		["/tag/news/add", "/tag/news"],
		["/tag/100%25/edit/5", "/tag/100%25"],
		["/tags/edit/5", "/tags"],
	])("replaces %s with %s when the page was loaded onto the modal", (path, parent) => {
		// With no in-app history, going back would leave the app.
		const router = fakeRouter(path, null);
		closeModalRoute(router as unknown as Router);
		expect(router.back).not.toHaveBeenCalled();
		expect(router.replace).toHaveBeenCalledWith(parent);
	});
});
