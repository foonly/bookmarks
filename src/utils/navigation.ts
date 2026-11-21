import type { Router } from "vue-router";

/** The end of an add/edit modal route: "/add" or "/edit/:id". */
const MODAL_ROUTE_SUFFIX = /\/(add|edit\/[^/]+)$/;

/** Whether the path shows the add/edit bookmark modal. */
export function isModalRoute(path: string): boolean {
	return MODAL_ROUTE_SUFFIX.test(path);
}

/**
 * Leaves an add/edit modal route. Goes back when the modal was opened from
 * inside the app; when the page was loaded straight onto the modal route
 * (a reload or a shared link) there is nothing to go back to, so it replaces
 * the route with the list the modal belongs to instead.
 */
export function closeModalRoute(router: Router) {
	if (router.options.history.state.back) {
		router.back();
		return;
	}
	const path = router.currentRoute.value.path;
	router.replace(path.replace(MODAL_ROUTE_SUFFIX, "") || "/");
}

/**
 * Reloads the page, but waits while an add/edit modal is open so that nothing
 * typed into the form is lost.
 */
export function reloadWhenNotEditing(router: Router, reload = () => location.reload()) {
	if (!isModalRoute(router.currentRoute.value.path)) {
		reload();
		return;
	}
	const stop = router.afterEach((to) => {
		if (!isModalRoute(to.path)) {
			stop();
			reload();
		}
	});
}
