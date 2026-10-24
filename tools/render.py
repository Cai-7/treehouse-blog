"""Shared HTML rendering for the treehouse home page.

The Astro components render the same markup from src/data/treehouse.json and src/content/; this module
exists so the page can also be built as a single static file (tools/build_preview.py) without Node.
"""
import html
import json
from pathlib import Path

from content import build_panels, search_index

ROOT = Path(__file__).resolve().parent.parent
DATA = json.loads((ROOT / "src/data/treehouse.json").read_text())
SITE = json.loads((ROOT / "src/data/site.json").read_text())
SW, SH = DATA["scene"]["w"], DATA["scene"]["h"]
ITEMS = {it["id"]: it for it in DATA["items"]}

E = html.escape

SUN = ('<svg class="i-sun" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.2" fill="none" '
       'stroke="currentColor" stroke-width="2"/><path d="M12 2.5v2.6M12 18.9v2.6M2.5 12h2.6M18.9 12h2.6M5.3 5.3l1.8 1.8'
       'M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8" stroke="currentColor" stroke-width="2" '
       'stroke-linecap="round"/></svg>')
MOON = ('<svg class="i-moon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.6A8.3 8.3 0 0 1 9.4 4a8.3 8.3 0 1 0 '
        '10.6 10.6z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>')
CLOSE = ('<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" '
         'stroke-width="2.4" stroke-linecap="round"/></svg>')
NOTE = ('<svg class="th-note" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18.2a3 3 0 1 1-2-2.8V5.2l11-2.1v11'
        'a3 3 0 1 1-2-2.8V6.6l-7 1.4z" fill="currentColor"/></svg>')

CODE_WIDTHS = [72, 46, 84, 30, 62, 90, 40, 76, 55, 34]
CODE_INDENT = [0, 10, 10, 20, 10, 0, 10, 20, 10, 0]

# Monitor screens (scene px, slightly inset from the bezel) and the desk layer box.
SCREENS = [(302, 929, 61, 40), (376, 928, 59, 40)]

# Directory groups: tech = first group, life = second.
GROUP_OF = {}
for g in DATA["directory"]:
    for _label, target in g["links"]:
        if target:
            GROUP_OF.setdefault(target, g["title"])
TECH = [t for _l, t in DATA["directory"][0]["links"] if t]
LIFE = [t for _l, t in DATA["directory"][1]["links"] if t]


def layer_box(key):
    for L in DATA["layers"]:
        if L["key"] == key:
            return L
    raise KeyError(key)


def item_px(item_id):
    """First layer of an item, in scene pixels: x, y, w, h."""
    for L in DATA["layers"]:
        if L["item"] == item_id:
            x, y, w, h = L["box"]
            return x / 100 * SW, y / 100 * SH, w / 100 * SW, h / 100 * SH
    raise KeyError(item_id)


def pct(v, total):
    return round(v / total * 100, 2)


def screens_html():
    bx, by, bw, bh = layer_box("desk")["box"]
    dx, dy, dw, dh = bx / 100 * SW, by / 100 * SH, bw / 100 * SW, bh / 100 * SH
    out = []
    for i, (x, y, w, h) in enumerate(SCREENS):
        lines = "".join(
            f'<span style="width:{wd}%;margin-left:{ind}%"></span>'
            for wd, ind in list(zip(CODE_WIDTHS, CODE_INDENT)) * 2
        )
        cls = "th-screen is-second" if i else "th-screen"
        out.append(
            f'<div class="{cls}" style="left:{pct(x - dx, dw)}%;top:{pct(y - dy, dh)}%;'
            f'width:{pct(w, dw)}%;height:{pct(h, dh)}%"><div class="th-code">{lines}</div></div>'
        )
    return "".join(out)


