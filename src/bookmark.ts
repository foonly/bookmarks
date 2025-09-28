import { BOOKMARK_LIST_ID, BOOKMARKS_ID } from "./constants";
import { showBookmarkForm } from "./forms/bookmarkForm";
import { clearModal, setModalContent, showModal } from "./modal";
import { removeBookmark, store } from "./store";
import type { Bookmark } from "./types";
import remove from "/trash.svg?raw";
import edit from "/pen-to-square.svg?raw";
import add from "/bookmark-plus.svg?raw";

export function renderBookmarks(): void {
  const element = document.getElementById(BOOKMARKS_ID);
  if (!(element instanceof HTMLDivElement)) return;

  // Empty the element.
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }

  // Create the list.
  const bookmarksList = document.createElement("div");
  bookmarksList.id = BOOKMARK_LIST_ID;
  element.appendChild(bookmarksList);

  if (store.bookmarks.length === 0) {
    const noBookmarks = document.createElement("p");
    noBookmarks.textContent = "No bookmarks yet";
    bookmarksList.appendChild(noBookmarks);
  } else {
    const sortedBookmarks = store.bookmarks.sort((a, b) => {
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

  const editButton = document.createElement("button");
  editButton.classList.add("editButton", "icon");
  editButton.innerHTML = edit;
  editButton.type = "button";
  editButton.addEventListener("click", () => {
    clearModal();
    setModalContent(showBookmarkForm(bookmark.created));
    showModal();
  });
  buttons.appendChild(editButton);

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

function createAddButton(): HTMLButtonElement {
  const button = document.createElement("button");
  button.classList.add("bookmarkButton", "icon");
  button.title = "Add Bookmark";
  button.innerHTML = add;
  button.type = "button";
  button.addEventListener("click", () => {
    clearModal();
    setModalContent(showBookmarkForm());
    showModal();
  });
  return button;
}
