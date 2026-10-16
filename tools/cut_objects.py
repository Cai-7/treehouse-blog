"""把树屋原图里的每个物品抠出来，生成悬停放大用的图层。

用法（需要 Python 3 + pillow + numpy + opencv-python）：

    python3 tools/cut_objects.py                 # 用 tools/masks/ 里现有的蒙版重新导出全部图层
    python3 tools/cut_objects.py --grabcut piano # 用 GrabCut 为某个物品重新自动抠图（会覆盖它的蒙版）
    python3 tools/make_data.py                   # 导出后重新生成 src/data/treehouse.json

原图放在 tools/art/day.png 和 tools/art/night.png，两张图必须同尺寸、构图对齐（1086×1448）。
如果换了新画，先改下面 OBJ 里的物品框（场景像素 x0, y0, x1, y1），再对每个物品跑 --grabcut，
自动结果不理想时可以用任何画图软件直接修改 tools/masks/<物品>.png（白色=物品，黑色=背景）。

输出：
    public/treehouse/day.webp, night.webp       底图
    public/treehouse/cut/day|night/<物品>.webp   抠好的图层（带透明通道）
    tools/cutmeta.json                          每个图层在场景里的位置
"""
import argparse
import json
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
TOOLS = ROOT / "tools"
ART = TOOLS / "art"
MASKS = TOOLS / "masks"
OUT = ROOT / "public/treehouse"
META = TOOLS / "cutmeta.json"

PAD = 2          # 图层四周留出的像素，给羽化边缘留空间
FEATHER = 1.0    # 边缘羽化（高斯模糊 sigma）
QUALITY = 88     # webp 质量

# 物品框：场景像素 (x0, y0, x1, y1)
OBJ = {
    "telescope": (562, 52, 656, 184),
    "flag": (652, 20, 732, 132),
    "birdhouse1": (134, 218, 222, 308),
    "birdhouse2": (92, 780, 180, 870),
    "owl": (944, 306, 1000, 394),
    "lamp": (386, 298, 460, 434),
    "photos": (306, 424, 484, 494),
    "plants": (202, 452, 294, 535),
    "record": (201, 570, 299, 680),
    "piano": (296, 510, 477, 672),
    "books": (503, 390, 580, 634),
    "screen": (596, 350, 770, 560),
    "suitcase": (623, 586, 770, 684),
    "chime": (864, 448, 908, 570),
    "hammock": (790, 476, 1004, 660),
    "desk": (242, 914, 497, 1088),
    "board": (450, 844, 596, 980),
    "pegboard": (612, 844, 764, 994),
    "blueprint": (663, 970, 716, 1085),
    "cabinet": (722, 909, 796, 1086),
    "basket": (895, 858, 982, 1136),
    "mailbox": (591, 1214, 670, 1286),
    "sign": (214, 1194, 332, 1405),
}


def grabcut(img_rgb, box):
    """在物品框内自动分离前景，返回 0/255 的整图蒙版。"""
    x0, y0, x1, y1 = box
    bgr = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2BGR)
    mask = np.zeros(bgr.shape[:2], np.uint8)
    bgd, fgd = np.zeros((1, 65), np.float64), np.zeros((1, 65), np.float64)
    cv2.grabCut(bgr, mask, (x0, y0, x1 - x0, y1 - y0), bgd, fgd, 6, cv2.GC_INIT_WITH_RECT)
    fg = np.where((mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD), 255, 0).astype(np.uint8)
    # 只保留最大的连通块，再补洞、去毛刺
    n, labels, stats, _ = cv2.connectedComponentsWithStats(fg)
    if n > 1:
        keep = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
        fg = np.where(labels == keep, 255, 0).astype(np.uint8)
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    fg = cv2.morphologyEx(fg, cv2.MORPH_CLOSE, k)
    return fg


