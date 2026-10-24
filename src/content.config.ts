// Content collections: articles (src/content/posts/*.md) and the small lists behind some objects
// (src/content/lists/*.yaml — books, songs, goals…). See README for how to add to them.
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const posts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/posts' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    // Which treehouse object the article belongs to: desk, board, pegboard, cabinet, hammock, plants…
    item: z.string().optional(),
    // Only for the blackboard (技术文章): frontend or ml, used by the page's filter.
    topic: z.string().optional(),
    tags: z.array(z.string()).default([]),
    summary: z.string().default(''),
    sample: z.boolean().default(false),
    draft: z.boolean().default(false),
  }),
});

// Each YAML file is one entry; its shape depends on the object (see the comment at the top of each file).
const lists = defineCollection({
  loader: glob({ pattern: '*.{yaml,yml}', base: './src/content/lists' }),
});

export const collections = { posts, lists };
