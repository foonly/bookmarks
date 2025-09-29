import { z } from "zod";

export const bookmarkSchema = z.object({
  title: z.string().default(""),
  url: z.url(),
  description: z.string().default(""),
  tags: z.array(z.string()).default([]),
  created: z.number().default(0),
  modified: z.number().default(0),
});

export type Bookmark = z.infer<typeof bookmarkSchema>;

export const storageSchema = z.object({
  testing: z.string().default(""),
  favoriteTags: z.array(z.string()).default([]),
  bookmarks: z.array(bookmarkSchema).default([]),
});

export type Storage = z.infer<typeof storageSchema>;
