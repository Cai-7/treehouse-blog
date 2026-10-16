"""Shared HTML rendering for the treehouse home page.

The Astro components render the same markup from src/data/treehouse.json; this module exists so
the page can also be built as a single static file (tools/build_preview.py) without Node.
"""
import html
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = json.loads((ROOT / "src/data/treehouse.json").read_text())
SITE = json.loads((ROOT / "src/data/site.json").read_text())

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


def layer_box(key):
    for L in DATA["layers"]:
        if L["key"] == key:
            return L
    raise KeyError(key)


def pct(v, total):
    return round(v / total * 100, 2)


def screens_html():
    bx, by, bw, bh = layer_box("desk")["box"]
    dx, dy, dw, dh = bx / 100 * 1086, by / 100 * 1448, bw / 100 * 1086, bh / 100 * 1448
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


def header_html(href):
    nav = "".join(f'<a href="{href(u)}">{E(t)}</a>' for t, u in DATA["nav"])
    return (
        '<header class="site-header wrap">'
        f'<a class="brand" href="{href("/")}">{E(SITE["name"])}</a>'
        f'<nav class="site-nav" aria-label="主导航">{nav}'
        f'<button class="mode-toggle" type="button" data-mode-toggle aria-label="切换到夜晚">{SUN}{MOON}</button>'
        "</nav></header>"
    )


def directory_html(href):
    groups = []
    for g in DATA["directory"]:
        links = []
        for label, target in g["links"]:
            if target:
                url = DATA["hrefs"][target]
                links.append(f'<a href="{href(url)}" data-th-target="{target}">{E(label)}</a>')
            else:
                links.append(f'<a href="{href("/archive")}">{E(label)}</a>')
        groups.append(f'<div class="dir-group"><h3>{E(g["title"])}</h3><div class="dir-links">{"".join(links)}</div></div>')
    return '<nav class="dir" aria-label="目录"><h2 class="side-label">目录</h2>' + "".join(groups) + "</nav>"


def card_data_json(href):
    items = [dict(it, href=href(it["href"]) if it.get("href") else None) for it in DATA["items"]]
    data = dict(scene=DATA["scene"], items=items, floors=DATA["floors"])
    return json.dumps(data, ensure_ascii=False).replace("</", "<\\/")


def home_html(img_base, href):
    return f"""{header_html(href)}
<main class="home wrap">
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
<p class="scene-hint"><span class="hint-hover">把鼠标移到树屋里的东西上，点一下就能打开。</span><span class="hint-touch">点一点树屋里的东西。</span></p>
</section>
<aside class="side">
<div class="intro">
<h1>{E(SITE["welcome"])}</h1>
<p class="lede">{E(SITE["tagline"])}</p>
</div>
<div class="sky-ctl">
<h2 class="side-label" id="sky-label">天色</h2>
<div class="seg" role="group" aria-labelledby="sky-label">
<button type="button" data-mode-set="auto" aria-pressed="true">跟随当地时间</button>
<button type="button" data-mode-set="day" aria-pressed="false">白天</button>
<button type="button" data-mode-set="night" aria-pressed="false">夜晚</button>
</div>
</div>
{directory_html(href)}
</aside>
</main>
<script type="application/json" id="th-data">{card_data_json(href)}</script>"""
