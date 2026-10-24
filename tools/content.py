"""Read the blog's content (src/content/) and build what each treehouse object shows when you zoom in.

Used by the no-Node preview (tools/build_preview.py). The Astro build reads the same files through
content collections, so both show the same thing.
"""
import math
import re
from datetime import date
from pathlib import Path

import markdown
import yaml

ROOT = Path(__file__).resolve().parent.parent
CONTENT = ROOT / "src/content"

# Which kind of panel each object opens. Objects not listed here (lights, lamp, basket) act directly.
PANEL_KIND = {
    "desk": "stack", "board": "posts", "pegboard": "posts", "cabinet": "posts",
    "hammock": "posts", "plants": "posts",
    "telescope": "lab", "birdhouse": "friends", "record": "music",
    "books": "books", "screen": "screen", "photos": "photos",
    "piano": "piano", "suitcase": "places", "flag": "goals", "owl": "search",
    "chime": "subscribe", "mailbox": "guestbook", "sign": "about", "blueprint": "now",
}

TEMPLATE = {
    "posts": "list", "lab": "list", "friends": "list", "music": "list",
    "books": "grid", "screen": "grid", "photos": "grid",
}  # everything else is a widget

LIST_FILE = {
    "stack": "stack", "lab": "lab", "friends": "friends", "music": "music", "books": "books", "screen": "screen",
    "photos": "photos", "piano": "piano", "places": "places", "goals": "goals",
    "guestbook": "guestbook", "about": "about", "now": "now",
}

# Objects whose panel is drawn as the object itself, though the content is the same kind as another's.
SKIN = {"board": "chalk", "cabinet": "drawers", "pegboard": "pegs", "hammock": "diary", "plants": "pots"}

PANEL_LIMIT = 5  # newest posts shown in a panel
PANEL_ALL = {"board"}  # the blackboard pages through all its articles


def date_label(d):
    return f"{d.month} 月 {d.day} 日"


def read_minutes(text):
    text = re.sub(r"```.*?```", "", text, flags=re.S)
    return max(1, math.ceil(len(re.sub(r"\s", "", text)) / 400))


def load_posts():
    posts = []
    for path in sorted((CONTENT / "posts").glob("*.md*")):
        raw = path.read_text(encoding="utf-8")
        m = re.match(r"^---\n(.*?)\n---\n(.*)$", raw, re.S)
        if not m:
            continue
        fm = yaml.safe_load(m.group(1)) or {}
        if fm.get("draft"):
            continue
        body = m.group(2).strip()
        d = fm["date"] if isinstance(fm["date"], date) else date.fromisoformat(str(fm["date"]))
        slug = path.stem
        posts.append({
            "slug": slug,
            "title": fm["title"],
            "date": d.isoformat(),
            "dateLabel": date_label(d),
            "item": fm.get("item"),
            "topic": fm.get("topic"),
            "tags": fm.get("tags", []),
            "summary": fm.get("summary", ""),
            "minutes": read_minutes(body),
            "sample": bool(fm.get("sample")),
            "href": f"/posts/{slug}",
            "html": markdown.markdown(body, extensions=["fenced_code", "tables"]),
        })
    posts.sort(key=lambda p: p["date"], reverse=True)
    return posts


def load_list(name):
    path = CONTENT / "lists" / f"{name}.yaml"
    if not path.exists():
        return {}
    data = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    for k, v in list(data.items()):
        if isinstance(v, date):
            data[k] = v.isoformat()
            data[k + "Label"] = date_label(v)
    for it in data.get("items", []) or []:
        if isinstance(it, dict):
            for k, v in list(it.items()):
                if isinstance(v, date):
                    it[k] = v.isoformat()
                    it[k + "Label"] = date_label(v)

    # anything deeper (history of goals / now) only needs to be text
    def deep(v):
        if isinstance(v, date):
            return v.isoformat()
        if isinstance(v, dict):
            return {k: deep(x) for k, x in v.items()}
        if isinstance(v, list):
            return [deep(x) for x in v]
        return v

    return deep(data)


def post_card(p):
    return {k: p.get(k) for k in ("title", "href", "slug", "date", "dateLabel", "minutes", "tags", "summary", "topic")}


def build_panels(items, site):
    """items: the treehouse items (id, section, href...). Returns {item_id: panel}."""
    posts = load_posts()
    panels = {}
    for it in items:
        kind = PANEL_KIND.get(it["id"])
        if not kind:
            continue
        panel = {"kind": kind, "template": TEMPLATE.get(kind, "widget"), "sample": False, "more": None}
        if kind == "posts":
            mine = [p for p in posts if p["item"] == it["id"]]
            panel["items"] = [post_card(p) for p in (mine if it["id"] in PANEL_ALL else mine[:PANEL_LIMIT])]
            panel["count"] = len(mine)
            panel["sample"] = any(p["sample"] for p in mine)
            if it.get("href"):
                panel["more"] = {"label": f"全部 {len(mine)} 篇", "href": it["href"]}
        elif kind == "search":
            panel["sample"] = any(p["sample"] for p in posts)
        elif kind == "subscribe":
            panel["rss"] = site["url"].rstrip("/") + "/rss.xml"
        else:
            data = load_list(LIST_FILE[kind])
            panel["sample"] = bool(data.pop("sample", False))
            panel.update(data)
        if kind not in ("posts",) and it.get("href") and kind not in ("search", "subscribe"):
            panel["more"] = {"label": f"进入「{it['section']}」", "href": it["href"]}
        if it["id"] in SKIN:
            panel["skin"] = SKIN[it["id"]]
        panels[it["id"]] = panel
    return panels, posts


def search_index(posts):
    return [{"title": p["title"], "href": p["href"], "tags": p["tags"], "dateLabel": p["dateLabel"]} for p in posts]
