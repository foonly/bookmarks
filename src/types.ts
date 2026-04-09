import { z } from "zod";

export const bookmarkSchema = z.object({
	title: z.string().default(""),
	url: z.url(),
	description: z.string().default(""),
	tags: z.array(z.string()).default([]),

	created: z.number().default(0),
	modified: z.number().default(0),
	deleted: z.boolean().default(false),
	clicks: z.number().default(0),
});

export type Bookmark = z.infer<typeof bookmarkSchema>;

export const storageSchema = z.object({
	favoriteTags: z.array(z.string()).default([]),
	favoriteTagsMetadata: z.record(z.string(), z.number()).default({}),
	failedFavicons: z.array(z.string()).default([]),
	bookmarks: z.array(bookmarkSchema).default([]),
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