def night_shift(day, night, box, search=4):
    """夜景图可能和白天差一两个像素，在物品附近找最佳对齐偏移。"""
    x0, y0, x1, y1 = box
    a = cv2.cvtColor(day[y0:y1, x0:x1], cv2.COLOR_RGB2GRAY).astype(np.float32)
    a = cv2.Canny(a.astype(np.uint8), 60, 160).astype(np.float32)
    best, best_score = (0, 0), -1.0
    for dy in range(-search, search + 1):
        for dx in range(-search, search + 1):
            ys, xs = y0 + dy, x0 + dx
            if ys < 0 or xs < 0 or ys + a.shape[0] > night.shape[0] or xs + a.shape[1] > night.shape[1]:
                continue
            b = cv2.cvtColor(night[ys:ys + a.shape[0], xs:xs + a.shape[1]], cv2.COLOR_RGB2GRAY)
            b = cv2.Canny(b, 60, 160).astype(np.float32)
            score = float((a * b).sum())
            if score > best_score:
                best, best_score = (dx, dy), score
    return list(best)


def export(key, day, night, meta):
    m = np.array(Image.open(MASKS / f"{key}.png").convert("L"))
    ys, xs = np.nonzero(m > 127)
    if not len(xs):
        raise SystemExit(f"{key}: 蒙版是空的")
    H, W = m.shape
    x0, y0 = max(0, xs.min() - PAD), max(0, ys.min() - PAD)
    x1, y1 = min(W, xs.max() + 1 + PAD), min(H, ys.max() + 1 + PAD)
    alpha = cv2.GaussianBlur(m, (0, 0), FEATHER)[y0:y1, x0:x1] if FEATHER else m[y0:y1, x0:x1]

    old = meta.get(key, {})
    nshift = old.get("nshift") or night_shift(day, night, OBJ[key])
    nx, ny = nshift

    for mode, img, (sx, sy) in (("day", day, (0, 0)), ("night", night, (nx, ny))):
        crop = img[y0 + sy:y1 + sy, x0 + sx:x1 + sx]
        rgba = np.dstack([crop, alpha])
        dst = OUT / "cut" / mode / f"{key}.webp"
        dst.parent.mkdir(parents=True, exist_ok=True)
        Image.fromarray(rgba, "RGBA").save(dst, "WEBP", quality=QUALITY, method=6)

    meta[key] = {"x": int(x0), "y": int(y0), "w": int(x1 - x0), "h": int(y1 - y0), "nshift": nshift}


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--grabcut", nargs="*", metavar="KEY", help="重新自动抠这些物品（不写名字=全部）")
    ap.add_argument("--only", nargs="*", metavar="KEY", help="只导出这些物品")
    args = ap.parse_args()

    day = np.array(Image.open(ART / "day.png").convert("RGB"))
    night = np.array(Image.open(ART / "night.png").convert("RGB"))
    if day.shape != night.shape:
        raise SystemExit("day.png 和 night.png 尺寸必须一致")

    meta = json.loads(META.read_text()) if META.exists() else {}
    MASKS.mkdir(exist_ok=True)

    if args.grabcut is not None:
        for key in args.grabcut or OBJ:
            Image.fromarray(grabcut(day, OBJ[key])).save(MASKS / f"{key}.png")
            meta.pop(key, None)  # 重新估计夜景偏移
            print("grabcut", key)

    OUT.mkdir(parents=True, exist_ok=True)
    Image.fromarray(day).save(OUT / "day.webp", "WEBP", quality=QUALITY, method=6)
    Image.fromarray(night).save(OUT / "night.webp", "WEBP", quality=QUALITY, method=6)

    for key in args.only or OBJ:
        export(key, day, night, meta)
        print("export", key, meta[key])

    META.write_text(json.dumps(meta, indent=1, ensure_ascii=False))
    print("完成。接着运行 python3 tools/make_data.py 更新页面数据。")


if __name__ == "__main__":
    main()
