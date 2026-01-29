import { z } from 'zod';
import { RecordID_z } from '../core';

export const PostIDSubId_z = z.string();

export const PostID_z = RecordID_z.extend({
  tb: z.literal('p'),
  id: PostIDSubId_z,
});
export type PostIDSubId = z.infer<typeof PostIDSubId_z>;
export type PostID = z.infer<typeof PostID_z>;

export const Z_Post = z.object({
  id: PostID_z.optional(),
  contentTable: z.string().optional(),
  contentId: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  publishedAt: z.string().optional(),
  title: z.string().optional(),
  permalink: z.string().optional(),
  status: z.enum(["draft", "publish"]).optional(),
});

export type Post = z.infer<typeof Z_Post>;
