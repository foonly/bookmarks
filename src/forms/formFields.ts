import { FieldType } from "../constants";
import { getTags } from "../store";

export function createFormField(
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

export function createTagsField(tags: string[]) {
  const tagsList = [...tags];
  const tagsElement = document.createElement("div");
  tagsElement.classList.add("formField", "formFieldTags");

  const dataList = document.createElement("datalist");
  dataList.id = "tagsList";

  getTags().forEach((tag) => {
    if (!tagsList.includes(tag)) {
      const optionElement = document.createElement("option");
      optionElement.value = tag;
      dataList.appendChild(optionElement);
    }
  });
  tagsElement.appendChild(dataList);

  const labelElement = document.createElement("label");
  labelElement.htmlFor = "tags";
  labelElement.textContent = "Tags";
  tagsElement.appendChild(labelElement);

  const inputElement = document.createElement("input");
  inputElement.setAttribute("list", "tagsList");
  inputElement.id = "tags";
  inputElement.required = false;

  tagsElement.appendChild(inputElement);

  const tagFieldElement = document.createElement("input");
  tagFieldElement.type = "hidden";
  tagFieldElement.name = "tags";
  tagFieldElement.value = JSON.stringify(tagsList);

  tagsElement.appendChild(tagFieldElement);

  const tagContainer = document.createElement("div");
  tagsElement.appendChild(tagContainer);
  renderTags(tagContainer, tagFieldElement, tagsList);

  inputElement.addEventListener("input", (event) => {
    if (
      event instanceof InputEvent &&
      event.inputType === "insertReplacementText"
    ) {
      addTag(tagsList, inputElement.value);
      tagFieldElement.value = JSON.stringify(tagsList);
      renderTags(tagContainer, tagFieldElement, tagsList);
      inputElement.value = "";
    }
  });

  inputElement.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addTag(tagsList, inputElement.value);
      tagFieldElement.value = JSON.stringify(tagsList);
      renderTags(tagContainer, tagFieldElement, tagsList);
      inputElement.value = "";
    }
  });

  return tagsElement;
}

function addTag(tags: string[], tag: string) {
  if (!tag) return;
  if (!tags.includes(tag)) tags.push(tag);
}

function removeTag(tags: string[], tag: string) {
  const index = tags.indexOf(tag);
  if (index !== -1) tags.splice(index, 1);
}

function renderTags(
  container: HTMLDivElement,
  tagFieldElement: HTMLInputElement,
  tags: string[],
) {
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }
  tags.forEach((tag) => {
    const tagElement = document.createElement("button");
    tagElement.textContent = tag;
    tagElement.addEventListener("click", () => {
      removeTag(tags, tag);
      tagFieldElement.value = JSON.stringify(tags);
      renderTags(container, tagFieldElement, tags);
    });
    container.appendChild(tagElement);
  });
}
