import "./style.css";
import { loadStore } from "./store.ts";
import { showVersion } from "./version.ts";
import { renderBookmarks } from "./bookmark.ts";
import { BOOKMARKS_ID } from "./constants.ts";
import { router } from "./router.ts";
import { clearModal, setModalContent, showModal } from "./modal.ts";
import { showBookmarkForm } from "./forms/bookmarkForm.ts";
import { renderTagsView } from "./views/tags.ts";

loadStore();

const app = document.querySelector<HTMLDivElement>("#app")!;

function renderLayout(content: HTMLElement | string) {
	app.innerHTML = "";
	app.append(createNavigation());
	if (typeof content === "string") {
		const div = document.createElement("div");
		div.innerHTML = content;
		app.append(div);
	} else {
		app.append(content);
	}
}

router
	.on("/", () => {
		renderLayout(createBookmarks());
		renderBookmarks();
		clearModal();
	})
	.on("/tag/:tag", (params) => {
		const tag = decodeURIComponent(params.tag);
		renderLayout(createBookmarks());
		renderBookmarks(tag);
		clearModal();
	})
	.on("/add", () => {
		renderLayout(createBookmarks());
		renderBookmarks();
		clearModal();
		setModalContent(showBookmarkForm());
		showModal();
	})
	.on("/edit/:id", (params) => {
		renderLayout(createBookmarks());
		renderBookmarks();
		const id = parseInt(params.id);
		clearModal();
		setModalContent(showBookmarkForm(id));
		showModal();
	})
	.on("/tags", () => {
		renderLayout(renderTagsView());
		clearModal();
	})
	.on("/settings", () => {
		renderLayout("<h1>Settings (Coming Soon)</h1>");
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
	nav.innerHTML = `
		<a href="#/">Bookmarks</a>
		<a href="#/tags">Tags</a>
		<a href="#/settings">Settings</a>
	`;
	return nav;
}
