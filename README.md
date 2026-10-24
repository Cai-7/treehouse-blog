# 我的树屋 · 个人博客

一棵树，两层楼：楼下的工作坊写代码（技术），楼上的起居室过日子（生活）。
首页是一张可以点的树屋插画，白天和夜晚两套画面，每样东西都通向一个栏目。

基于 [Astro](https://astro.build)，构建出来是纯静态网站，可以免费部署在 Netlify（也可以放到 Cloudflare Pages、EdgeOne Pages 等任何静态托管）。

## 本地运行

需要 Node.js 20 或更新版本。

```bash
npm install
npm run dev      # 打开 http://localhost:4321
npm run build    # 生成 dist/，这就是要上线的网站
npm run preview  # 本地预览 dist/
```

不想装 Node、只想看看首页效果：

```bash
python3 tools/build_preview.py   # 生成 preview/index.html，直接用浏览器打开
```

预览版把文章页、栏目页都塞进同一个文件里，链接照样能点。

## 目录结构

```
src/
  content/posts/             文章（Markdown），每篇挂在一个物品上
  content/lists/             书单、歌单、照片、目标、去过的地方……（YAML）
  content.config.ts          上面两类内容的格式定义
  pages/index.astro          首页（树屋 + 右侧介绍、天色切换、目录、内容栏）
  pages/posts/[slug].astro   文章页
  pages/[...slug].astro      栏目页：文章类物品列出全部文章，其他物品先放占位
  pages/rss.xml.ts           订阅地址 /rss.xml
  lib/content.ts             每个物品推近后显示什么（和 tools/content.py 保持一致）
  lib/scene.ts               插画相关的小工具（页面顶部的场景横幅等）
  layouts/Base.astro         全站外壳：页头导航、昼夜按钮、页脚
  components/Treehouse.astro 树屋场景
  components/PageHead.astro  文章页 / 栏目页顶部的路径和场景横幅
  scripts/mode.js            全站昼夜（跟随当地时间 / 白天 / 夜晚，记在 localStorage）
  scripts/treehouse.js       树屋交互：镜头推近、内容栏、钢琴、风铃、唱片机、灯串、吊篮电梯、落叶……
  styles/fonts.css           中文字体分块（由 tools/build_fonts.py 生成）
  styles/global.css          全站颜色变量（白天 / 夜晚两套）、字体搭配和版式
  styles/treehouse.css       树屋场景和内容栏的样式
  data/site.json             博客名字、欢迎语、标语、网址
  data/treehouse.json        物品数据（由 tools/make_data.py 生成，别直接改）
public/treehouse/            底图和抠好的物品图层
public/fonts/                testType 和切好的中文字体
tools/
  make_data.py               物品文案、链接、目录分组都在这里改
  content.py                 预览用：读 src/content/，算出每个物品的内容
  build_fonts.py             中文字体切分
  cut_objects.py             换了新画以后重新抠物品图层
  build_preview.py           生成不需要 Node 的单文件预览
  art/                       原画 day.png / night.png
  masks/                     每个物品的蒙版（白色=物品）
  fonts-src/                 原始中文字体（不进仓库）
```

## 常见修改

**写一篇文章**：在 `src/content/posts/` 新建一个 `.md` 文件，文件名就是网址（`hello.md` → `/posts/hello`）：

```markdown
---
title: 文章标题
date: 2026-10-20
item: board         # 挂在哪个物品上：board 技术文章、pegboard 工具、cabinet 项目、hammock 随笔、plants 日常
topic: frontend     # 只有黑板上的文章需要：frontend 前端 或 ml 机器学习，技术文章页按它分类
tags: [CSS, 动画]
summary: 一句话简介，会显示在列表里
---

正文……
```

不想发布的加一行 `draft: true`。示例文章都带着 `sample: true`，写好自己的就可以删掉它们。
写完如果用到了新的汉字，记得跑一次 `python3 tools/build_fonts.py`。

**改书单、歌单、目标、技术栈等**：编辑 `src/content/lists/` 里对应的 `.yaml`，每个文件开头都写了格式。技术栈在 `stack.yaml`（左屏前端、右屏机器学习）。

**改博客名字、欢迎语**：编辑 `src/data/site.json`。木牌上的字和页头会一起变。

**改物品的文字、链接、分组**：编辑 `tools/make_data.py` 里的 `ITEMS`、`DIRECTORY`、`NAV`，然后运行

```bash
python3 tools/make_data.py
```

**换一张新画**：把新图放到 `tools/art/day.png` 和 `tools/art/night.png`（两张图同尺寸、构图对齐）。
物品位置变了就先改 `tools/cut_objects.py` 里的 `OBJ` 框，然后：

```bash
python3 tools/cut_objects.py --grabcut     # 自动抠全部物品；只重抠某几个就在后面写名字
python3 tools/make_data.py
```

自动抠得不干净的，直接用画图软件修 `tools/masks/<物品>.png`，再跑一次 `python3 tools/cut_objects.py`。
需要 `pip install pillow numpy opencv-python`。

## 字体

英文、数字和常用英文标点用的是 testType 01（`public/fonts/testtype-01.woff`），设计者 Xiaoyuan Gao / notyourtypefoundry，
授权是「Free To Use BUT Be Nice」：个人使用免费，但必须署名（页脚已经写了），并且不能再分发字体文件。
所以**这个仓库请保持私有**，公开仓库等于把字体文件给了所有人。

testType 没有中文字形，中文用两款开源字体（OFL 1.1，可以放进仓库、用在网站上）：

- **霞鹜漫黑**（LXGW Marker Gothic，马克笔手写）：标题、导航、按钮、物品名
- **悠哉字体**（Yozai，柔和手写）：正文、说明文字

中文字体每个有好几 MB，所以不直接用原文件，而是用 `tools/build_fonts.py` 只保留网站用到的字，
再按出现频率切成小块，访客只下载当前页面用到的那几块：

```bash
pip install fonttools brotli          # 第一次
python3 tools/build_fonts.py          # 写了带新字的文章之后再跑一次
```

原始字体文件放在 `tools/fonts-src/`（不进仓库，换电脑时重新下载：
[霞鹜漫黑](https://github.com/lxgw/LxgwMarkerGothic/releases)、[悠哉字体](https://github.com/lxgw/yozai-font/releases)），
生成的小块在 `public/fonts/marker/`、`public/fonts/hand/`，`@font-face` 规则在 `src/styles/fonts.css`。
忘了跑也没关系：新出现的字会先用系统字体显示。

代码块和订阅地址仍然用等宽字体，方便阅读和复制。字体搭配在 `src/styles/global.css` 顶部和 `treehouse.css` 末尾。

## 留言和评论（giscus）

信箱、`/guestbook` 页和每篇文章底部的留言用 [giscus](https://giscus.app)，留言存在 GitHub 仓库
[Cai-7/treehouse-comments](https://github.com/Cai-7/treehouse-comments) 的 Discussions 里，访客用 GitHub 账号登录后留言。

开通步骤（只做一次）：
1. 在这个仓库的 Settings → General → Features 里勾选 **Discussions**。
2. 安装 [giscus App](https://github.com/apps/giscus)，只授权给这个仓库。
3. 打开 giscus.app，填仓库名，分类选 **Announcements**，把页面生成的 `data-repo-id` 和 `data-category-id`
   填进 `src/data/site.json` 的 `giscus.repoId` 和 `giscus.categoryId`。

两个 id 都填好之前，网站不显示任何评论框，信箱里的「写一封信」只是本页草稿。
同一个词对应同一个讨论：文章用 `post:<文章文件名>`，信箱和 `/guestbook` 共用 `guestbook`。
文章页的评论框跟着白天 / 夜晚换颜色；信箱里的信纸总是浅色。

## 部署到 Netlify（不需要 GitHub）

站点是纯静态文件，`npm run build` 生成的 `dist` 文件夹放到哪里都行。

第一次（最省事，不用命令行）：
1. `npm run build`，得到 `dist` 文件夹。
2. 注册并登录 [Netlify](https://app.netlify.com)，在团队页面选「Add new project」→「Deploy manually」，把整个 `dist` 文件夹拖进去。
3. 在 Site configuration 里把网站名改成你喜欢的，得到 `你的名字.netlify.app`。

以后更新：再把新的 `dist` 拖到该站点的 Deploys 页面；或者用命令行，第一次 `npx netlify-cli login`，然后 `npm run deploy`（第一次会问你关联哪个站点）。
上线后把 `astro.config.mjs` 里的 `site` 换成真实网址再部署一次，RSS 里的地址才对。
想用自己的域名，在 Netlify 的 Domain management 里添加。

## 二级页面

每个物品都有自己的页面，顶部是从插画里抠出来的物品和一句话，底部是同一区域的「隔壁」和「回到树屋」。

- 文章类（技术文章、工具与踩坑、项目复盘、随笔、日常）：全部文章按年份分组，可以按标签筛选；技术文章还能按前端 / 机器学习分类。
- 其他物品（技术栈、书架、唱片、照片、钢琴、地图、望远镜、小红旗、鸟屋、图纸桶、猫头鹰、风铃、信箱、木牌）：上面是和首页面板一样、可以玩的完整版，下面是同样内容的文字清单（关掉 JavaScript 或被搜索引擎抓取时也能读）。
- `/tech`、`/life`：一层楼的所有物品；`/archive`：年轮，每圈一年，每篇文章是年轮上的一个小疙瘩；`/tags/<标签>`：一个标签下的文章；找不到的地址会到 404 页。
- 文章页：目录（有两个以上小标题时）、顶部阅读进度、代码块「复制」、同一处的更早 / 更新一篇、相关文章和留言。
- 这些页面只在 Astro 里有；`tools/build_preview.py` 的单文件预览只保留首页。

可选的新字段（不填也能正常显示）：书 `status`（reading / done / want）、旅行 `posts`（地名对应的文章）、年度目标 `history`（往年）、Now `history`（旧图纸）、关于 `timeline` 和 `email`。

## 首页交互一览

- 鼠标移到物品上：物品浮起、显示名字。点一下，镜头推近这个物品，右边一栏换成它的内容（手机上从底部滑出）。
- 每个物品点开都是它自己：钢琴是一本乐谱加一排真的琴键，书架是一排书脊，下面逐个列出。
  - 钢琴：25 个键（C4–C6，含黑键），鼠标、触屏（可多指、可滑动）和电脑键盘（A S D F G H J K，黑键 W E T Y U O P）都能弹；乐谱是自己画的五线谱，「示范」自动演奏并让音符和琴键同步亮，「跟弹」提示下一个该按哪个键。谱子写在 `src/content/lists/piano.yaml` 的 `songs`，文件开头有写法说明。
  - 唱片机：俯视的唱机，唱臂会落到唱片上，唱盘转起来；唱片箱里每首歌一张封套（`music.yaml`，可填 `color`、`url`），放的是按歌名随手谱的示意小曲。
  - 晾衣绳照片：照片夹在绳子上轻轻晃，点一张取下来放大，点一下翻到背面看日期、地点、相机（`photos.yaml` 的 `date`、`place`、`camera`）。左右键切换照片，Esc 挂回去。
  - 黑板（技术文章）：前端和机器学习的文章标题用粉笔字写在黑板上（超过 3 篇用右下角的 ‹ › 翻页）；下面一块涂鸦区，可以选粉笔颜色随手画，「擦掉涂鸦」只擦涂鸦，不动文章。
  - 双屏书桌（技术栈）：一个代码编辑器，顶上切换左屏（前端）和右屏（机器学习），每项技术是一个文件，点开看熟练度、用了几年、用在哪里，一句话一个字一个字打出来（`stack.yaml`）。
  - 档案柜：一个年份一个抽屉，点开抽屉露出里面的文件夹，每个文件夹是一篇项目复盘。
  - 工具墙：洞洞板上挂着锤子、扳手、螺丝刀等，每件工具拴着一张纸标签，写着一篇踩坑记录。
  - 投影幕布：投影机的光打在幕布上，下面一排票根，点哪张就放映哪一部（`screen.yaml` 里的 `note` 是短评）。
  - 行李箱和地图：箱盖里一张手绘风的探险地图，去过的地方按经纬度远近画成小岛并插上图钉，点图钉或下面的邮戳显示一句话（`places.yaml` 的 `notes`）；想去的挂在行李牌上。内置约 70 个城市，没有的在 `coords` 里补经纬度。
  - 望远镜：圆形的目镜，拖动夜空找星星，每颗星是一个实验，亮黄色可以玩，淡蓝色还在做。
  - 书架：每本书是一条书脊，高矮粗细和颜色自动配，点一下抽出来，下面翻开读书笔记（`books.yaml` 里的 `note`、`quote`、`finished`）。
  - 小红旗：一条旗杆加一串三角彩旗，每面旗是一个目标，颜色从下往上填满表示进度；全部目标的完成度决定红旗在旗杆上升到多高（`goals.yaml` 的 `done`、`total`、`unit`）。
  - 鸟屋：树枝下挂着一排小鸟屋，每个朋友一间，门牌上写名字和一句话；点一下小鸟飞出来，再在新标签页打开朋友的博客（`friends.yaml`）。
  - 猫头鹰：猫头鹰举着对话框，输入关键词，它「想一想」（眼睛半闭）后叼来一卷卷轴，卷轴上有命中的那句正文（关键词高亮）；眼睛会跟着鼠标转。全文搜索靠 [Pagefind](https://pagefind.app)，索引在 `npm run build` 时生成，所以要用 `npm run build` 再 `npm run preview` 才能试到全文；`npm run dev` 里没有索引，只搜标题和标签。
  - 风铃：长短不一的五根风铃管，每根是一种订阅方式（RSS 地址可复制、Feedly、Inoreader、feed://、邮件占位）；鼠标划过会响，点一下选中；「摇一下风铃」全部摇响。
  - 信箱：「拆开信箱 · 写信」展开一张信纸，里面就是 giscus 的留言串，用 GitHub 登录就能寄出（开通方法见下面「留言和评论」）；`guestbook.yaml` 里的几封显示成钉在信箱上的信封，点开看内容。没开通 giscus 时，信纸只是本页草稿。
  - 木牌：一块刻着自我介绍的大木牌，下面用小绳挂着几块小木牌，每块是一个链接（`about.yaml` 的 `bio`、`links`）。
  - 吊床：吊床上躺着一本线圈本，每篇随笔是一页，翻页看摘要，点「接着往下读」进全文。
  - 窗台盆栽：窗台上一排花盆，每篇日常是一盆植物，越早写的越高、叶子越多，花盆前贴着标签。
  - 图纸桶：展开一张蓝色图纸，白色网格线，「最近在忙」的每一条是图上的一处标注（`now.yaml`）。
- 树屋的主人：一个小人在树屋里随机找事做（弹琴、写代码、看书、看星星、查信箱……），每隔二三十秒换一处，同一层走过去，换楼层就淡出淡入；晚上更爱待在吊床和望远镜边。点她一下会说话，再点一下打开她身边那个物品。
  现有动作：站、弹琴、敲代码、吊床看书、凑近看（望远镜和工具墙）、踮脚拿书，走路两帧交替。
  动作图放在 `public/treehouse/me/`（透明背景、裁到人物边缘），在 `src/scripts/treehouse.js` 的 `ME_POSES` 里登记：`h` 是在画面里的高度（占画面高度的百分比），`ar` 是图片宽高比；
  没登记的动作用站姿代替。每个活动点的位置、台词、用哪个动作在同一处的 `ME_SPOTS` 里改，原图存在 `tools/art/me/`。
- 「‹ 上一个 / 下一个 ›」或键盘左右键：镜头平移到相邻的物品。点 ×、Esc、「回到全景」或画面空白处拉回全景。
- 每个物品都有自己的地址，例如 `/#piano`，打开就直接推近到钢琴；文章页的「回到树屋」也会回到对应物品。
- 拉绳台灯：切换白天 / 夜晚。夜晚会出现月亮和星星，窗户、台灯和灯串会亮。
- 神经网络灯串：点一下跑一次「前向传播」，灯泡按层依次亮起。
- 绳索吊篮：选一层楼，镜头像电梯一样放大到那一层。
- 系统开启「减少动态效果」时，动画会自动关掉。

## 接下来

- 把示例内容换成自己的，补齐非文章类物品的栏目页
- 留言板接入 giscus，搜索换成 Pagefind（文章多了以后）
- 英文版
- 个人形象（桌面宠物式的小人）
- 其他季节的树屋
