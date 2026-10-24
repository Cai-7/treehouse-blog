// RSS feed for the wind chime ("订阅"): /rss.xml. Written by hand so it needs no extra package.
import type { APIRoute } from 'astro';
import site from '../data/site.json';
import { loadPosts } from '../lib/content';

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const GET: APIRoute = async (context) => {
  const base = (context.site?.toString() ?? site.url).replace(/\/$/, '');
  const posts = (await loadPosts()).filter((p) => !p.sample);
  const items = posts
    .slice(0, 30)
    .map(
      (p) => `    <item>
      <title>${esc(p.title)}</title>
      <link>${base}${p.href}</link>
      <guid>${base}${p.href}</guid>
      <pubDate>${p.date.toUTCString()}</pubDate>
      <description>${esc(p.summary)}</description>
${p.tags.map((t) => `      <category>${esc(t)}</category>`).join('\n')}
    </item>`,
    )
    .join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${esc(site.name)}</title>
    <link>${base}/</link>
    <description>${esc(site.description)}</description>
    <language>zh-CN</language>
${items}
  </channel>
</rss>
`;
  return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
};
