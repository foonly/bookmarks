import { renderBookmarks } from "../bookmark";
import { BOOKMARK_FORM_ID, FieldType } from "../constants";
import { clearModal, closeModal } from "../modal";
import { getBookmark, updateBookmark } from "../store";
import { bookmarkSchema } from "../types";

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

    saveBookmark(
      id,
      data.get("title") as string,
      data.get("url") as string,
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

function createFormField(
  name: string,
  label: string,
  type: string = FieldType.TEXT,
  value: string | number = "",
  required = false,
): HTMLElement {
  const fieldElement = document.createElement("div");

  const capitalizedType = type.charAt(0).toUpperCase() + type.slice(1);
  fieldElement.classList.add("formField", `formField${capitalizedType}`);

  if (type !== FieldType.HIDDEN) {
    const labelElement = document.createElement("label");
    labelElement.htmlFor = name;
    labelElement.textContent = label;
    fieldElement.appendChild(labelElement);
  }
  const sanitizedValue = value
    .toString()
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const inputElement =
    type === FieldType.TEXTAREA
      ? document.createElement("textarea")
      : document.createElement("input");
  if (inputElement instanceof HTMLInputElement) {
    inputElement.type = type;
  }
  inputElement.id = name;
  inputElement.name = name;
  inputElement.value = sanitizedValue;
  inputElement.required = required;

  if (type === FieldType.HIDDEN) {
    return inputElement;
  }

  fieldElement.appendChild(inputElement);

  return fieldElement;
}

function createTagsField(tags: string[]) {
  const tagsElement = document.createElement("div");
  tagsElement.classList.add("formField", "formFieldTags");

  const dataList = document.createElement("datalist");
  dataList.id = "tagsList";

  const allTags = ["Test", "Foobar", "Testing"];
  allTags.forEach((tag) => {
    const optionElement = document.createElement("option");
    optionElement.value = tag;
    dataList.appendChild(optionElement);
  });
  tagsElement.appendChild(dataList);

  const labelElement = document.createElement("label");
  labelElement.htmlFor = "tags";
  labelElement.textContent = "Tags";
  tagsElement.appendChild(labelElement);

  const inputElement = document.createElement("input");
  inputElement.setAttribute("list", "tagsList");
  inputElement.id = "tags";
  inputElement.name = "tags";
  inputElement.value = tags.join(", ");
  inputElement.required = false;

  tagsElement.appendChild(inputElement);

  return tagsElement;
}

function saveBookmark(
  id: number,
  title: string,
  url: string,
  description: string,
) {
  if (id) {
    console.log("Update bookmark");
    const bookmark = getBookmark(id);
    if (bookmark) {
      bookmark.title = title;
      bookmark.url = url;
      bookmark.description = description;
      updateBookmark(bookmark);
    }
  } else {
    console.log("Add bookmark");
    const bookmark = bookmarkSchema.parse({
      title,
      url,
      description,
      created: Date.now(),
    });
    updateBookmark(bookmark);
  }
}
