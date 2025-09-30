import { renderBookmarks } from "../bookmark";
import { BOOKMARK_FORM_ID, FieldType } from "../constants";
import { clearModal, closeModal } from "../modal";
import { getBookmark, updateBookmark } from "../store";
import { bookmarkSchema } from "../types";
import { createFormField, createTagsField } from "./formFields";

/**
 * Create a form to add and edit bookmarks.
 */
export function showBookmarkForm(id: number = 0): HTMLFormElement {
  const form = document.createElement("form");
  form.id = BOOKMARK_FORM_ID;

  const buttonBar = document.createElement("div");
  buttonBar.className = "buttonBar";

  const submitButton = document.createElement("button");
  submitButton.textContent = "Save Bookmark";
  submitButton.type = "submit";
  buttonBar.appendChild(submitButton);

  const cancelButton = document.createElement("button");
  cancelButton.textContent = "Cancel";
  cancelButton.type = "reset";
  buttonBar.appendChild(cancelButton);

  const bookmark = getBookmark(id);

  form.appendChild(createFormField("id", "", FieldType.HIDDEN, id));
  form.appendChild(
    createFormField("title", "Title", FieldType.TEXT, bookmark?.title),
  );
  form.appendChild(
    createFormField("url", "URL", FieldType.URL, bookmark?.url, true),
  );
  form.appendChild(createTagsField(bookmark?.tags ?? []));
  form.appendChild(
    createFormField(
      "description",
      "Description",
      FieldType.TEXTAREA,
      bookmark?.description,
    ),
  );

  form.appendChild(buttonBar);

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const data = new FormData(form);
    form.reset();
    closeModal();

    let tagData = [];
    try {
      tagData = JSON.parse(data.get("tags") as string);
    } catch (error) {
      console.error("Error parsing tags:", error);
    }
    console.log(tagData);

    saveBookmark(
      id,
      data.get("title") as string,
      data.get("url") as string,
      tagData,
      data.get("description") as string,
    );

    // Re-render the bookmarks
    renderBookmarks();
  });
  form.addEventListener("reset", () => {
    clearModal();
  });

  return form;
}

function saveBookmark(
  id: number,
  title: string,
  url: string,
  tags: string[],
  description: string,
) {
  if (id) {
    console.log("Update bookmark");
    const bookmark = getBookmark(id);
    if (bookmark) {
      bookmark.title = title;
      bookmark.url = url;
      bookmark.tags = tags;
      bookmark.description = description;
      updateBookmark(bookmark);
    }
  } else {
    console.log("Add bookmark");
    const bookmark = bookmarkSchema.parse({
      title,
      url,
      tags,
      description,
      created: Date.now(),
    });
    updateBookmark(bookmark);
  }
}
