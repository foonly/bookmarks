type ElementAttributes = {
	content?: string;
	class?: string[];
	[type: string]: any;
};

export function makeElement(
	type: string,
	attributes: ElementAttributes = {},
	parent?: HTMLElement,
): HTMLElement {
	const element = document.createElement(type);

	for (const [key, value] of Object.entries(attributes)) {
		if (key === "content") {
			element.textContent = value;
			continue;
		}
		if (key === "class" && Array.isArray(value)) {
			element.classList.add(...value);
			continue;
		}
		element.setAttribute(key, value);
	}

	if (parent) {
		parent.appendChild(element);
	}

	return element;
}