def fx_html(L):
    key, extra = L["key"], L.get("extra")
    if key == "lights":
        bulbs = "".join(
            f'<span class="th-bulb" style="left:{b["x"]}%;top:{b["y"]}%;--col:{b["col"]}"></span>' for b in DATA["bulbs"]
        )
        lines = "".join(
            f'<line x1="{k["x1"]}" y1="{k["y1"]}" x2="{k["x2"]}" y2="{k["y2"]}" pathLength="100" style="--col:{k["col"]}"/>'
            for k in DATA["links"]
        )
        return (f'<svg class="th-nn" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">{lines}</svg>'
                + bulbs)
    if extra == "desk":
        return screens_html()
    if extra == "owl":
        return ('<span class="th-eye" style="left:27.27%;top:27.03%"><span class="th-lid"></span></span>'
                '<span class="th-eye" style="left:50.91%;top:27.03%"><span class="th-lid"></span></span>')
    if extra == "lamp":
        return '<span class="th-glow"></span>'
    if extra == "record":
        return NOTE * 3
    if extra == "sign":
        return f'<span class="th-sign-text">{E(SITE["name"])}</span>'
    return ""


def layers_html(img_base):
    out = []
    for L in DATA["layers"]:
        x, y, w, h = L["box"]
        style = f'left:{x}%;top:{y}%;width:{w}%;height:{h}%;--o:{L["origin"]};--sc:{L["scale"]}'
        cls = "th-layer" if L["cut"] else "th-layer no-lift"
        parts = [f'<div class="{cls}" data-key="{L["key"]}" data-item="{L["item"]}" style="{style}">']
        if L["cut"]:
            for mode in ("day", "night"):
                parts.append(
                    f'<img class="th-cut th-cut-{mode}" src="{img_base}cut/{mode}/{L["key"]}.webp" alt="" '
                    f'decoding="async" draggable="false">'
                )
        parts.append(fx_html(L))
        hit_style = ""
        if L.get("hit"):
            hl, ht, hw, hh = L["hit"]
            hit_style = f' style="inset:auto;left:{hl}%;top:{ht}%;width:{hw}%;height:{hh}%"'
        tip_cls = "th-tip below" if L["tip"] == "below" else "th-tip"
        parts.append(
            f'<button class="th-hit" type="button" data-item="{L["item"]}" aria-label="{E(L["label"])}" '
            f'aria-controls="th-card" aria-expanded="false"{hit_style}>'
            f'<span class="{tip_cls}" aria-hidden="true">{E(L["name"])}</span></button>'
        )
        parts.append("</div>")
        out.append("".join(parts))
    return "\n".join(out)


def stars_html():
    out = []
    for i, s in enumerate(DATA["stars"]):
        d = -((i * 0.73) % 3.1)
        t = 2.6 + (i * 0.37) % 1.6
        out.append(f'<span class="th-star" style="left:{s["x"]}%;top:{s["y"]}%;--d:{d:.2f}s;--t:{t:.2f}s" aria-hidden="true"></span>')
    return "".join(out)


MAP_ICON = ('<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 6.5l5.5-2.5 6 2.5 5.5-2.5v13.5l-5.5 2.5-6-2.5-5.5 2.5z '
            'M9 4v13.5 M15 6.5V20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"></path></svg>')


def header_html(href):
    nav = "".join(f'<a class="tag" href="{href(u)}">{E(t)}</a>' for t, u in DATA["nav"])
    return (
        '<header class="site-header"><div class="branch" aria-hidden="true"></div><div class="hdr wrap">'
        f'<a class="brand" href="{href("/")}" aria-label="{E(SITE["name"])} · 回到树屋"><span class="brand-board">{E(SITE["name"])}</span></a>'
        f'<nav class="site-nav" aria-label="主导航">{nav}</nav>'
        '<div class="hdr-tools">'
        f'<button class="hdr-btn map-open" type="button" data-map-open aria-controls="th-map" aria-expanded="false">{MAP_ICON}<span>树屋地图</span></button>'
        '<div class="sky-menu">'
        f'<button class="hdr-btn sky-open mode-toggle" type="button" data-sky-open aria-expanded="false" aria-controls="sky-pop" aria-label="天色">{SUN}{MOON}</button>'
        '<div class="sky-pop" id="sky-pop" role="group" aria-label="天色" hidden><p class="sky-pop-title">天色</p>'
        '<button type="button" data-mode-set="auto" aria-pressed="true">跟随当地时间</button>'
        '<button type="button" data-mode-set="day" aria-pressed="false">白天</button>'
        '<button type="button" data-mode-set="night" aria-pressed="false">夜晚</button></div>'
        "</div></div></div></header>"
    )


