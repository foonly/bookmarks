import { describe, expect, it, vi } from "vitest";
import { createMemoryHistory, createRouter } from "vue-router";
import type { Router } from "vue-router";
import { closeModalRoute, isModalRoute, reloadWhenNotEditing } from "./navigation";

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

/** A router with the app's route shapes (see router.ts), without its views. */
async function routerAt(path: string) {
	const component = { render: () => null };
	const modal = { modal: true };
	const router = createRouter({
		history: createMemoryHistory(),
		routes: [
			{ path: "/", component },
			{ path: "/add", component, meta: modal },
			{ path: "/edit/:id", component, meta: modal },
			{ path: "/tag/:tag", component },
			{ path: "/tag/:tag/add", component, meta: modal },
			{ path: "/tag/:tag/edit/:id", component, meta: modal },
			{ path: "/tags", component },
			{ path: "/tags/edit/:id", component, meta: modal },
		],
	});
	await router.push(path);
	return router;
}

describe("isModalRoute", () => {
	it.each(["/add", "/edit/5", "/tag/news/add", "/tag/news/edit/5", "/tags/edit/5", "/tag/add/add"])(
		"is true for %s",
		async (path) => expect(isModalRoute((await routerAt(path)).currentRoute.value)).toBe(true),
	);
	it.each(["/", "/tags", "/tag/news", "/tag/add", "/tag/edit"])(
		"is false for %s",
		// "/tag/add" is the tag named "add", not the add form.
		async (path) => expect(isModalRoute((await routerAt(path)).currentRoute.value)).toBe(false),
	);
});

describe("reloadWhenNotEditing", () => {
	it("reloads straight away when no form is open", async () => {
		const reload = vi.fn();
		reloadWhenNotEditing(await routerAt("/tag/add"), reload);
		expect(reload).toHaveBeenCalledTimes(1);
	});

	it("waits until the form is closed", async () => {
		const reload = vi.fn();
		const router = await routerAt("/add");
		reloadWhenNotEditing(router, reload);
		expect(reload).not.toHaveBeenCalled();

		await router.push("/tag/news/edit/5");
		expect(reload).not.toHaveBeenCalled();
		await router.push("/");
		expect(reload).toHaveBeenCalledTimes(1);
		await router.push("/tags");
		expect(reload).toHaveBeenCalledTimes(1);
	});
});
