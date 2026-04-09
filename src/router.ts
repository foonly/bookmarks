import { createRouter, createWebHashHistory } from "vue-router";
import BookmarksView from "./views/BookmarksView.vue";
import TagsView from "./views/TagsView.vue";
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
		component: BookmarksView,
		props: { showModal: "add" },
	},
	{
		path: "/edit/:id",
		name: "edit-bookmark",
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
		props: (route: any) => ({ tag: decodeURIComponent(route.params.tag) }),
	},
	{
		path: "/tag/:tag/add",
		name: "tag-add-bookmark",
		component: BookmarksView,
		props: (route: any) => ({
			tag: decodeURIComponent(route.params.tag),
			showModal: "add",
		}),
	},
	{
		path: "/tag/:tag/edit/:id",
		name: "tag-edit-bookmark",
		component: BookmarksView,
		props: (route: any) => ({
			tag: decodeURIComponent(route.params.tag),
			showModal: "edit",
			bookmarkId: parseInt(route.params.id),
		}),
	},
	{
		path: "/tags",
		name: "tags",
		component: TagsView,
		props: false,
	},
	{
		path: "/tags/edit/:id",
		name: "tags-edit-bookmark",
		component: TagsView,
		props: (route: any) => ({
			showModal: "edit",
			bookmarkId: parseInt(route.params.id),
		}),
	},
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
