// What each treehouse object shows when the camera moves in on it, built from the content
// collections. Mirrors tools/content.py (used by the no-Node preview) — keep the two in step.
import { getCollection, type CollectionEntry } from 'astro:content';
import data from '../data/treehouse.json';
import site from '../data/site.json';

// Which kind of panel each object opens. Objects not listed (lights, lamp, basket) act directly.
export const PANEL_KIND: Record<string, string> = {
  desk: 'stack', board: 'posts', pegboard: 'posts', cabinet: 'posts', hammock: 'posts', plants: 'posts',
  telescope: 'lab', birdhouse: 'friends', record: 'music',
  books: 'books', screen: 'screen', photos: 'photos',
  piano: 'piano', suitcase: 'places', flag: 'goals', owl: 'search',
  chime: 'subscribe', mailbox: 'guestbook', sign: 'about', blueprint: 'now',
};

const TEMPLATE: Record<string, string> = {
  posts: 'list', lab: 'list', friends: 'list', music: 'list',
  books: 'grid', screen: 'grid', photos: 'grid',
};

const LIST_FILE: Record<string, string> = {
  lab: 'lab', friends: 'friends', music: 'music', books: 'books', screen: 'screen', photos: 'photos',
  stack: 'stack', piano: 'piano', places: 'places', goals: 'goals', guestbook: 'guestbook', about: 'about', now: 'now',
};

// Objects whose panel is drawn as the object itself, though the content is the same kind as another's.
const SKIN: Record<string, string> = { board: 'chalk', cabinet: 'drawers', pegboard: 'pegs', hammock: 'diary', plants: 'pots' };

const PANEL_LIMIT = 5; // newest posts shown in a panel
// The blackboard pages through its articles, so it carries all of them.
const PANEL_ALL = new Set(['board']);

export type Post = {
  slug: string;
  title: string;
  date: Date;
  dateLabel: string;
  item?: string;
  topic?: string;
  tags: string[];
  summary: string;
  minutes: number;
  sample: boolean;
  href: string;
  entry: CollectionEntry<'posts'>;
};

export function dateLabel(d: Date): string {
  return `${d.getUTCMonth() + 1} 月 ${d.getUTCDate()} 日`;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function readMinutes(text: string): number {
  const plain = text.replace(/```[\s\S]*?```/g, '').replace(/\s/g, '');
  return Math.max(1, Math.ceil(plain.length / 400));
}

let postsCache: Post[] | null = null;

export async function loadPosts(): Promise<Post[]> {
  if (postsCache) return postsCache;
  const entries = await getCollection('posts', (e) => !e.data.draft);
  postsCache = entries
    .map((e) => ({
      slug: e.id,
      title: e.data.title,
      date: e.data.date,
      dateLabel: dateLabel(e.data.date),
      item: e.data.item,
      topic: e.data.topic,
      tags: e.data.tags,
      summary: e.data.summary,
      minutes: readMinutes(e.body ?? ''),
      sample: e.data.sample,
      href: `/posts/${e.id}`,
      entry: e,
    }))
    .sort((a, b) => b.date.valueOf() - a.date.valueOf() || a.slug.localeCompare(b.slug));
  return postsCache;
}

// YAML dates arrive as Date objects: turn them into text plus a "10 月 17 日" label.
function normalize(obj: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v instanceof Date) {
      out[k] = isoDate(v);
      out[k + 'Label'] = dateLabel(v);
    } else if (k === 'items' && Array.isArray(v)) {
      out[k] = v.map((it) => (it && typeof it === 'object' && !Array.isArray(it) ? normalize(it) : it));
    } else {
      out[k] = v;
    }
  }
  return out;
}

export function postCard(p: Post) {
  return { title: p.title, href: p.href, slug: p.slug, date: isoDate(p.date), dateLabel: p.dateLabel, minutes: p.minutes, tags: p.tags, summary: p.summary, topic: p.topic };
}

export function searchIndex(posts: Post[]) {
  return posts.map((p) => ({ title: p.title, href: p.href, tags: p.tags, dateLabel: p.dateLabel }));
}

/** Panels for the home page (newest few posts each) or, with full, for an object's own page. */
export async function buildPanels(full = false) {
  const posts = await loadPosts();
  const lists = await getCollection('lists');
  const panels: Record<string, Record<string, any>> = {};
  for (const it of data.items as { id: string; section: string; href: string | null }[]) {
    const kind = PANEL_KIND[it.id];
    if (!kind) continue;
    const panel: Record<string, any> = { kind, template: TEMPLATE[kind] ?? 'widget', sample: false, more: null };
    if (kind === 'posts') {
      const mine = posts.filter((p) => p.item === it.id);
      panel.items = (full || PANEL_ALL.has(it.id) ? mine : mine.slice(0, PANEL_LIMIT)).map(postCard);
      panel.count = mine.length;
      panel.sample = mine.some((p) => p.sample);
      if (it.href) panel.more = { label: `全部 ${mine.length} 篇`, href: it.href };
    } else if (kind === 'search') {
      panel.sample = posts.some((p) => p.sample);
    } else if (kind === 'subscribe') {
      panel.rss = site.url.replace(/\/$/, '') + '/rss.xml';
    } else {
      const entry = lists.find((l) => l.id === LIST_FILE[kind]);
      const d = normalize((entry?.data as Record<string, any>) ?? {});
      panel.sample = Boolean(d.sample);
      delete d.sample;
      Object.assign(panel, d);
    }
    if (kind !== 'posts' && kind !== 'search' && kind !== 'subscribe' && it.href) {
      panel.more = { label: `进入「${it.section}」`, href: it.href };
    }
    if (SKIN[it.id]) panel.skin = SKIN[it.id];
    panels[it.id] = panel;
  }
  return { panels, posts };
}

/** One YAML list from src/content/lists/, with dates turned into text + labels. */
export async function loadList(name: string): Promise<Record<string, any>> {
  const lists = await getCollection('lists');
  const entry = lists.find((l) => l.id === name);
  return normalize((entry?.data as Record<string, any>) ?? {});
}

export { LIST_FILE };

/** The JSON a section page hands to treehouse.js so it can draw an object at full size. */
export async function pageData(ids: string[]) {
  const { panels, posts } = await buildPanels(true);
  const mine: Record<string, unknown> = {};
  for (const id of ids) if (panels[id]) mine[id] = panels[id];
  return JSON.stringify({ scene: data.scene, items: data.items, panels: mine, posts: searchIndex(posts) }).replace(/</g, '\\u003c');
}

/** Tags in a set of posts, most used first. */
export function tagCounts(posts: Post[]): [string, number][] {
  const m = new Map<string, number>();
  for (const p of posts) for (const t of p.tags) m.set(t, (m.get(t) ?? 0) + 1);
  return [...m].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh'));
}

/** URL-safe address for a tag page. */
export function tagHref(tag: string): string {
  return `/tags/${encodeURIComponent(tag)}`;
}
