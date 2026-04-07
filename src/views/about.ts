import { t } from "../i18n";
import p from "../../package.json";

export function renderAboutView(): HTMLElement {
	const container = document.createElement("div");
	container.classList.add("about-view", "card");

	const content = `
# ${t("about.title")}

A simple, private, and encrypted bookmark manager. This app is designed to be lightweight, offline-first, and secure.

## Features

- **End-to-End Encryption**: Your data is encrypted in your browser using your sync credentials. Nobody else can read your bookmarks.
- **Offline Access**: Works without an internet connection as a Progressive Web App (PWA).
- **Fast & Minimal**: No bloat, no tracking, just your bookmarks.

## Usage Tips

- **Tags**: Use tags to categorize your bookmarks. You can filter by tags in the main view or the dedicated Tags tab.
- **Sync**: Set up a sync URL and credentials in Settings to keep your bookmarks backed up and synced across devices.
- **PWA**: Install this app on your home screen or desktop for a native-like experience.

## Privacy and GDPR

This app is built with privacy in mind. All data is stored locally in your browser and encrypted with your sync credentials on the server. We do not collect any personal data or analytics.

If you don't enable sync, no data will ever leave your device. Even with sync enabled, your data is encrypted before it leaves your browser, so we have no access to it.

If you have any GDPR-related questions or requests, please contact us at [bookmarks@foonly.dev](mailto:bookmarks@foonly.dev)

## Open Source

This project is open-source and respects your privacy. You can find the source code and contribute on GitHub.

[Bookmarks on GitHub](https://github.com/foonly/bookmarks)

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
 */
function parseMarkdown(container: HTMLElement, md: string) {
	md.trim()
		.split(/\n\n+/)
		.map((block) => {
			const trimmed = block.trim();

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
						if (line.startsWith("- ")) {
							const li = document.createElement("li");
							li.innerHTML = parseInline(line.slice(2).trim());
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
