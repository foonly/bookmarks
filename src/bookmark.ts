import { showModal } from "./modal";
import { store } from "./store";

export function setupBookmarks(element: HTMLDivElement) {
  const bookmarksList = document.createElement("ul");
  bookmarksList.id = "bookmarks-list";
  element.appendChild(bookmarksList);

  if (store.bookmarks.length === 0) {
    const noBookmarks = document.createElement("li");
    noBookmarks.textContent = "No bookmarks yet";
    bookmarksList.appendChild(noBookmarks);
  } else {
    store.bookmarks.forEach((bookmark) => {
      const bookmarkItem = document.createElement("li");
      bookmarkItem.textContent = bookmark.title ?? bookmark.url;
      bookmarksList.appendChild(bookmarkItem);
    });
  }

  element.appendChild(createAddButton());
}

function createAddButton(): HTMLButtonElement {
  const button = document.createElement("button");
  button.textContent = "Add Bookmark";
  button.type = "button";
  button.addEventListener("click", () => {
    showModal(true, "test");
  });
  return button;
}

/**
 * Create a form to add and edit bookmarks.
 */
export function showBookmarkForm() {
  const form = document.createElement("form");
  form.id = "bookmark-form";

  const submitButton = document.createElement("button");
  submitButton.textContent = "Save Bookmark";
  submitButton.type = "submit";

  form.appendChild(createFormField("title", "Title: "));
  form.appendChild(createFormField("url", "URL: ", "url", true));
  form.appendChild(submitButton);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const title = titleInput.value;
    const url = urlInput.value;

    store.addBookmark({ title, url });

    // Clear the form
    titleInput.value = "";
    urlInput.value = "";

    // Re-render the bookmarks
    const bookmarksDiv = document.getElementById("bookmarks");
    if (bookmarksDiv) {
      bookmarksDiv.innerHTML = "";
      setupBookmarks(bookmarksDiv as HTMLDivElement);
    }
  });

  // Append the form to the document body (or another appropriate element)
  document.body.appendChild(form);
}

function createFormField(
  name: string,
  label: string,
  type: string = "text",
  required = false,
) {
  const fieldElement = document.createElement("div");

  const labelElement = document.createElement("label");
  labelElement.textContent = label;
  const inputElement = document.createElement("input");
  inputElement.type = type;
  inputElement.name = name;
  inputElement.required = required;

  fieldElement.appendChild(labelElement);
  fieldElement.appendChild(inputElement);

  return fieldElement;
}
