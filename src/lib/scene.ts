// Small helpers about the treehouse drawing, shared by pages. Mirrors tools/render.py.
import data from '../data/treehouse.json';

export const SW: number = data.scene.w;
export const SH: number = data.scene.h;

type Item = { id: string; name: string; section: string; kicker: string; desc: string; href: string | null };
export const ITEMS: Record<string, Item> = Object.fromEntries((data.items as Item[]).map((it) => [it.id, it]));

// Directory group of each object: "技术 · 楼下工作坊", "生活 · 楼上起居室", …
export const GROUP_OF: Record<string, string> = {};
for (const g of data.directory as { title: string; links: [string, string | null][] }[]) {
  for (const [, target] of g.links) if (target && !GROUP_OF[target]) GROUP_OF[target] = g.title;
}
export const TECH = (data.directory[0].links as [string, string | null][]).map(([, t]) => t).filter(Boolean) as string[];
export const LIFE = (data.directory[1].links as [string, string | null][]).map(([, t]) => t).filter(Boolean) as string[];

/** First layer of an object, in drawing pixels: [x, y, w, h]. */
export function itemPx(id: string): [number, number, number, number] | null {
  const L = (data.layers as { item: string; box: number[] }[]).find((l) => l.item === id);
  if (!L) return null;
  const [x, y, w, h] = L.box;
  return [(x / 100) * SW, (y / 100) * SH, (w / 100) * SW, (h / 100) * SH];
}

/** CSS for a strip of the drawing centred on an object (page header). */
export function bannerStyle(id: string, cw = 620, ch = 190): string | null {
  const px = itemPx(id);
  if (!px) return null;
  const [x, y, w, h] = px;
  const x0 = Math.min(Math.max(0, x + w / 2 - cw / 2), SW - cw);
  const y0 = Math.min(Math.max(0, y + h / 2 - ch / 2), SH - ch);
  return (
    `--img-day:url(/treehouse/day.webp);--img-night:url(/treehouse/night.webp);` +
    `background-size:${((SW / cw) * 100).toFixed(2)}% auto;` +
    `background-position:${((x0 / (SW - cw)) * 100).toFixed(2)}% ${((y0 / (SH - ch)) * 100).toFixed(2)}%`
  );
}

type Layer = { key: string; item: string; box: number[]; cut: boolean };
const LAYERS = data.layers as Layer[];

/** The cut-out image of an object (its first layer), for page headers. */
export function cutOf(id: string): { day: string; night: string; ratio: number } | null {
  const L = LAYERS.find((l) => l.item === id && l.cut);
  if (!L) return null;
  return {
    day: `/treehouse/cut/day/${L.key}.webp`,
    night: `/treehouse/cut/night/${L.key}.webp`,
    ratio: ((L.box[2] / 100) * SW) / ((L.box[3] / 100) * SH),
  };
}

type Group = { title: string; links: [string, string | null][] };
const GROUPS = data.directory as Group[];

/** Previous and next object in the same directory group (wraps around). */
export function neighboursOf(id: string): { prev: Item | null; next: Item | null } {
  const g = GROUPS.find((gr) => gr.links.some(([, t]) => t === id));
  if (!g) return { prev: null, next: null };
  const ids = g.links.map(([, t]) => t).filter((t): t is string => !!t && !!ITEMS[t]?.href);
  const i = ids.indexOf(id);
  if (i < 0 || ids.length < 2) return { prev: null, next: null };
  return { prev: ITEMS[ids[(i - 1 + ids.length) % ids.length]], next: ITEMS[ids[(i + 1) % ids.length]] };
}

/** Banner style for a whole floor (技术 = workshop, 生活 = living room). */
export function floorBanner(floor: 'workshop' | 'living' | 'canopy' | 'ground'): string {
  const f = (data.floors as { id: string; box: number[] }[]).find((x) => x.id === floor)!;
  const [x0, y0, x1, y1] = f.box;
  const cw = x1 - x0;
  const ch = Math.round((cw * 190) / 620);
  const cy = Math.max(0, Math.min(SH - ch, (y0 + y1) / 2 - ch / 2));
  return (
    `--img-day:url(/treehouse/day.webp);--img-night:url(/treehouse/night.webp);` +
    `background-size:${((SW / cw) * 100).toFixed(2)}% auto;` +
    `background-position:${((x0 / (SW - cw)) * 100).toFixed(2)}% ${((cy / (SH - ch)) * 100).toFixed(2)}%`
  );
}