def map_html(href):
    """The treehouse map drawer (Base.astro)."""
    groups = []
    for g in DATA["directory"]:
        links = []
        for label, target in g["links"]:
            if target:
                url = DATA["hrefs"][target]
                links.append(f'<a href="{href(url)}" data-th-target="{target}">{E(label)}</a>')
            else:
                links.append(f'<a href="{href("/archive")}">{E(label)}</a>')
        groups.append(f'<div class="th-map-group"><h3>{E(g["title"])}</h3><div class="th-map-links">{"".join(links)}</div></div>')
    main = f'<a href="{href("/")}">回到树屋</a>' + "".join(f'<a href="{href(u)}">{E(t)}</a>' for t, u in DATA["nav"])
    return (
        '<div class="th-map" id="th-map" hidden><div class="th-map-backdrop" data-map-close></div>'
        '<section class="th-map-sheet" role="dialog" aria-modal="true" aria-labelledby="th-map-title">'
        f'<div class="th-map-head"><h2 id="th-map-title">树屋地图</h2><button class="th-map-close" type="button" data-map-close aria-label="关上地图">{CLOSE}</button></div>'
        f'<nav class="th-map-main" aria-label="主要入口">{main}</nav>'
        + "".join(groups)
        + '<p class="th-map-foot"><a href="#">RSS 订阅</a></p>'
        "</section></div>"
    )


GROUND_SVG = (
    '<div class="ground" aria-hidden="true"><svg viewBox="0 0 1440 120" preserveAspectRatio="none">'
    '<path class="g-far" d="M0 70 C120 40 220 52 330 62 C450 74 520 34 650 40 C790 47 860 74 990 64 C1110 55 1190 30 1300 42 C1370 50 1410 58 1440 56 V120 H0z"></path>'
    '<path class="g-near" d="M0 92 C140 78 260 84 380 90 C520 97 640 80 780 82 C930 84 1040 98 1180 92 C1300 87 1380 80 1440 84 V120 H0z"></path>'
    "</svg></div>"
)

FOOTER_HTML = (
    f'<footer class="site-footer">{GROUND_SVG}<div class="ft wrap">'
    '<nav class="ft-links" aria-label="页脚"><a href="#">回到树屋</a>'
    '<button type="button" data-map-open aria-controls="th-map">树屋地图</button>'
    f'<a href="#sec-about">关于{E(SITE["name"])}</a></nav>'
    f'<p class="ft-credit">© 2026 {E(SITE["name"])} · 英文字体 testType 01，设计：Xiaoyuan Gao / '
    '<a href="https://www.notyourtype.nl" rel="noopener">notyourtypefoundry</a></p>'
    "</div></footer>"
)

FLOOR_TEXT = {
    "canopy": ("树冠", "望远镜和小红旗：实验室、年度目标", "/lab", "实验室"),
    "living": ("楼上 · 起居室", "生活：读书、音乐、弹琴、旅行、随笔", "/life", "生活"),
    "workshop": ("楼下 · 工作坊", "技术：技术栈、技术文章、踩坑、复盘", "/tech", "技术"),
    "ground": ("树下", "木牌和信箱：关于我、留言板", "/about", "关于"),
}


def floors_html(href):
    out = []
    for f in DATA["floors"]:
        title, sub, url, go = FLOOR_TEXT[f["id"]]
        y = (f["box"][1] + f["box"][3]) / 2 / DATA["scene"]["h"] * 100
        out.append(
            f'<li style="--y:{y:.1f}%"><button type="button" class="hf-floor" data-th-floor="{f["id"]}">'
            f'<b>{E(title)}</b><span>{E(sub)}</span></button><a class="hf-go" href="{href(url)}">{E(go)} →</a></li>'
        )
    return '<nav class="home-floors" aria-label="树屋的四层"><ol>' + "".join(out) + "</ol></nav>"


