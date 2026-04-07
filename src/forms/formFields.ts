import { FieldType } from "../constants";
import { getTags } from "../store";
import { t } from "../i18n";

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

	const updateDataList = () => {
		dataList.innerHTML = "";
		getTags().forEach((tag) => {
			if (!tagsList.includes(tag)) {
				const optionElement = document.createElement("option");
				optionElement.value = tag;
				dataList.appendChild(optionElement);
			}
		});
	};
	updateDataList();
	tagsElement.appendChild(dataList);

	const labelElement = document.createElement("label");
	labelElement.htmlFor = "tags";
	labelElement.textContent = t("form.tags");
	tagsElement.appendChild(labelElement);

	const inputGroup = document.createElement("div");
	inputGroup.classList.add("tagInputGroup");

	const inputElement = document.createElement("input");
	inputElement.setAttribute("list", "tagsList");
	inputElement.id = "tags";
	inputElement.placeholder = t("form.add_tag_placeholder");
	inputElement.required = false;

	const addButton = document.createElement("button");
	addButton.type = "button";
	addButton.textContent = t("form.add_tag_button");
	addButton.classList.add("addTagButton");

	inputGroup.appendChild(inputElement);
	inputGroup.appendChild(addButton);
	tagsElement.appendChild(inputGroup);

	const tagFieldElement = document.createElement("input");
	tagFieldElement.type = "hidden";
	tagFieldElement.name = "tags";
	tagFieldElement.value = JSON.stringify(tagsList);
	tagsElement.appendChild(tagFieldElement);

	const tagSection = document.createElement("div");
	tagSection.classList.add("addedTagsSection");

	const tagSectionLabel = document.createElement("div");
	tagSectionLabel.classList.add("tagSectionLabel");
	tagSectionLabel.textContent = t("form.added_tags_label");
	tagSection.appendChild(tagSectionLabel);

	const tagContainer = document.createElement("div");
	tagContainer.classList.add("tagContainer");
	tagSection.appendChild(tagContainer);
	tagsElement.appendChild(tagSection);

	const triggerAddTag = () => {
		const val = inputElement.value.trim();
		if (val) {
			addTag(tagsList, val);
			tagFieldElement.value = JSON.stringify(tagsList);
			renderTags(tagContainer, tagFieldElement, tagsList, updateDataList);
			updateDataList();
			inputElement.value = "";
		}
	};

	renderTags(tagContainer, tagFieldElement, tagsList, updateDataList);

	addButton.addEventListener("click", triggerAddTag);

	inputElement.addEventListener("input", (event) => {
		if (
			event instanceof InputEvent &&
			event.inputType === "insertReplacementText"
		) {
			triggerAddTag();
		}
	});

	inputElement.addEventListener("keydown", (event) => {
		if (event.key === "Enter") {
			event.preventDefault();
			triggerAddTag();
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
	onUpdate?: () => void,
) {
	while (container.firstChild) {
		container.removeChild(container.firstChild);
	}

	if (tags.length === 0) {
		const emptyMsg = document.createElement("span");
		emptyMsg.classList.add("emptyTagsMsg");
		emptyMsg.textContent = t("form.no_tags");
		container.appendChild(emptyMsg);
		return;
	}

	tags.forEach((tag) => {
		const tagElement = document.createElement("div");
		tagElement.classList.add("tagBadge");
		tagElement.textContent = tag;

		const removeBtn = document.createElement("span");
		removeBtn.classList.add("removeTagBtn");
		removeBtn.innerHTML = "&times;";
		removeBtn.title = t("form.remove_tag_title", { tag });

		removeBtn.addEventListener("click", () => {
			removeTag(tags, tag);
			tagFieldElement.value = JSON.stringify(tags);
			renderTags(container, tagFieldElement, tags, onUpdate);
			if (onUpdate) onUpdate();
		});

		tagElement.appendChild(removeBtn);
		container.appendChild(tagElement);
	});
}
