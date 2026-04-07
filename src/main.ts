import "./style.css";
import { loadStore } from "./store.ts";
import { showVersion } from "./version.ts";
import { renderBookmarks } from "./bookmark.ts";
import { BOOKMARKS_ID } from "./constants.ts";
import { router } from "./router.ts";
import { clearModal, setModalContent, showModal } from "./modal.ts";
import { showBookmarkForm } from "./forms/bookmarkForm.ts";
import { renderTagsView } from "./views/tags.ts";
import { renderSettingsView } from "./views/settings.ts";
import { initAutoSync } from "./sync.ts";

loadStore();
initAutoSync();

const app = document.querySelector<HTMLDivElement>("#app")!;

function renderLayout(content: HTMLElement | string) {
	app.innerHTML = "";
	const container = document.createElement("div");
	container.classList.add("container");

	container.append(createNavigation());

	const mainContent = document.createElement("main");
	mainContent.id = "main-content";

	if (typeof content === "string") {
		const div = document.createElement("div");
		div.innerHTML = content;
		mainContent.append(div);
	} else {
		mainContent.append(content);
	}

	container.append(mainContent);
	app.append(container);
}

function handleBookmarksRoute(tag?: string, modalId?: number) {
	renderLayout(createBookmarks());
	renderBookmarks(tag);
	if (modalId !== undefined) {
		clearModal();
		setModalContent(showBookmarkForm(modalId, tag ? [tag] : []));
		showModal();
	} else {
		clearModal();
	}
}

function handleTagsRoute(modalId?: number) {
	renderLayout(renderTagsView());
	if (modalId !== undefined) {
		clearModal();
		setModalContent(showBookmarkForm(modalId));
		showModal();
	} else {
		clearModal();
	}
}

router
	.on("/", () => handleBookmarksRoute())
	.on("/tag/:tag", (params) =>
		handleBookmarksRoute(decodeURIComponent(params.tag)),
	)
	.on("/tag/:tag/add", (params) =>
		handleBookmarksRoute(decodeURIComponent(params.tag), 0),
	)
	.on("/tag/:tag/edit/:id", (params) =>
		handleBookmarksRoute(decodeURIComponent(params.tag), parseInt(params.id)),
	)
	.on("/add", () => handleBookmarksRoute(undefined, 0))
	.on("/edit/:id", (params) =>
		handleBookmarksRoute(undefined, parseInt(params.id)),
	)
	.on("/tags", () => handleTagsRoute())
	.on("/tags/edit/:id", (params) => handleTagsRoute(parseInt(params.id)))
	.on("/settings", () => {
		renderLayout(renderSettingsView());
		clearModal();
	})
	.default(() => {
		router.navigate("/");
	});

showVersion(document.querySelector<HTMLElement>("#version")!);

function createBookmarks() {
	const bookmarks = document.createElement("div");
	bookmarks.classList.add("card");
	bookmarks.id = BOOKMARKS_ID;

	return bookmarks;
}

function createNavigation() {
	const nav = document.createElement("nav");
	nav.classList.add("main-nav");

	const hash = window.location.hash;

	const links = [
		{
			href: "#/",
			label: "Bookmarks",
			active:
				!hash ||
				hash === "#/" ||
				hash.startsWith("#/tag/") ||
				hash.startsWith("#/add") ||
				hash.startsWith("#/edit/"),
		},
		{ href: "#/tags", label: "Tags", active: hash.startsWith("#/tags") },
		{
			href: "#/settings",
			label: "Settings",
			active: hash.startsWith("#/settings"),
		},
	];

	links.forEach((link) => {
		const a = document.createElement("a");
		a.href = link.href;
		a.textContent = link.label;
		if (link.active) a.classList.add("active");
		nav.appendChild(a);
	});

	return nav;
}
