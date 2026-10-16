# 我的树屋 · 个人博客

一棵树，两层楼：楼下的工作坊写代码（技术），楼上的起居室过日子（生活）。
首页是一张可以点的树屋插画，白天和夜晚两套画面，每样东西都通向一个栏目。

基于 [Astro](https://astro.build)，构建出来是纯静态网站，可以免费部署在 Cloudflare Pages。

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

预览版里栏目链接都指向 `#`，因为栏目页只在 Astro 构建里才有。

## 目录结构

```
src/
  pages/index.astro          首页（树屋 + 右侧介绍、天色切换、目录）
  pages/[...slug].astro      各栏目的占位页，写好真正的栏目页后删掉对应路径即可
  layouts/Base.astro         全站外壳：页头导航、昼夜按钮
  components/Treehouse.astro 树屋场景
  scripts/mode.js            全站昼夜（跟随当地时间 / 白天 / 夜晚，记在 localStorage）
  scripts/treehouse.js       树屋交互：卡片、钢琴、风铃、唱片机、灯串、吊篮电梯、落叶……
  styles/global.css          全站颜色变量（白天 / 夜晚两套）和版式
  styles/treehouse.css       树屋场景的样式和动画
  data/site.json             博客名字、欢迎语、标语
  data/treehouse.json        物品数据（由 tools/make_data.py 生成，别直接改）
public/treehouse/            底图和抠好的物品图层
tools/
  make_data.py               物品文案、链接、目录分组都在这里改
  cut_objects.py             换了新画以后重新抠物品图层
  build_preview.py           生成不需要 Node 的单文件预览
  art/                       原画 day.png / night.png
  masks/                     每个物品的蒙版（白色=物品）
```

## 常见修改

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

## 部署到 Cloudflare Pages（免费）

1. 把这个文件夹推到一个 GitHub 仓库。
2. Cloudflare 控制台 → Workers & Pages → 创建 → Pages → 连接 Git，选这个仓库。
3. 框架预设选 **Astro**；构建命令 `npm run build`；输出目录 `dist`。
4. 部署完会得到一个 `*.pages.dev` 地址，全世界都能访问。
5. 想用自己的免费域名（eu.org、DigitalPlat 等二级域名）：申请下来后把域名的 NS 指向 Cloudflare，
   再在 Pages 项目的「自定义域」里绑定。最后把 `astro.config.mjs` 里的 `site` 换成你的域名。

## 首页交互一览

- 鼠标移到物品上：物品浮起放大、显示名字；点一下弹出介绍卡片，卡片里有「去看看」通往栏目。
- 手机上：点物品，卡片从底部滑出。键盘：Tab 逐个选物品，Enter 打开，Esc 关闭。
- 拉绳台灯：切换白天 / 夜晚。夜晚会出现月亮和星星，窗户、台灯和灯串会亮。
- 神经网络灯串：点一下跑一次「前向传播」，灯泡按层依次亮起。
- 钢琴可以弹 do 到高音 do；唱片机放一小段旋律；风铃会响；猫头鹰会眨眼。
- 绳索吊篮：选一层楼，镜头像电梯一样放大到那一层，「回到全景」返回。
- 系统开启「减少动态效果」时，动画会自动关掉。

## 接下来

- 写真正的栏目页和文章（Astro 内容集合 + MDX）
- 英文版
- 个人形象（桌面宠物式的小人）
- 其他季节的树屋
