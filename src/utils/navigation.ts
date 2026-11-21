import type { Router } from "vue-router";

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
	router.replace(path.replace(/\/(add|edit\/[^/]+)$/, "") || "/");
}
