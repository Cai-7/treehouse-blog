"""Build a single-file preview of the site (no Node needed).

    python3 tools/build_preview.py

Writes preview/index.html (open it straight from disk) and preview/artifact.html, plus a copy of
the images under preview/treehouse/. Article and section pages are rendered into the same file and
shown by a small preview-only router, so links work without a server.
"""
import base64
import shutil
from pathlib import Path

from render import DATA, FOOTER_HTML, ROOT, SITE, E, home_html, load_content, page_views_html

OUT = ROOT / "preview"
OUT.mkdir(exist_ok=True)
shutil.copytree(ROOT / "public/treehouse", OUT / "treehouse", dirs_exist_ok=True)

SECTION_OF_HREF = {it["href"]: it["id"] for it in DATA["items"] if it.get("href")}


def href(url):
    """Point site paths at the in-page views of the preview."""
    if not url or url == "/":
        return "#"
    if url.startswith(("http://", "https://", "#")):
        return url
    if url.startswith("/#"):
        return url[1:]
    if url.startswith("/posts/"):
        return "#post-" + url[len("/posts/"):].strip("/")
    if url in SECTION_OF_HREF:
        return "#sec-" + SECTION_OF_HREF[url]
    return "#sec-" + url.strip("/").replace("/", "-")


panels, posts = load_content()

css = "\n".join((ROOT / "src/styles" / f).read_text() for f in ("fonts.css", "global.css", "treehouse.css", "layout.css"))
# Embed the web fonts so the single-file preview needs no font requests (some viewers block them).
for font in (ROOT / "public/fonts").rglob("*.woff*"):
    mime = "font/woff2" if font.suffix == ".woff2" else "font/woff"
    data = base64.b64encode(font.read_bytes()).decode()
    rel = font.relative_to(ROOT / "public").as_posix()
    css = css.replace(f'url("/{rel}")', f'url("data:{mime};base64,{data}")')
mode_js = (ROOT / "src/scripts/mode.js").read_text()
scene_js = (ROOT / "src/scripts/treehouse.js").read_text()
router_js = (ROOT / "tools/preview_router.js").read_text()
site_js = (ROOT / "src/scripts/site.js").read_text()

img = "treehouse/"
body = home_html(img, href, panels, posts) + "\n" + page_views_html(img, href, panels, posts) + "\n" + FOOTER_HTML

head = f"""<title>{E(SITE["name"])}</title>
<meta name="claude:viewport-fit-sides" content="cover">
<meta name="description" content="{E(SITE["description"])}">
<meta name="theme-color" content="#f7f0dc">
<script>{mode_js}</script>
<style>{css}</style>"""

# The router goes first so a page view is shown before the treehouse reacts to the address.
tail = f"<script>{router_js}</script>\n<script>{scene_js}</script>\n<script>{site_js}</script>"

(OUT / "artifact.html").write_text(f"{head}\n{body}\n{tail}\n")
(OUT / "index.html").write_text(
    '<!doctype html>\n<html lang="zh-CN">\n<head>\n<meta charset="utf-8">\n'
    '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
    f"{head}\n</head>\n<body>\n{body}\n{tail}\n</body>\n</html>\n"
)
print("wrote", OUT / "index.html", "and", OUT / "artifact.html", f"({len(posts)} posts, {len(panels)} panels)")
