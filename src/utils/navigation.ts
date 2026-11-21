import type { RouteLocationNormalized, Router } from "vue-router";

declare module "vue-router" {
	interface RouteMeta {
		/** The route shows the add/edit bookmark modal. */
		modal?: boolean;
	}
}

/** The end of an add/edit modal route: "/add" or "/edit/:id". */
const MODAL_ROUTE_SUFFIX = /\/(add|edit\/[^/]+)$/;

/**
 * Whether the route shows the add/edit bookmark modal. Decided by the route
 * definition rather than the path, which a tag named "add" would also match.
 */
export function isModalRoute(route: Pick<RouteLocationNormalized, "meta">): boolean {
	return route.meta.modal === true;
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
	if (!isModalRoute(router.currentRoute.value)) {
		reload();
		return;
	}
	const stop = router.afterEach((to) => {
		if (!isModalRoute(to)) {
			stop();
			reload();
		}
	});
}
