"""Build src/data/treehouse.json from the cut-out boxes (cutmeta.json) and the item list below.

Box values are pixels on the 1086 x 1448 scene image. Run from the project root:
    python3 tools/make_data.py
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CUT = json.loads((ROOT / "tools/cutmeta.json").read_text())
PTS = json.loads((ROOT / "tools/points.json").read_text())
W, H = 1086, 1448

# id, layer key(s), name, group, section, description, href, options
ITEMS = [
    dict(id="lights", layers=["lights"], name="神经网络灯串", group="", section="彩蛋",
         desc="一个 3-4-4-3 的小网络。点一下，看一次前向传播。", href=None, extra="nn"),
    dict(id="telescope", layers=["telescope"], name="望远镜", group="树冠", section="实验室",
         desc="机器学习的小 demo 都放在树冠上，透过望远镜去看。", href="/lab", scale=1.15, origin="50% 100%", tip="below"),
    dict(id="flag", layers=["flag"], name="小红旗", group="树冠", section="年度目标",
         desc="今年想做成的事，插在树的最高处。", href="/goals", scale=1.15, origin="12% 100%", tip="below"),
    dict(id="birdhouse", layers=["birdhouse1", "birdhouse2"], name="鸟屋", group="", section="友链",
         desc="每个鸟屋通向一位朋友的博客。", href="/friends", scale=1.15, origin="50% 100%"),
    dict(id="owl", layers=["owl"], name="猫头鹰", group="", section="搜索",
         desc="想找哪篇文章，问它。天黑以后，它的眼睛会亮。", href="/search", scale=1.2, origin="50% 100%", extra="owl"),
    dict(id="lamp", layers=["lamp"], name="拉绳灯", group="", section="白天和夜晚",
         desc="拉一下灯绳，天就黑了；再拉一下，天又亮了。", href=None, scale=1.15, origin="50% 0%", extra="lamp",
         hit=(386, 300, 460, 436)),
    dict(id="photos", layers=["photos"], name="晾衣绳上的照片", group="生活", section="摄影",
         desc="晾在绳子上的照片，就是相册。", href="/life/photos", scale=1.12, origin="50% 0%"),
    dict(id="plants", layers=["plants"], name="窗台盆栽", group="生活", section="日常",
         desc="几盆慢慢长大的植物，记录平常的日子。", href="/life/daily", scale=1.12, origin="50% 100%"),
    dict(id="record", layers=["record"], name="唱片机", group="生活", section="音乐",
         desc="最近在循环的歌。", href="/life/music", scale=1.1, origin="50% 100%", extra="record"),
    dict(id="piano", layers=["piano"], name="钢琴", group="生活", section="弹琴",
         desc="练琴记录和喜欢的曲子。下面这排琴键可以弹。", href="/life/piano", scale=1.07, origin="50% 100%", extra="piano"),
    dict(id="books", layers=["books"], name="树洞书架", group="生活", section="读书",
         desc="树干里的树洞，放着读过的书和读书笔记。", href="/life/reading", scale=1.08, origin="50% 50%"),
    dict(id="screen", layers=["screen"], name="投影幕布", group="生活", section="影视与游戏",
         desc="看过的电影、玩过的游戏，都投在这块幕布上。", href="/life/screen", scale=1.06, origin="50% 0%"),
    dict(id="suitcase", layers=["suitcase"], name="行李箱和地图", group="生活", section="旅行",
         desc="去过的地方和走过的路线。", href="/life/travel", scale=1.1, origin="50% 100%"),
    dict(id="hammock", layers=["hammock"], name="吊床", group="生活", section="随笔",
         desc="躺着写下的碎碎念。", href="/life/notes", scale=1.08, origin="50% 0%", hit=(795, 480, 1002, 660)),
    dict(id="chime", layers=["chime"], name="风铃", group="", section="订阅",
         desc="订阅更新。点一下，听听风铃。", href="/subscribe", scale=1.12, origin="50% 0%", extra="chime",
         hit=(858, 450, 918, 570)),
    dict(id="desk", layers=["desk"], name="双屏书桌", group="技术", section="前端",
         desc="屏幕上滚动的，是最新一篇前端文章的代码。", href="/tech/frontend", scale=1.05, origin="50% 100%", extra="desk"),
    dict(id="board", layers=["board"], name="黑板", group="技术", section="机器学习",
         desc="公式推导和模型笔记都写在这里。", href="/tech/ml", scale=1.08, origin="50% 50%"),
    dict(id="pegboard", layers=["pegboard"], name="工具墙", group="技术", section="工具与踩坑",
         desc="折腾工具、排查问题的记录，挂满一整面墙。", href="/tech/tools", scale=1.07, origin="50% 50%"),
    dict(id="blueprint", layers=["blueprint"], name="图纸桶", group="技术", section="Now",
         desc="最近在忙什么，摊开图纸就知道。", href="/now", scale=1.12, origin="50% 100%"),
    dict(id="cabinet", layers=["cabinet"], name="档案柜", group="技术", section="项目复盘",
         desc="项目复盘和论文笔记，每个抽屉是一类整理好的长文。", href="/tech/projects", scale=1.08, origin="50% 100%"),
    dict(id="basket", layers=["basket"], name="绳索吊篮", group="", section="楼层电梯",
         desc="坐上吊篮，去树屋的另一层看看。", href=None, scale=1.06, origin="50% 0%", extra="basket"),
    dict(id="mailbox", layers=["mailbox"], name="信箱", group="", section="留言板",
         desc="给我写一封信。", href="/guestbook", scale=1.15, origin="50% 100%"),
    dict(id="sign", layers=["sign"], name="木牌", group="", section="关于",
         desc="写着这里的名字。想知道树屋的主人是谁，从这里进去。", href="/about", scale=1.08, origin="50% 100%", extra="sign"),
]

# Bulb centres (scene px) grouped into the four columns of the "network".
LIGHTS_BOX = (296, 716, 456, 170)
COLS = [(321, 425, 593, 726)]
BULBS = [
    (0, 321, 741), (0, 321, 782), (0, 321, 823),
    (1, 425, 744), (1, 426, 785), (1, 425, 827), (1, 426, 868),
    (2, 593, 745), (2, 592, 786), (2, 592, 829), (2, 594, 871),
    (3, 726, 745), (3, 726, 789), (3, 725, 830),
]

FLOORS = [
    dict(id="canopy", label="树冠", box=[100, 0, 1086, 420]),
    dict(id="living", label="起居室", box=[170, 300, 1010, 700]),
    dict(id="workshop", label="工作坊", box=[190, 700, 860, 1110]),
    dict(id="ground", label="树下", box=[150, 1080, 1000, 1448]),
]

DIRECTORY = [
    dict(title="技术 · 楼下工作坊", links=[["前端", "desk"], ["机器学习", "board"], ["工具与踩坑", "pegboard"], ["项目复盘", "cabinet"], ["Now", "blueprint"]]),
    dict(title="生活 · 楼上起居室", links=[["读书", "books"], ["音乐", "record"], ["弹琴", "piano"], ["摄影", "photos"], ["旅行", "suitcase"], ["随笔", "hammock"], ["影视与游戏", "screen"], ["日常", "plants"]]),
    dict(title="树上的其他角落", links=[["实验室", "telescope"], ["年度目标", "flag"], ["友链", "birdhouse"], ["留言板", "mailbox"], ["搜索", "owl"], ["订阅", "chime"], ["关于", "sign"], ["归档", None]]),
]

NAV = [["技术", "/tech"], ["生活", "/life"], ["实验室", "/lab"], ["归档", "/archive"], ["关于", "/about"]]


def pct(v, total):
    return round(v / total * 100, 3)


def rel(box, parent):
    """Hit area box (x0, y0, x1, y1) in scene px -> % of the parent layer box (x, y, w, h)."""
    x0, y0, x1, y1 = box
    px, py, pw, ph = parent
    return [round((x0 - px) / pw * 100, 2), round((y0 - py) / ph * 100, 2),
            round((x1 - x0) / pw * 100, 2), round((y1 - y0) / ph * 100, 2)]


items = []
layers = []
for it in ITEMS:
    kicker = f"{it['group']} · {it['section']}" if it["group"] else it["section"]
    items.append(dict(id=it["id"], name=it["name"], section=it["section"], kicker=kicker,
                      desc=it["desc"], href=it["href"], extra=it.get("extra")))
    for key in it["layers"]:
        if key == "lights":
            box = LIGHTS_BOX
            hit = rel((300, 725, 745, 845), box)
            cut = False
        else:
            m = CUT[key]
            box = (m["x"], m["y"], m["w"], m["h"])
            hit = rel(it["hit"], box) if it.get("hit") else None
            cut = True
        x, y, w, h = box
        layers.append(dict(
            key=key, item=it["id"], name=it["name"], label=f"{it['name']}：{it['section']}",
            box=[pct(x, W), pct(y, H), pct(w, W), pct(h, H)],
            scale=it.get("scale", 1.0), origin=it.get("origin", "50% 50%"),
            tip=it.get("tip", "above"), hit=hit, cut=cut, extra=it.get("extra"),
        ))

lx, ly, lw, lh = LIGHTS_BOX
bulbs = [dict(col=c, x=round((x - lx) / lw * 100, 2), y=round((y - ly) / lh * 100, 2)) for c, x, y in BULBS]
links = []
for a in bulbs:
    for b in bulbs:
        if b["col"] == a["col"] + 1:
            links.append(dict(col=a["col"], x1=a["x"], y1=a["y"], x2=b["x"], y2=b["y"]))

stars = [dict(x=pct(x, W), y=pct(y, H)) for x, y, _ in PTS["stars"]]

data = dict(
    scene=dict(w=W, h=H),
    items=items, layers=layers, bulbs=bulbs, links=links, stars=stars,
    floors=FLOORS, directory=DIRECTORY, nav=NAV,
    hrefs={it["id"]: it["href"] for it in ITEMS},
)
out = ROOT / "src/data/treehouse.json"
out.write_text(json.dumps(data, ensure_ascii=False, indent=1))
print("wrote", out, len(layers), "layers")
