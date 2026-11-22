import { describe, expect, it } from "vitest";
import { findByUrl, prefillFromQuery } from "./prefill";
import { bookmark } from "../test/helpers";

describe("prefillFromQuery", () => {
	it("reads the bookmark from the add link", () => {
		expect(
			prefillFromQuery({
				url: " https://example.com/a ",
				title: "Example",
				description: "Notes",
				tags: "dev, ops,,",
			}),
		).toEqual({
			url: "https://example.com/a",
			title: "Example",
			description: "Notes",
			tags: ["dev", "ops"],
		});
	});

	it("leaves out what is missing and takes the first of repeated values", () => {
		expect(prefillFromQuery({ url: ["https://a.example", "https://b.example"] })).toEqual({
			url: "https://a.example",
			title: "",
			description: "",
			tags: [],
		});
	});
});

describe("findByUrl", () => {
	const saved = [
		bookmark(1, { url: "https://example.com/docs/" }),
		bookmark(2, { url: "https://Example.com/page#section" }),
	];

	it("ignores a trailing slash and the case of the host", () => {
		expect(findByUrl(saved, "https://EXAMPLE.com/docs")?.created).toBe(1);
	});

	it("tells different fragments apart", () => {
		expect(findByUrl(saved, "https://example.com/page#section")?.created).toBe(2);
		expect(findByUrl(saved, "https://example.com/page#other")).toBeUndefined();
	});

	it("finds nothing for a new address", () => {
		expect(findByUrl(saved, "https://example.com/new")).toBeUndefined();
	});
});
