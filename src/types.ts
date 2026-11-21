import { z } from "zod";

export const bookmarkSchema = z.object({
	title: z.string().default(""),
	// Only http(s): other schemes such as javascript: or data: would run code
	// when the link is clicked.
	url: z.url({ protocol: /^https?$/ }),
	description: z.string().default(""),
	tags: z.array(z.string()).default([]),

	created: z.number().default(0),
	modified: z.number().default(0),
	deleted: z.boolean().default(false),
	clicks: z.number().default(0),
});

export type Bookmark = z.infer<typeof bookmarkSchema>;

/**
 * Validates bookmarks one at a time and drops only the invalid ones, so a
 * single bad record does not make the whole store fail to parse.
 */
const bookmarkListSchema = z
	.array(z.unknown())
	.default([])
	.transform((items) => {
		const valid: Bookmark[] = [];
		for (const item of items) {
			const result = bookmarkSchema.safeParse(item);
			if (result.success) {
				valid.push(result.data);
			} else {
				console.warn("Dropping invalid bookmark", item, result.error.issues);
			}
		}
		return valid;
	});

export const storageSchema = z.object({
	favoriteTags: z.array(z.string()).default([]),
	favoriteTagsMetadata: z.record(z.string(), z.number()).default({}),
	failedFavicons: z.array(z.string()).default([]),
	bookmarks: bookmarkListSchema,
	language: z.string().optional(),
	fetchFavicons: z.boolean().default(false),
	syncSettings: z
		.object({
			enabled: z.boolean().default(false),
			credentials: z.string().default(""), // format: "id:enc_key:sign_secret"
			lastSynced: z.number().default(0),
		})
		.default({
			enabled: false,
			credentials: "",
			lastSynced: 0,
		}),
});

export type Storage = z.infer<typeof storageSchema>;
