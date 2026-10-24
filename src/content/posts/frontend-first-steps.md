---
title: 回头看我的第一批前端练习
date: 2025-11-07
item: board
topic: frontend
tags: [HTML, CSS, JavaScript, 入门]
summary: 一个仿飞书的首页，一个四页的自我介绍小站。一年后带着现在的眼光重读，哪些写对了，哪些现在会换个写法。
---

大一刚开始学前端时写过两份练习，后来一起放在了 [GitHub：Cai-7/submit](https://github.com/Cai-7/submit)：

- **仿飞书首页**：照着飞书云文档的首页，做“新建 / 上传 / 模板库”三块卡片，鼠标移上去弹出菜单；
- **自我介绍小站**：主页、生活照、爱好、留言板四个页面，外加一个登录表单。

搭完这个树屋之后回头读这两份代码，挺像翻自己的旧笔记本：思路大致是对的，写法上的毛病也一眼能看出来。这篇把两者都记下来。

## 仿飞书首页：用 float 和 absolute 硬拼

![仿飞书首页：三张卡片，鼠标移到“新建”上时弹出文档、表格等菜单](/posts/frontend-first-steps/feishu-clone.webp)

做法很朴素：

- 三张卡片 `.box` 都是 `float: left`，宽度写成 `30vw`；
- 卡片里的大标题和小字用 `position: absolute` 摆到图标右边；
- 弹出菜单默认 `display: none`，鼠标移上去时用 JavaScript 改成 `block`：

```js
let a = document.querySelectorAll('.box');
let b = document.querySelectorAll('.menu');
for (let i = 0; i < a.length; i++) {
  a[i].onmouseover = () => { b[i].style.display = 'block'; }
  a[i].onmouseout = () => { b[i].style.display = 'none'; }
}
```

效果做出来了，但现在再看，有几处会换个写法：

| 当时的写法 | 问题 | 现在会怎么写 |
| --- | --- | --- |
| JS 监听 `mouseover` 显示菜单 | 三张卡片只有两个菜单，移到“模板库”上时 `b[2]` 是 `undefined`，会报错 | 纯 CSS：`.box:hover .menu { display: block }`，没有菜单的卡片自然什么也不发生 |
| `float` 排卡片 | 要靠 margin 估间距，换屏幕宽度就乱 | `display: flex; gap: 20px`，或者 grid |
| 文字用 `absolute` 定位 | 字一多就和图标重叠 | 图标和文字放进一个 flex 行里 |
| `width: 5vs` | 没有 `vs` 这个单位，整行被浏览器忽略 | `5vw`，或者干脆给图标固定像素 |
| `font-family: "weiruanyahei"` | 拼音不是字体名，等于没写 | `"Microsoft YaHei", "PingFang SC", sans-serif` |
| 图片路径 `images\新建策略.png` | 反斜杠是 Windows 习惯，换到服务器上不一定认 | 统一用 `/` |
| `<botton>`、`.botton` | 拼写错误，`<botton>` 也不是合法标签 | `<button>` |

## 自我介绍小站：开始会用 flex 了

第二份练习明显顺手了不少：每页都有一样的顶部导航，布局全部换成了 `display: flex` 加 `flex-direction`，按钮和卡片都有 `transition` 过渡。几处值得记一笔的交互：

**爱好页的唱片**：音乐卡片里有一张圆形的“唱片”，鼠标移上去就用 `@keyframes` 转起来：

```css
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
.music:hover .cd { animation: spin 10s linear infinite; }
```

**生活照的轮播**：左右按钮切图，下面的小圆点跟着高亮；`setInterval` 每 2 秒自动“点”一下右按钮，鼠标停在图上时 `clearInterval` 暂停，移开再重新开始。现在会改的一处是往左翻到头时写死了 `i = 4`，换成 `images.length - 1`，图片数量变了也不会出错。

**留言板**：

![留言板页面：一个输入框和“添加留言”按钮](/posts/frontend-first-steps/message-board.webp)

这是四页里逻辑最完整的一个：

- 输入框聚焦时显示“已输入多少字 / 200 字”，失焦时隐藏；
- 留言存进 `localStorage`，读取时用 `try...catch` 包住 `JSON.parse`，数据坏了也不会让整页挂掉；
- 删除按钮没有一个个绑定事件，而是在列表上做**事件委托**，根据 `data-id` 删掉对应那条。

现在看最该改的一处是渲染：

```js
`<div class="message">… <p>${msg}</p></div>`
```

用户输入的内容直接拼进 `innerHTML`，要是有人留言写一段 `<img src=x onerror=…>`，它就会被当成代码执行。应该先转义，或者用 `textContent` 把文字放进去。另外 `localStorage` 只存在自己的浏览器里，别人看不到我的留言，我也看不到别人的。它更像一个本地记事本，算不上留言板。

这个树屋的留言板用的是 giscus，留言存在 GitHub Discussions 里，所有人看到的是同一份。

## 还有一页表单笔记

仓库里还有一份 `表单.md`，是当时学表单记的笔记：`action` / `method` / `name` 各管什么，GET 和 POST 的区别（数据放在 URL 还是请求体、能不能缓存、适不适合传敏感信息），`input` 的各种 `type`，单选框为什么必须用相同的 `name`，`label` 怎么用 `for` 和 `id` 绑定输入框。

登录页就是照着这份笔记写的。回头看，那里的 `<label>用户名：</span>` 多了一个没有开头的 `</span>`；`label` 也没有用上笔记里写的 `for`，而是把 `input` 直接包在里面。这两种绑定方式都对，只是笔记和代码没对上。

## 一年后的感受

当时的写法大多是“先让它出来”：哪里不对就加一个 `absolute`，交互就靠 JS 改 `style`。现在会先想布局用 flex 还是 grid，交互能不能交给 CSS，用户输入要不要转义。这些后来都用在了这个树屋上。
