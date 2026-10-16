"""Build a single-file preview of the home page (no Node needed).

    python3 tools/build_preview.py

Writes preview/index.html (open it straight from disk) and preview/artifact.html, plus a copy of
the images under preview/treehouse/. Section links point to "#" because the section pages only
exist in the Astro build.
"""
import shutil
from pathlib import Path

from render import ROOT, SITE, E, home_html

OUT = ROOT / "preview"
OUT.mkdir(exist_ok=True)
shutil.copytree(ROOT / "public/treehouse", OUT / "treehouse", dirs_exist_ok=True)

css = (ROOT / "src/styles/global.css").read_text() + "\n" + (ROOT / "src/styles/treehouse.css").read_text()
mode_js = (ROOT / "src/scripts/mode.js").read_text()
scene_js = (ROOT / "src/scripts/treehouse.js").read_text()

body = home_html("treehouse/", lambda url: "#")

head = f"""<title>{E(SITE["name"])}</title>
<meta name="claude:viewport-fit-sides" content="cover">
<meta name="description" content="{E(SITE["description"])}">
<meta name="theme-color" content="#f7f0dc">
<script>{mode_js}</script>
<style>{css}</style>"""

tail = f"<script>{scene_js}</script>"

(OUT / "artifact.html").write_text(f"{head}\n{body}\n{tail}\n")
(OUT / "index.html").write_text(
    '<!doctype html>\n<html lang="zh-CN">\n<head>\n<meta charset="utf-8">\n'
    '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
    f"{head}\n</head>\n<body>\n{body}\n{tail}\n</body>\n</html>\n"
)
print("wrote", OUT / "index.html", "and", OUT / "artifact.html")