PANEL_HTML = f"""<section class="th-panel" id="th-panel" aria-labelledby="th-panel-title" hidden>
<div class="th-panel-nav">
<button class="th-panel-step" type="button" data-step="-1"></button>
<button class="th-panel-step" type="button" data-step="1"></button>
<button class="th-panel-close" type="button" aria-label="关闭，回到全景">{CLOSE}</button>
</div>
<p class="th-panel-kicker"></p>
<h2 class="th-panel-title" id="th-panel-title" tabindex="-1"></h2>
<p class="th-panel-desc"></p>
<div class="th-panel-body"></div>
<a class="th-panel-more" href="#" hidden></a>
</section>"""


def map_hrefs(obj, href):
    """Rewrite every "href" value in a nested structure (used to point preview links at in-page views)."""
    if isinstance(obj, dict):
        return {k: (href(v) if k == "href" and isinstance(v, str) else map_hrefs(v, href)) for k, v in obj.items()}
    if isinstance(obj, list):
        return [map_hrefs(v, href) for v in obj]
    return obj


def load_content():
    return build_panels(DATA["items"], SITE)


def card_data_json(href, panels, posts):
    items = [dict(it, href=href(it["href"]) if it.get("href") else None) for it in DATA["items"]]
    data = dict(
        scene=DATA["scene"], items=items, floors=DATA["floors"],
        panels=map_hrefs(panels, href), posts=map_hrefs(search_index(posts), href),
    )
    return json.dumps(data, ensure_ascii=False).replace("</", "<\\/")


def welcome_html():
    w = SITE["welcome"]
    cut = w.find("，")
    lines = [w[:cut + 1], w[cut + 1:]] if cut > 0 else [w]
    return "".join(f"<span>{E(t)}</span>" for t in lines)


def home_html(img_base, href, panels, posts):
    return f"""{header_html(href)}
<main class="home">
<div class="home-intro">
<p class="hi-kicker">TREEHOUSE · 个人博客</p>
<h1>{welcome_html()}</h1>
<p class="lede">{E(SITE["tagline"])}</p>
<p class="hi-hint"><span class="hint-hover">点一下树屋里的东西，镜头会推过去。</span><span class="hint-touch">点一点树屋里的东西。</span></p>
<button class="hi-map" type="button" data-map-open aria-controls="th-map">打开树屋地图</button>
</div>
<section class="scene-col" aria-label="树屋">
<div class="th-scene" id="th-scene">
<div class="th-stage">
<img class="th-base th-base-day" src="{img_base}day.webp" width="1086" height="1448" draggable="false" alt="一棵秋天的大树上搭着两层树屋：楼上是起居室，楼下是工作坊，树冠上有望远镜和小红旗，树下立着木牌和信箱。">
<img class="th-base th-base-night" src="{img_base}night.webp" width="1086" height="1448" draggable="false" alt="" aria-hidden="true">
<span class="th-moon" aria-hidden="true"></span>{stars_html()}
{layers_html(img_base)}
<div class="th-leaves" aria-hidden="true"></div>
</div>
<button class="th-zoom-out" type="button">回到全景</button>
<div class="th-card" id="th-card" role="dialog" aria-labelledby="th-card-title" hidden>
<button class="th-card-close" type="button" aria-label="关闭">{CLOSE}</button>
<p class="th-card-kicker"></p>
<h2 class="th-card-title" id="th-card-title" tabindex="-1"></h2>
<p class="th-card-desc"></p>
<div class="th-card-extra"></div>
<a class="th-card-go" href="#">去看看</a>
</div>
</div>
</section>
{floors_html(href)}
<aside class="side">
{PANEL_HTML}
</aside>
</main>
{map_html(href)}
<script type="application/json" id="th-data">{card_data_json(href, panels, posts)}</script>"""


# ---------- Article and section pages (the preview shows them in-page) ----------

def banner_style(item_id, img_base, cw=620, ch=190):
    """A strip of the drawing centred on an object, used as the header of its pages."""
    x, y, w, h = item_px(item_id)
    cx, cy = x + w / 2, y + h / 2
    x0 = min(max(0, cx - cw / 2), SW - cw)
    y0 = min(max(0, cy - ch / 2), SH - ch)
    return (f"--img-day:url({img_base}day.webp);--img-night:url({img_base}night.webp);"
            f"background-size:{SW / cw * 100:.2f}% auto;"
            f"background-position:{x0 / (SW - cw) * 100:.2f}% {y0 / (SH - ch) * 100:.2f}%")


