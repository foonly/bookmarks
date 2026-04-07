import { store, getTagsWithCounts } from "../store";
export function renderTagsView(): HTMLElement {
	const container = document.createElement("div");
	container.classList.add("tags-view");

	const tagsWithCounts = getTagsWithCounts();
	const sortedTags = Object.keys(tagsWithCounts).sort((a, b) =>
		a.localeCompare(b),
	);

	if (sortedTags.length === 0) {
		const noTags = document.createElement("p");
		noTags.textContent = "No tags found.";
		container.appendChild(noTags);
		return container;
	}

	const tagsGrid = document.createElement("div");
	tagsGrid.classList.add("tags-grid");

	sortedTags.forEach((tag) => {
		const tagSection = document.createElement("section");
		tagSection.classList.add("tag-section");

		const tagHeader = document.createElement("h2");
		tagHeader.innerHTML = `<span>${tag}</span><span class="tag-count">${tagsWithCounts[tag]}</span>`;
		tagSection.appendChild(tagHeader);

		const bookmarkList = document.createElement("ul");
		bookmarkList.classList.add("tag-bookmark-list");

		const bookmarksWithTag = store.bookmarks
			.filter((b) => !b.deleted && b.tags.includes(tag))
			.sort((a, b) => a.title.localeCompare(b.title));

		bookmarksWithTag.forEach((bookmark) => {
			const item = document.createElement("li");
			const link = document.createElement("a");
			link.href = bookmark.url;
			link.target = "_blank";
			link.textContent = bookmark.title || bookmark.url;

			const editLink = document.createElement("a");
			editLink.href = `#/tags/edit/${bookmark.created}`;
			editLink.classList.add("tag-edit-link");
			editLink.textContent = "edit";

			item.appendChild(link);
			item.appendChild(document.createTextNode(" "));
			item.appendChild(editLink);
			bookmarkList.appendChild(item);
		});

		tagSection.appendChild(bookmarkList);
		tagsGrid.appendChild(tagSection);
	});

	container.appendChild(tagsGrid);

	return container;
}
