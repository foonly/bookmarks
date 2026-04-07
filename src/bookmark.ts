import { BOOKMARK_LIST_ID, BOOKMARKS_ID } from "./constants";

import { getTags, removeBookmark, store } from "./store";
import type { Bookmark } from "./types";
import remove from "/trash.svg?raw";
import edit from "/pen-to-square.svg?raw";
import add from "/bookmark-plus.svg?raw";

export function renderBookmarks(filterTag?: string): void {
	const element = document.getElementById(BOOKMARKS_ID);
	if (!(element instanceof HTMLDivElement)) return;

	// Empty the element.
	while (element.firstChild) {
		element.removeChild(element.firstChild);
	}

	element.appendChild(createTagFilter(filterTag));

	// Create the list.
	const bookmarksList = document.createElement("div");
	bookmarksList.id = BOOKMARK_LIST_ID;
	element.appendChild(bookmarksList);

	let filteredBookmarks = store.bookmarks;
	if (filterTag) {
		filteredBookmarks = store.bookmarks.filter((b) =>
			b.tags.includes(filterTag),
		);
	}

	if (filteredBookmarks.length === 0) {
		const noBookmarks = document.createElement("p");
		noBookmarks.textContent = filterTag
			? `No bookmarks with tag "${filterTag}"`
			: "No bookmarks yet";
		bookmarksList.appendChild(noBookmarks);
	} else {
		const sortedBookmarks = filteredBookmarks.sort((a, b) => {
			return a.title.localeCompare(b.title);
		});
		sortedBookmarks.forEach((bookmark) => {
			const bookmarkItem = document.createElement("div");
			bookmarkItem.classList.add("bookmarkItem");
			bookmarkItem.appendChild(createLink(bookmark));
			bookmarkItem.appendChild(createButtons(bookmark));
			bookmarksList.appendChild(bookmarkItem);
		});
	}

	element.appendChild(createAddButton());
}

function createTagFilter(activeTag?: string): HTMLElement {
	const container = document.createElement("div");
	container.classList.add("tag-filter-bar");

	const allLink = document.createElement("a");
	allLink.href = "#/";
	allLink.textContent = "All";
	allLink.classList.add("tag-filter-item");
	if (!activeTag) allLink.classList.add("active");
	container.appendChild(allLink);

	const tags = getTags();
	tags.forEach((tag) => {
		const tagLink = document.createElement("a");
		tagLink.href = `#/tag/${encodeURIComponent(tag)}`;
		tagLink.textContent = tag;
		tagLink.classList.add("tag-filter-item");
		if (tag === activeTag) tagLink.classList.add("active");
		container.appendChild(tagLink);
	});

	return container;
}

function createLink(bookmark: Bookmark): HTMLAnchorElement {
	const link = document.createElement("a");
	link.title = bookmark.url;
	link.textContent = bookmark.title ? bookmark.title : bookmark.url;
	link.href = bookmark.url;
	link.target = "_blank";
	return link;
}
function createButtons(bookmark: Bookmark) {
	const buttons = document.createElement("div");
	buttons.classList.add("bookmarkButtons");

	const editLink = document.createElement("a");
	editLink.classList.add("editButton", "icon");
	editLink.innerHTML = edit;
	editLink.href = `#/edit/${bookmark.created}`;
	buttons.appendChild(editLink);

	const deleteButton = document.createElement("button");
	deleteButton.classList.add("deleteButton", "icon");
	deleteButton.innerHTML = remove;
	deleteButton.type = "button";
	deleteButton.addEventListener("click", () => {
		if (confirm("Are you sure you want to delete this bookmark?")) {
			removeBookmark(bookmark.created);
			renderBookmarks();
		}
	});
	buttons.appendChild(deleteButton);

	return buttons;
}

function createAddButton(): HTMLAnchorElement {
	const link = document.createElement("a");
	link.classList.add("bookmarkButton", "icon");
	link.title = "Add Bookmark";
	link.innerHTML = add;
	link.href = "#/add";
	return link;
}