type FloorId = 'workshop' | 'living' | 'canopy' | 'ground';
const FLOORS = data.floors as { id: FloorId; label: string; box: number[] }[];

/** Where a page sits in the drawing, for the little treehouse in the corner: centre in % of the drawing,
 *  plus background offsets for the round close-up shown on phones. */
export function locate(here?: string): { x: number; y: number; name: string; href: string; bx: number; by: number } | null {
  if (!here) return null;
  let cx: number, cy: number, name: string, href: string;
  const f = FLOORS.find((fl) => fl.id === here);
  if (f) {
    cx = (f.box[0] + f.box[2]) / 2;
    cy = (f.box[1] + f.box[3]) / 2;
    name = f.label;
    href = '/';
  } else {
    const px = itemPx(here);
    const it = ITEMS[here];
    if (!px || !it) return null;
    cx = px[0] + px[2] / 2;
    cy = px[1] + px[3] / 2;
    name = it.name;
    href = `/#${it.id}`;
  }
  const fx = cx / SW;
  const fy = cy / SH;
  const Z = 5; // close-up: the drawing at 5x the circle's width
  const ry = (Z * SH) / SW; // drawing height in circle widths
  const clamp = (v: number) => Math.min(100, Math.max(0, v * 100));
  return {
    x: +(fx * 100).toFixed(2),
    y: +(fy * 100).toFixed(2),
    name,
    href,
    bx: +clamp((Z * fx - 0.5) / (Z - 1)).toFixed(2),
    by: +clamp((ry * fy - 0.5) / (ry - 1)).toFixed(2),
  };
}

/** Background for a wide header window onto the drawing: the object (or floor) sits right of centre,
 *  leaving the left side for the title. `aspect` is the window's width / height on wide screens. */
export function sceneWindow(target: { item?: string; floor?: FloorId }, aspect = 3.4): { style: string; flip: boolean } | null {
  let box: [number, number, number, number];
  let cw: number;
  let at = 0.7; // where the object's centre lands across the window
  if (target.item) {
    const px = itemPx(target.item);
    if (!px) return null;
    box = px;
    cw = Math.max(px[2] * 3.6, px[3] * aspect * 1.7, 440);
  } else if (target.floor) {
    const f = FLOORS.find((fl) => fl.id === target.floor);
    if (!f) return null;
    box = [f.box[0], f.box[1], f.box[2] - f.box[0], f.box[3] - f.box[1]];
    cw = box[2] * 1.25;
    at = 0.62;
  } else return null;
  cw = Math.min(SW, cw);
  const ch = Math.min(SH, cw / aspect);
  const cx = box[0] + box[2] / 2;
  const cy = box[1] + box[3] / 2;
  // an object near the left edge can't sit right of centre: put it on the left, the title on the right
  const flip = cx - cw * at < 0;
  if (flip) at = 1 - at;
  const x0 = Math.min(Math.max(0, cx - cw * at), SW - cw);
  const y0 = Math.min(Math.max(0, cy - ch / 2), SH - ch);
  const px = SW - cw > 0 ? (x0 / (SW - cw)) * 100 : 50;
  const py = SH - ch > 0 ? (y0 / (SH - ch)) * 100 : 50;
  const style =
    `--img-day:url(/treehouse/day.webp);--img-night:url(/treehouse/night.webp);` +
    `--win-size:${((SW / cw) * 100).toFixed(2)}% auto;--win-pos:${px.toFixed(2)}% ${py.toFixed(2)}%;` +
    `--ox:${(((cx - x0) / cw) * 100).toFixed(1)}%;--oy:${(((cy - y0) / ch) * 100).toFixed(1)}%`;
  return { style, flip };
}
