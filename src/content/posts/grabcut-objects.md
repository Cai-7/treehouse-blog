---
title: 用 GrabCut 从插画里抠出 23 个物品
date: 2026-10-14
item: pegboard
tags: [OpenCV, 工具]
summary: 悬停放大的每个物品，都是从整张画里自动抠出来、再手工修过的。
sample: true
---

给每个物品画一个框，交给 OpenCV 的 GrabCut，它会自己分出前景和背景：

```python
mask = np.zeros(img.shape[:2], np.uint8)
cv2.grabCut(img, mask, (x, y, w, h), bgd, fgd, 6, cv2.GC_INIT_WITH_RECT)
fg = np.where((mask == 1) | (mask == 3), 255, 0).astype(np.uint8)
```

大部分物品一次就干净。望远镜把周围的树叶也算了进去，黑板边上粘了半个灯泡，这两个是手动修的。修好的蒙版存在 `tools/masks/`，以后换画只要重跑脚本。