def crumbs_html(href, item_id=None, extra=None):
    parts = [f'<a href="{href("/")}">树屋</a>']
    if item_id:
        it = ITEMS[item_id]
        group = GROUP_OF.get(item_id, "")
        if group:
            parts.append(f"<span>{E(group)}</span>")
        parts.append(f'<a href="{href("/#" + item_id)}">{E(it["name"])}</a>')
    if extra:
        parts.append(f"<span>{E(extra)}</span>")
    return '<nav class="crumbs" aria-label="位置">' + '<span aria-hidden="true">›</span>'.join(parts) + "</nav>"


def post_list_html(posts, href):
    if not posts:
        return '<p class="page-empty">这里还没有文章。</p>'
    rows = []
    for p in posts:
        tags = " · ".join(p["tags"])
        rows.append(
            f'<li><a href="{href(p["href"])}"><span class="pl-title">{E(p["title"])}</span>'
            f'<span class="pl-sum">{E(p["summary"])}</span>'
            f'<span class="pl-meta">{p["dateLabel"]} · {p["minutes"]} 分钟{" · " + E(tags) if tags else ""}</span></a></li>'
        )
    return '<ul class="page-list">' + "".join(rows) + "</ul>"


def back_html(item_id, href):
    it = ITEMS[item_id]
    return f'<a class="page-back" href="{href("/#" + item_id)}">‹ 回到树屋 · {E(it["name"])}</a>'


def page_views_html(img_base, href, panels, posts):
    pages = []
    for p in posts:
        item = p["item"]
        tags = " · ".join(p["tags"])
        banner = (f'<div class="page-banner" style="{banner_style(item, img_base)}" role="img" '
                  f'aria-label="树屋里的{E(ITEMS[item]["name"])}"></div>') if item in ITEMS else ""
        sample = '<p class="page-sample">示例文章，正式写作时替换或删除。</p>' if p["sample"] else ""
        pages.append(
            f'<div class="page" data-page="post-{p["slug"]}" data-title="{E(p["title"])}" hidden>'
            f'{crumbs_html(href, item)}{banner}'
            f'<article class="post"><p class="post-meta">{p["dateLabel"]} · {p["minutes"]} 分钟'
            f'{" · " + E(tags) if tags else ""}</p><h1 tabindex="-1">{E(p["title"])}</h1>'
            f'{sample}<div class="post-body">{p["html"]}</div></article>'
            f'{back_html(item, href) if item in ITEMS else ""}</div>'
        )

    # One page per object section, plus 技术 / 生活 / 归档.
    for it in DATA["items"]:
        if not it.get("href"):
            continue
        panel = panels.get(it["id"])
        mine = [p for p in posts if p["item"] == it["id"]]
        if panel and panel["kind"] == "posts":
            body = post_list_html(mine, href)
        else:
            body = (f'<p class="page-empty">{E(it["desc"])}</p>'
                    f'<p class="page-empty">正式网站里，这里是「{E(it["section"])}」的完整页面，还在搭建。</p>')
        pages.append(
            f'<div class="page" data-page="sec-{it["id"]}" data-title="{E(it["section"])}" hidden>'
            f'{crumbs_html(href, it["id"])}'
            f'<div class="page-banner" style="{banner_style(it["id"], img_base)}" role="img" aria-label="树屋里的{E(it["name"])}"></div>'
            f'<h1 class="page-title" tabindex="-1">{E(it["section"])}</h1>{body}{back_html(it["id"], href)}</div>'
        )

    for key, title, ids in (("tech", "技术", TECH), ("life", "生活", LIFE), ("archive", "归档", None)):
        chosen = [p for p in posts if ids is None or p["item"] in ids]
        pages.append(
            f'<div class="page" data-page="sec-{key}" data-title="{title}" hidden>'
            f'{crumbs_html(href, None, title)}<h1 class="page-title" tabindex="-1">{title}</h1>'
            f'{post_list_html(chosen, href)}<a class="page-back" href="{href("/")}">‹ 回到树屋</a></div>'
        )
    return '<main class="page-view wrap" id="page-view" hidden>' + "".join(pages) + "</main>"
