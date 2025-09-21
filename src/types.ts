import { z } from "zod";

export const bookmarkSchema = z.object({
  title: z.string().nullish(),
  url: z.url(),
  description: z.string().nullish(),
  tags: z.array(z.string()).default([]),
  createdAt: z.date().default(new Date()),
  modifiedAt: z.date().default(new Date()),
});

export type Bookmark = z.infer<typeof bookmarkSchema>;

export const storageSchema = z.object({
  testing: z.string().default(""),
  counter: z.number().default(0),
  bookmarks: z.array(bookmarkSchema).default([]),
});

export type Storage = z.infer<typeof storageSchema>;
