---
title: npm 装不上的时候
date: 2026-10-16
item: pegboard
tags: [Astro, 踩坑]
summary: 先做一个不需要 Node 的单文件预览，网站长什么样照样能看。
sample: true
---

搭网站的环境连不上 npm，Astro 跑不起来。退一步：页面的结构、样式和交互脚本本来就和框架无关，只是由 Astro 拼起来而已。

写一个 Python 脚本，按同样的数据拼出一个单文件 HTML，把 CSS 和 JS 内联进去，就得到了一个可以直接打开的预览。等能装依赖了，再用 Astro 正式构建。
