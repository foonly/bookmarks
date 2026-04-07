import { BOOKMARK_LIST_ID, BOOKMARKS_ID } from "../constants";

import { getTags, removeBookmark, store } from "../store";
import type { Bookmark } from "../types";
import { t } from "../i18n";
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

	// Remove card class from the main container as we want the card to wrap only the list.
	element.classList.remove("card");

	// Create a toolbar for the filter and add button.
	const toolbar = document.createElement("div");
	toolbar.classList.add("bookmarks-toolbar");
	toolbar.appendChild(createTagFilter(filterTag));
	toolbar.appendChild(createAddButton(filterTag));
	element.appendChild(toolbar);

	// Create the card container for the actual list.
	const card = document.createElement("div");
	card.classList.add("card");
	element.appendChild(card);

	// Create the list.
	const bookmarksList = document.createElement("div");
	bookmarksList.id = BOOKMARK_LIST_ID;
	card.appendChild(bookmarksList);

	let filteredBookmarks = store.bookmarks.filter((b) => !b.deleted);
	if (filterTag) {
		filteredBookmarks = filteredBookmarks.filter((b) =>
			b.tags.includes(filterTag),
		);
	}

	if (filteredBookmarks.length === 0) {
		const noBookmarks = document.createElement("p");
		noBookmarks.textContent = filterTag
			? t("bookmarks.no_bookmarks_tag", { tag: filterTag })
			: t("bookmarks.no_bookmarks");
		bookmarksList.appendChild(noBookmarks);
	} else {
		const sortedBookmarks = filteredBookmarks.sort((a, b) => {
			return a.title.localeCompare(b.title);
		});
		sortedBookmarks.forEach((bookmark) => {
			const bookmarkItem = document.createElement("div");
			bookmarkItem.classList.add("bookmarkItem");

			const content = document.createElement("div");
			content.classList.add("bookmarkContent");
			content.appendChild(createLink(bookmark));

			if (bookmark.description) {
				const description = document.createElement("div");
				description.classList.add("bookmarkDescription");
				const truncated =
					bookmark.description.length > 160
						? bookmark.description.substring(0, 160) + "..."
						: bookmark.description;
				description.textContent = truncated;
				content.appendChild(description);
			}

			if (bookmark.tags && bookmark.tags.length > 0) {
				const tagsContainer = document.createElement("div");
				tagsContainer.classList.add("bookmarkTags");
				bookmark.tags.forEach((tag) => {
					const tagBadge = document.createElement("a");
					tagBadge.href = `#/tag/${encodeURIComponent(tag)}`;
					tagBadge.classList.add("tagBadge");
					tagBadge.textContent = tag;
					tagsContainer.appendChild(tagBadge);
				});
				content.appendChild(tagsContainer);
			}

			bookmarkItem.appendChild(content);
			bookmarkItem.appendChild(createButtons(bookmark, filterTag));
			bookmarksList.appendChild(bookmarkItem);
		});
	}
}

function createTagFilter(activeTag?: string): HTMLElement {
	const container = document.createElement("div");
	container.classList.add("tag-filter-bar");

	const allLink = document.createElement("a");
	allLink.href = "#/";
	allLink.textContent = t("bookmarks.filter_all");
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
	link.rel = "noopener noreferrer";
	return link;
}
function createButtons(bookmark: Bookmark, filterTag?: string) {
	const buttons = document.createElement("div");
	buttons.classList.add("bookmarkButtons");

	const editLink = document.createElement("a");
	editLink.classList.add("editButton", "icon");
	editLink.innerHTML = edit;
	const editTitle = t("bookmarks.edit_button_title", {
		title: bookmark.title || bookmark.url,
	});
	editLink.title = editTitle;
	editLink.setAttribute("aria-label", editTitle);
	editLink.href = filterTag
		? `#/tag/${encodeURIComponent(filterTag)}/edit/${bookmark.created}`
		: `#/edit/${bookmark.created}`;
	buttons.appendChild(editLink);

	const deleteButton = document.createElement("button");
	deleteButton.classList.add("deleteButton", "icon");
	deleteButton.innerHTML = remove;
	const deleteTitle = t("bookmarks.delete_button_title", {
		title: bookmark.title || bookmark.url,
	});
	deleteButton.title = deleteTitle;
	deleteButton.setAttribute("aria-label", deleteTitle);
	deleteButton.type = "button";
	deleteButton.addEventListener("click", () => {
		if (confirm(t("bookmarks.delete_confirm"))) {
			removeBookmark(bookmark.created);
			renderBookmarks();
		}
	});
	buttons.appendChild(deleteButton);

	return buttons;
}

function createAddButton(filterTag?: string): HTMLAnchorElement {
	const link = document.createElement("a");
	link.classList.add("bookmarkButton", "icon");
	const label = t("bookmarks.add_button_title");
	link.title = label;
	link.setAttribute("aria-label", label);
	link.innerHTML = add;
	link.href = filterTag
		? `#/tag/${encodeURIComponent(filterTag)}/add`
		: "#/add";
	return link;
}
