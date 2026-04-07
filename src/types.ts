import { z } from "zod";

export const bookmarkSchema = z.object({
	title: z.string().default(""),
	url: z.url(),
	description: z.string().default(""),
	tags: z.array(z.string()).default([]),
	created: z.number().default(0),
	modified: z.number().default(0),
	deleted: z.boolean().default(false),
});

export type Bookmark = z.infer<typeof bookmarkSchema>;

export const storageSchema = z.object({
	favoriteTags: z.array(z.string()).default([]),
	bookmarks: z.array(bookmarkSchema).default([]),
	sync: z
		.object({
			enabled: z.boolean().default(false),
			credentials: z.string().default(""), // format: "id:secret"
			lastSynced: z.number().default(0),
		})
		.default({}),
});

export type Storage = z.infer<typeof storageSchema>;
