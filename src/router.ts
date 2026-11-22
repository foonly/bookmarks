import { createRouter, createWebHashHistory } from "vue-router";
import BookmarksView from "./views/BookmarksView.vue";
import SettingsView from "./views/SettingsView.vue";
import AboutView from "./views/AboutView.vue";

const routes = [
	{
		path: "/",
		name: "bookmarks",
		component: BookmarksView,
		props: false,
	},
	{
		path: "/add",
		name: "add-bookmark",
		meta: { modal: true },
		component: BookmarksView,
		props: { showModal: "add" },
	},
	{
		path: "/edit/:id",
		name: "edit-bookmark",
		meta: { modal: true },
		component: BookmarksView,
		props: (route: any) => ({
			showModal: "edit",
			bookmarkId: parseInt(route.params.id),
		}),
	},
	{
		path: "/tag/:tag",
		name: "tag-bookmarks",
		component: BookmarksView,
		props: (route: any) => ({ tag: route.params.tag }),
	},
	{
		path: "/tag/:tag/add",
		name: "tag-add-bookmark",
		meta: { modal: true },
		component: BookmarksView,
		props: (route: any) => ({
			tag: route.params.tag,
			showModal: "add",
		}),
	},
	{
		path: "/tag/:tag/edit/:id",
		name: "tag-edit-bookmark",
		meta: { modal: true },
		component: BookmarksView,
		props: (route: any) => ({
			tag: route.params.tag,
			showModal: "edit",
			bookmarkId: parseInt(route.params.id),
		}),
	},
	// The Tags page was replaced by tag filters in both layouts.
	{ path: "/tags", redirect: "/" },
	{ path: "/tags/edit/:id", redirect: (to: any) => `/edit/${to.params.id}` },
	{
		path: "/settings",
		name: "settings",
		component: SettingsView,
	},
	{
		path: "/about",
		name: "about",
		component: AboutView,
	},
	{
		path: "/:pathMatch(.*)*",
		redirect: "/",
	},
];

export const router = createRouter({
	history: createWebHashHistory(),
	routes,
});
