import { t } from "../i18n";
import p from "../../package.json";

export function renderAboutView(): HTMLElement {
	const container = document.createElement("div");
	container.classList.add("about-view", "card");

	const content = `
# ${t("about.title")}

${t("about.content")}

---

**${t("about.version")}**: ${p.version}
	`;

	parseMarkdown(container, content);
	return container;
}

/**
 * A very lightweight Markdown-like parser.
 * Supports:
 * - #, ##, ### for headings
 * - Paragraphs separated by double newlines
 * - Simple unordered lists (starting with -)
 * - **bold** and [text](url) inline styles
 * - --- for horizontal rule
 */
function parseMarkdown(container: HTMLElement, md: string) {
	md.trim()
		.split(/\n\n+/)
		.map((block) => {
			const trimmed = block.trim();

			// Horizontal Rule
			if (trimmed === "---") {
				return document.createElement("hr");
			}

			// Headings
			if (trimmed.startsWith("### ")) {
				const h3 = document.createElement("h3");
				h3.innerText = trimmed.slice(4);
				return h3;
			}
			if (trimmed.startsWith("## ")) {
				const h2 = document.createElement("h2");
				h2.innerText = trimmed.slice(3);
				return h2;
			}
			if (trimmed.startsWith("# ")) {
				const h1 = document.createElement("h1");
				h1.innerText = trimmed.slice(2);
				return h1;
			}

			// Unordered Lists
			if (trimmed.startsWith("- ")) {
				const ul = document.createElement("ul");

				trimmed
					.split("\n")
					.map((line) => {
						const listLine = line.trim();
						if (listLine.startsWith("- ")) {
							const li = document.createElement("li");
							li.innerHTML = parseInline(listLine.slice(2).trim());
							return li;
						}
					})
					.forEach((li) => {
						if (li) ul.appendChild(li);
					});
				return ul;
			}

			// Default to Paragraph
			// We replace single newlines with spaces to allow wrapping in the source
			const p = document.createElement("p");
			p.innerHTML = parseInline(trimmed.replace(/\n/g, " "));

			return p;
		})
		.forEach((el) => container.append(el));
}

/**
 * Parses inline elements like bold text and links.
 */
function parseInline(text: string): string {
	return text
		.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
		.replace(
			/\[(.*?)\]\((.*?)\)/g,
			'<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
		);
}
