---
title: 聚类完全入门指南
date: 2026-10-17
item: board
topic: ml
tags: [机器学习, 聚类, scikit-learn]
summary: 从 K-Means、层次聚类到 DBSCAN，怎么选 K、怎么评估，最后做一个客户分群。
---

## 1. 什么是聚类？

### 1.1 生活中的聚类例子

想象你走进一个水果店：

```
你看到的水果摆放：
┌─────────────────────────────────────┐
│  🍎🍎🍎🍎🍎  │  🍊🍊🍊🍊🍊  │
│  苹果专区     │   橙子专区    │
├─────────────────────────────────────┤
│  🍌🍌🍌🍌🍌  │  🍇🍇🍇🍇🍇  │
│  香蕉专区     │   葡萄专区    │
└─────────────────────────────────────┘
```

**你是怎么知道哪些水果归为一类的？**

- 外观相似（颜色、形状）
- 口感相似
- 品种相同

**这就是聚类的核心思想**：把相似的物品归为一类！

### 1.2 聚类的正式定义

**聚类（Clustering）**是将数据集中的样本划分为若干个**互不相交**的子集，每个子集称为一个**簇（Cluster）**。

```
聚类的数学表达：

给定数据集 D = {x₁, x₂, ..., xₙ}

聚类将D划分为k个簇 C₁, C₂, ..., Cₖ，满足：

1. C₁ ∪ C₂ ∪ ... ∪ Cₖ = D（完全覆盖）
2. Cᵢ ∩ Cⱼ = ∅, ∀i ≠ j（互不相交）
3. 每个簇内部的样本"相似"
4. 不同簇之间的样本"不相似"
```

### 1.3 聚类的直观理解

```
假设我们有一些二维数据点：

原始数据（未分类）：
    ·    ·      ·  ·
  ·    ·    ·      ·
    ·      ·
  ·    ·    ·    ·
      ·      ·  ·    ·

聚类后：
    ●●●    ○○○  ●○○
  ●●    ○○    ●○○
    ●●      ○
  ●●    ○○    ●○○●●
      ●●      ○○●○○

● 表示簇1（蓝色）    ○ 表示簇2（红色）
```

### 1.4 聚类发现什么？

聚类可以发现数据中**自然存在的分组**，这些分组可能代表：

- 不同的客户群体
- 不同的行为模式
- 不同的产品类别
- 异常数据（单独成簇）

**关键点**：聚类不需要预先知道答案，是**无监督学习**的一种。

---

## 2. 聚类的应用场景

### 2.1 客户细分

```
电商平台的客户分群：

┌──────────────────────────────────────────────────┐
│                                                   │
│   高消费活跃用户 ←── 精准营销                       │
│       ↑                                          │
│   低价冲动型用户 ←── 推送优惠                      │
│       ↑                                          │
│   沉默用户 ←── 召回活动                           │
│                                                   │
└──────────────────────────────────────────────────┘
```

### 2.2 图像压缩

```
原始图像：每个像素都是独立的颜色
    ↓
聚类：将相似颜色合并
    ↓
压缩图像：只保留k种颜色
```

### 2.3 异常检测

```
正常数据点聚在一起
异常点单独成簇或远离其他簇

     · · ·  ·   ← 正常簇
  · · · · · ·
              × ← 异常点（单独）
```

### 2.4 其他应用

| 领域 | 应用 |
|------|------|
| 生物 | 基因表达分析、物种分类 |
| 金融 | 欺诈检测、投资组合分组 |
| 零售 | 商品推荐、库存管理 |
| 医疗 | 疾病亚型分析、患者分层 |
| 社交 | 社区发现、好友推荐 |
| 文本 | 主题发现、文档分类 |

---

## 3. 聚类 vs 分类

### 3.1 本质区别

| 特性 | 聚类（无监督） | 分类（监督） |
|------|---------------|-------------|
| **学习方式** | 无需标签 | 需要标签 |
| **目标** | 发现数据自然结构 | 预测已知类别 |
| **类别数量** | 未知，需确定 | 已知 |
| **评估方式** | 聚类质量指标 | 准确率等指标 |
| **典型算法** | K-Means, DBSCAN | 决策树, SVM |

### 3.2 图示对比

```
分类（有监督）：                    聚类（无监督）：
                                  
已知类别标签：                      不知道类别：
  ●●●○○○                          · · · · ·
  ●●●○○○                          · · · · ·
                                   
训练学习：                          自动发现：
  ●类：特征A大                   自然分组：
  ○类：特征A小                      ●●●●●
                                    ○○○○○
预测新数据：                        预测：
  知道类别 ● 或 ○                  不知道具体类别
```

### 3.3 什么时候用聚类？

**使用聚类当**：
- 没有标签数据
- 想探索数据的自然结构
- 想发现异常或离群点
- 需要客户分群等业务需求

**使用分类当**：
- 有标签数据
- 想预测已知的类别
- 评估指标明确

---

## 4. 相似度度量

### 4.1 为什么需要相似度度量？

聚类的核心是"把相似的放一起"。

**但"相似"如何量化？**

这就需要**相似度度量**！

### 4.2 欧氏距离

最常用的距离，适用于连续数值特征。

$$
d(x, y) = \sqrt{\sum_{i=1}^{n}(x_i - y_i)^2}
$$

```
二维示例：

点A(1, 1) 和 点B(4, 5)

欧氏距离 = √[(4-1)² + (5-1)²]
         = √[9 + 16]
         = √25
         = 5
```

### 4.3 曼哈顿距离

各维度距离之和。

$$
d(x, y) = \sum_{i=1}^{n}|x_i - y_i|
$$

```
二维示例：

点A(1, 1) 和 点B(4, 5)

曼哈顿距离 = |4-1| + |5-1|
           = 3 + 4
           = 7

形象理解：只能走水平和垂直的路
         ┌──→5
         ↓
    1 ────→ 4
    │←─ 3 ─→│
    ↓       │
    1       4
    ←─4────→
```

### 4.4 夹角余弦

衡量方向相似性，适用于文本或高维稀疏数据。

$$
\cos(\theta) = \frac{x \cdot y}{|x| \cdot |y|}
$$

```
示例：
向量A = (1, 2)  方向更偏向y轴
向量B = (2, 4)  方向相同（比例相同）
向量C = (2, 1)  方向偏向x轴

cos(A, B) = 1.0  → 完全相似（方向相同）
cos(A, C) = 0.8  → 比较相似
```

### 4.5 马氏距离

考虑变量间相关性的距离。

```
欧氏距离的问题：
身高180cm和体重80kg的人
与身高160cm和体重60kg的人

欧氏距离可能是5.66

但如果身高和体重相关，身高180cm的人通常更重
所以马氏距离更能反映真实相似性
```

### 4.6 距离度量选择指南

| 数据类型 | 推荐距离 |
|---------|---------|
| 低维连续数据 | 欧氏距离 |
| 高维稀疏数据 | 余弦相似度 |
| 类别特征 | 汉明距离 |
| 混合类型 | Gower距离 |
| 需要考虑相关性 | 马氏距离 |

---

## 5. K-Means聚类

### 5.1 K-Means的核心思想

**K-Means**是最经典的聚类算法，"K"表示要分成K个簇。

```
K-Means的核心思想：

1. 随机选择K个"中心点"作为初始簇中心

2. 把每个数据点分配给"最近的"中心点

3. 重新计算每个簇的中心点（均值）

4. 重复步骤2-3，直到中心点不再变化

就像：

1. 在教室里随机放K把椅子
2. 每个学生走到最近的椅子旁边
3. 每把椅子重新放到自己"势力范围"的中心
4. 重复2-3，直到没人换椅子
```

### 5.2 K-Means算法步骤

```
K-Means算法：
═══════════════════════════════════════════════════════════

输入：数据集D，簇数量K
输出：K个簇

【第1步】初始化
  随机选择K个样本作为初始簇中心
  或使用K-Means++初始化（更优）

【第2步】分配样本
  对每个样本xᵢ：
    计算到所有K个中心的距离
    将xᵢ分配给距离最近的中心所在簇

【第3步】更新中心
  对每个簇Cⱼ：
    计算该簇所有样本的均值
    用均值作为新的簇中心

【第4步】迭代
  重复步骤2-3，直到：
    - 中心点不再变化，或
    - 达到最大迭代次数

═══════════════════════════════════════════════════════════
```

### 5.3 图解K-Means过程

```
初始状态：随机选择K=2个中心点（★）

    ·  ·                        ★(中心1)
      ·    ·
    ·          ·  ·        ·
  ·      ·    ·
        ·
    ·        ·    ·    ·
              ·
                    ★(中心2)


第一步：分配样本（每个点归到最近的中心）

    ●  ●  │                    │(归中心1)
      ●  │    ●
    ●────┼────  ●  ●
        │    ●
    ●  │    ●  ●    ●
          │
                  │(归中心2)


第二步：更新中心（重新计算均值）

    ●  ●  │ ★新    ●  ●
      ●  │
    ●────┼─────────●
        │
    ●  │      ●  ●  ●  ★新
          │


重复迭代直到收敛...
```

### 5.4 K-Means的数学表达

K-Means的目标是最小化**簇内平方和（Within-Cluster Sum of Squares, WCSS）**：

$$
J = \sum_{j=1}^{K} \sum_{x_i \in C_j} ||x_i - \mu_j||^2
$$

| 符号 | 含义 |
|------|------|
| $K$ | 簇的数量 |
| $C_j$ | 第j个簇 |
| $x_i$ | 第i个样本 |
| $\mu_j$ | 第j个簇的中心 |

**目标**：最小化每个样本到其所属簇中心的距离平方和。

### 5.5 K-Means代码实现

```python
import numpy as np
import matplotlib.pyplot as plt
from sklearn.datasets import make_blobs

# 生成示例数据
np.random.seed(42)
X, _ = make_blobs(n_samples=300, centers=3, cluster_std=1.0)

# ======== K-Means实现 ========

def kmeans(X, K, max_iter=100, tol=1e-4):
    """
    K-Means聚类
    
    参数:
        X: 数据 (n_samples, n_features)
        K: 簇数量
        max_iter: 最大迭代次数
        tol: 收敛阈值
    """
    n_samples, n_features = X.shape
    
    # 随机初始化中心
    idx = np.random.choice(n_samples, K, replace=False)
    centers = X[idx].copy()
    
    for iteration in range(max_iter):
        # 步骤1：分配样本到最近的中心
        distances = np.zeros((n_samples, K))
        for k in range(K):
            distances[:, k] = np.sqrt(np.sum((X - centers[k]) ** 2, axis=1))
        labels = np.argmin(distances, axis=1)
        
        # 步骤2：更新中心
        new_centers = np.zeros((K, n_features))
        for k in range(K):
            mask = labels == k
            if np.sum(mask) > 0:
                new_centers[k] = np.mean(X[mask], axis=0)
            else:
                new_centers[k] = centers[k]
        
        # 检查收敛
        if np.sum(np.abs(new_centers - centers)) < tol:
            print(f"在第{iteration+1}次迭代收敛")
            break
        
        centers = new_centers
    
    # 计算WCSS
    wcss = 0
    for k in range(K):
        mask = labels == k
        wcss += np.sum((X[mask] - centers[k]) ** 2)
    
    return labels, centers, wcss

# 使用sklearn的K-Means
from sklearn.cluster import KMeans

# 训练
kmeans = KMeans(n_clusters=3, init='k-means++', n_init=10, random_state=42)
labels = kmeans.fit_predict(X)
centers = kmeans.cluster_centers_

# 可视化
plt.figure(figsize=(10, 5))
plt.scatter(X[:, 0], X[:, 1], c=labels, cmap='viridis', alpha=0.6)
plt.scatter(centers[:, 0], centers[:, 1], c='red', marker='★', s=200)
plt.title('K-Means聚类结果 (K=3)')
plt.savefig('kmeans_result.png', dpi=150)
plt.show()
```

### 5.6 K-Means的优缺点

**优点**：

| 优点 | 说明 |
|------|------|
| 简单易理解 | 算法直观，容易解释 |
| 高效快速 | 时间复杂度O(nKI)，适合大数据 |
| 可扩展性好 | 适合大规模数据 |
| 效果好 | 对球形簇效果好 |

**缺点**：

| 缺点 | 说明 |
|------|------|
| 需要指定K | 需预先知道簇数量 |
| 对初始中心敏感 | 不同初始化可能不同结果 |
| 只适合球形簇 | 无法发现非凸形状 |
| 对噪声敏感 | 噪声点会影响中心计算 |
| 假设簇大小相似 | 大簇会吞并小簇 |

---

## 6. K-Means++初始化

### 6.1 为什么要改进初始化？

普通K-Means的随机初始化可能导致：

```
问题1：初始中心扎堆
    ★        ★      ← 两个中心很近
      · · ·
    · ·   · · ·
    
问题2：局部最优
    可能收敛到不好的结果

问题3：不稳定
    每次运行结果可能不同
```

### 6.2 K-Means++的初始化策略

```
K-Means++初始化：
═══════════════════════════════════════════════════════════

【第1步】随机选1个中心
  从数据中随机选择一个样本作为第1个中心

【第2步】计算距离
  计算每个样本到已有中心的距离
  选择距离最远的样本作为下一个中心

【第3步】重复
  重复步骤2，直到选出K个中心

【关键思想】
  已选中心要尽量分散
  距离越远越可能被选中

═══════════════════════════════════════════════════════════
```

### 6.3 K-Means++的数学表达

选择下一个中心$c$的概率：

$$
P(c) = \frac{D(c)^2}{\sum_{x \in X} D(x)^2}
$$

其中 $D(x)$ 是样本 $x$ 到最近已选中心的距离。

### 6.4 K-Means++效果对比

```
普通随机初始化：          K-Means++初始化：

  ●      ○                ●    ●
   ●    ○                 ●      ○
  ●●●●  ○     ← 局部最优    ●●●●○○   ← 全局更优
   ●●  ○                  ●●    ○
                             ●●○○
```

### 6.5 sklearn中使用K-Means++

```python
from sklearn.cluster import KMeans

# 默认就是K-Means++
kmeans = KMeans(
    n_clusters=3,
    init='k-means++',  # 默认使用K-Means++
    n_init=10,         # 运行10次取最优
    random_state=42
)
labels = kmeans.fit_predict(X)
```

---

## 7. 如何选择K值

### 7.1 为什么K值很重要？

```
K值选择的影响：

K太小 → 欠聚类（把不相似的数据合在一起）
K太大 → 过聚类（把相似的数据拆开）
K合适 → 恰到好处
```

### 7.2 肘部法则（Elbow Method）

**核心思想**：随着K增加，WCSS会下降。但下降速度会"肘部"处变缓。

```
WCSS
  ↑
  │╲
  │  ╲
  │    ╲
  │     ╲___
  │        ╲___
  │            ╲_____
  └────────────────────→ K
          ↑
        肘部（最佳K）
```

### 7.3 肘部法则代码

```python
from sklearn.cluster import KMeans
import matplotlib.pyplot as plt

# 生成示例数据
np.random.seed(42)
X, _ = make_blobs(n_samples=300, centers=3, cluster_std=1.0)

# 测试不同K值
K_range = range(1, 11)
wcss_list = []

for K in K_range:
    kmeans = KMeans(n_clusters=K, init='k-means++', n_init=10, random_state=42)
    kmeans.fit(X)
    wcss_list.append(kmeans.inertia_)

# 绘制肘部曲线
plt.figure(figsize=(10, 5))
plt.plot(K_range, wcss_list, 'bo-', linewidth=2, markersize=8)
plt.xlabel('K值（簇数量）')
plt.ylabel('WCSS（簇内平方和）')
plt.title('肘部法则 - 寻找最优K值')
plt.xticks(K_range)
plt.grid(True, alpha=0.3)

# 标记肘部位置（通常是3）
plt.axvline(x=3, color='r', linestyle='--', label='推荐K=3')
plt.legend()
plt.savefig('elbow_method.png', dpi=150)
plt.show()

print("WCSS随K值变化:")
for K, wcss in zip(K_range, wcss_list):
    print(f"K={K}: WCSS={wcss:.2f}")
```

### 7.4 轮廓系数（Silhouette Score）

衡量聚类质量，范围[-1, 1]，越接近1越好。

```
轮廓系数公式：

s(i) = (b(i) - a(i)) / max(a(i), b(i))

其中：
- a(i): 样本i到同簇其他样本的平均距离（内聚度）
- b(i): 样本i到最近簇的平均距离（分离度）
```

**解释**：
- s(i) 接近1：样本在自己的簇中，与其他簇分离良好
- s(i) 接近0：样本在两个簇的边界
- s(i) 接近-1：样本可能分错簇

### 7.5 轮廓系数代码

```python
from sklearn.metrics import silhouette_score
import numpy as np

# 测试不同K值的轮廓系数
silhouette_scores = []

for K in range(2, 11):
    kmeans = KMeans(n_clusters=K, init='k-means++', n_init=10, random_state=42)
    labels = kmeans.fit_predict(X)
    score = silhouette_score(X, labels)
    silhouette_scores.append(score)
    print(f"K={K}: 轮廓系数={score:.4f}")

# 绘制轮廓系数曲线
plt.figure(figsize=(10, 5))
plt.plot(range(2, 11), silhouette_scores, 'go-', linewidth=2, markersize=8)
plt.xlabel('K值')
plt.ylabel('轮廓系数')
plt.title('轮廓系数 - 越高越好')
plt.grid(True, alpha=0.3)
best_K = np.argmax(silhouette_scores) + 2
plt.axvline(x=best_K, color='r', linestyle='--', label=f'推荐K={best_K}')
plt.legend()
plt.savefig('silhouette_score.png', dpi=150)
plt.show()
```

### 7.6 经验法则

```
K值选择经验法则：

1. 领域知识优先
   - 如果知道业务需要分成几类，用那个数

2. 肘部法则
   - 看WCSS下降速度变化

3. 轮廓系数
   - 选轮廓系数最高的K

4. 数据特性
   - 如果数据明显有N个自然分组，K=N

5. 业务可解释性
   - K太小或太大都不利于业务理解
```

---

## 8. 层次聚类

### 8.1 什么是层次聚类？

**层次聚类**通过构建**树形结构**来组织数据，不需要预先指定K值。

```
层次聚类的树形结构（树状图/Dendrogram）：

                    ┌─簇C
                ┌───┤
            ┌───┤   └─簇D
        ┌───┤
    ┌───┤   └─簇E
    │
────┤
    │   ┌─簇F
    └───┤
        └─簇G

    ←─────聚类粒度细─────→

从下往上看：
- 最底部：每个样本是一个簇
- 向上合并：越来越大的簇
- 可以在任意高度"切一刀"得到K个簇
```

### 8.2 层次聚类的两种策略

**1. 自底向上（Agglomerative）**

```
从每个样本是独立簇开始，逐步合并：
    
    ① ② ③ ④ ⑤ ⑥
    ↓ ↓ ↓ ↓ ↓ ↓
    ① ②③④ ⑤ ⑥
    ↓ ↓   ↓ ↓ ↓
    ① ②③④ ⑤⑥
    ↓     ↓
    ①②③④ ⑤⑥
    ↓
    ①②③④⑤⑥
```

**2. 自顶向下（Divisive）**

```
从一个包含所有样本的簇开始，逐步分裂：
    
    ①②③④⑤⑥
    ↓
    ①②③ │ ④⑤⑥
    ↓     ↓
    ①② │ ③ │ ④⑤ │ ⑥
    ↓   ↓   ↓   ↓
    ① ② ③ ④ ⑤ ⑥
```

### 8.3 簇间距离计算方法

如何计算两个簇之间的"距离"？

| 方法 | 公式 | 特点 |
|------|------|------|
| **最近邻（Single）** | min距离 | 容易产生链式效应 |
| **最远邻（Complete）** | max距离 | 倾向于发现紧凑簇 |
| **平均（Average）** | 平均距离 | 折中选择 |
| **Ward** | 方差减少量 | 最常用，效果好 |

```
Single Linkage:          Complete Linkage:
    
    A                      A
    ·                      ·
    ·   B                  ·   B
        ·                      ·
        ·   C                  ·   C

Single: 距离(A,B)=最近点距离
Complete: 距离(A,B)=最远点距离
```

### 8.4 Ward方法详解

Ward方法选择合并后**方差增加最小**的两个簇。

```
Ward距离公式：

d(A, B) = Σ(x - μ_A)² + Σ(y - μ_B)² - Σ(z - μ_AB)²

解释：
- 合并前：各簇内部平方和
- 合并后：合并簇内部平方和
- 差值：合并导致的额外方差
```

### 8.5 层次聚类代码

```python
from sklearn.cluster import AgglomerativeClustering
from scipy.cluster.hierarchy import dendrogram, linkage
import matplotlib.pyplot as plt
import numpy as np

# 生成示例数据
np.random.seed(42)
X, _ = make_blobs(n_samples=50, centers=3, cluster_std=0.8)

# 绘制树状图
plt.figure(figsize=(14, 5))

plt.subplot(1, 2, 1)
Z = linkage(X, method='ward')
dendrogram(Z, truncate_mode='lastp', p=30)
plt.title('Ward层次聚类树状图')
plt.xlabel('样本或簇')
plt.ylabel('距离')

# 层次聚类
plt.subplot(1, 2, 2)
hc = AgglomerativeClustering(n_clusters=3, linkage='ward')
labels = hc.fit_predict(X)
plt.scatter(X[:, 0], X[:, 1], c=labels, cmap='viridis', alpha=0.6)
plt.title('层次聚类结果 (K=3)')
plt.savefig('hierarchical_clustering.png', dpi=150)
plt.show()
```

### 8.6 层次聚类vs K-Means

| 特性 | K-Means | 层次聚类 |
|------|---------|----------|
| **复杂度** | O(nKI) | O(n²log n) |
| **K值** | 需预先指定 | 可从树状图推断 |
| **簇形状** | 球形 | 任意形状 |
| **稳定性** | 依赖初始化 | 确定性的 |
| **内存** | 小 | 大（需存储距离矩阵） |
| **适用场景** | 大数据 | 小数据、需要层次结构 |

---

## 9. DBSCAN聚类

### 9.1 DBSCAN是什么？

**DBSCAN（Density-Based Spatial Clustering of Applications with Noise）**

中文：**基于密度的空间聚类应用**

**核心思想**：把密集的点聚在一起，稀疏的点视为噪声。

```
DBSCAN vs K-Means：

K-Means（假设3个球形簇）：
    ●●●●●   ○○○○○   ■■■■■

DBSCAN（发现4个不同形状的簇）：
      ●●●●●
    ●●●●●○○○       ■■■■■
    ●●●●●○○○○○○○○   ■■■■■■■
        ●●●●○○○○○   ■■■■■
              ●●○○
                
        × ← 噪声点（单独）
```

### 9.2 DBSCAN的核心概念

```
┌─────────────────────────────────────────────────────────────┐
│                      DBSCAN三要素                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. ε-邻域（Epsilon Neighborhood）                       │
│     以点p为中心，半径ε内的区域                              │
│                                                             │
│  2. 核心点（Core Point）                                   │
│     ε-邻域内至少有min_samples个点                         │
│                                                             │
│  3. 边界点（Border Point）                                │
│     在某个核心点的ε-邻域内，但不是核心点                   │
│                                                             │
│  4. 噪声点（Noise Point）                                 │
│     既不是核心点，也不是边界点                               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 9.3 DBSCAN算法步骤

```
DBSCAN算法：
═══════════════════════════════════════════════════════════

输入：数据集D，邻域半径ε，最小点数min_samples

【第1步】标记所有点为"未访问"

【第2步】对每个未访问点p：

  a) 找到p的ε-邻域点集N(p)
  
  b) 如果 |N(p)| < min_samples：
     - 标记p为噪声点（可能是边界点）
     
  c) 如果 |N(p)| >= min_samples：
     - 创建新簇C
     - 把p和N(p)加入簇C
     - 对N(p)中每个点q：
       * 如果q未访问：
         → 找到q的ε-邻域N(q)
         → 如果 |N(q)| >= min_samples：
           → 把N(q)合并到N(p)
         → 把q加入簇C
       * 如果q已在某簇：
         → 跳过
     - 继续下一个未访问点

═══════════════════════════════════════════════════════════
```

### 9.4 DBSCAN图解

```
初始数据点：
    · · ·  ·   ·
  ·    ·    ·
    ·
  ·    ·    ·  ·

ε-邻域（ε=某个距离）：
    
    ①━┐
  ·    ·┃    ·   ·
    ┌──┘
    │    ·
  ·    ┃    ·
    ┌──┘  ②━┐
    │      ┌─┘
  ·    ·  │    ·  ·
    
①的邻域有4个点（核心点）
②的邻域有2个点（可能是噪声）

↓ 发现簇

    ●●●●   ●●
  ●    ●    ●
    ●●●
  ●    ●    ●  ●
    
    ● = 簇内点
    · = 噪声点
```

### 9.5 DBSCAN参数选择

```
DBSCAN两个关键参数：

1. ε（eps）：邻域半径
   - 太大会把所有点合为一簇
   - 太小会产生很多噪声点
   - 选择方法：K-距离图

2. min_samples：最小点数
   - 一般设为数据维数的2倍
   - 或设为数据量的1-10%
```

### 9.6 K-距离图选ε

```
K-距离图方法：

1. 计算每个点到第K个最近邻的距离
2. 按距离排序
3. 找"肘部"位置

距离
  ↑
  │         ╭──── ← 陡峭区域（高密度）
  │     ╭──╯
  │ ╭──╯          ← 平缓区域（低密度）
  │╭╯
  └────────────────────→ K-距离排序
      ↑
    肘部 → 选择ε
```

### 9.7 DBSCAN代码

```python
from sklearn.cluster import DBSCAN
from sklearn.neighbors import NearestNeighbors
import matplotlib.pyplot as plt
import numpy as np

# 生成非凸形状数据（K-Means处理不好）
from sklearn.datasets import make_moons
X, _ = make_moons(n_samples=200, noise=0.05, random_state=42)

# 找最优ε（K-距离图）
neighbors = NearestNeighbors(n_neighbors=5)
neighbors_fit = neighbors.fit(X)
distances, indices = neighbors_fit.kneighbors(X)
distances = np.sort(distances[:, 4])  # 第5个邻居的距离

plt.figure(figsize=(10, 5))
plt.subplot(1, 2, 1)
plt.plot(distances)
plt.xlabel('点（按距离排序）')
plt.ylabel('到第5近邻的距离')
plt.title('K-距离图（找ε）')
plt.axhline(y=0.3, color='r', linestyle='--', label='ε=0.3')
plt.legend()
plt.grid(True, alpha=0.3)

# DBSCAN聚类
dbscan = DBSCAN(eps=0.3, min_samples=5)
labels = dbscan.fit_predict(X)

plt.subplot(1, 2, 2)
plt.scatter(X[:, 0], X[:, 1], c=labels, cmap='viridis', alpha=0.6)
plt.title('DBSCAN聚类结果')
plt.savefig('dbscan_result.png', dpi=150)
plt.show()

# 统计聚类结果
n_clusters = len(set(labels)) - (1 if -1 in labels else 0)
n_noise = list(labels).count(-1)
print(f"发现簇数量: {n_clusters}")
print(f"噪声点数量: {n_noise}")
```

### 9.8 DBSCAN vs K-Means

| 特性 | DBSCAN | K-Means |
|------|--------|----------|
| **簇形状** | 任意形状 | 球形 |
| **噪声处理** | 自动识别 | 无法处理 |
| **参数** | ε, min_samples | K |
| **簇大小** | 不要求相等 | 会平衡 |
| **初始化** | 无需 | 依赖初始化 |
| **复杂度** | O(n²) | O(nKI) |

---

## 10. 其他聚类算法

### 10.1 高斯混合模型（GMM）

**GMM**假设数据由多个高斯分布混合生成。

```
K-Means：              GMM：
  ●●●●●               ●●○○○
  ●●●●●     →         ●●○○○
  ○○○○○               ●●○○○

硬分配                软分配
(每个点只属于一个簇)   (每个点以一定概率属于各簇)
```

```python
from sklearn.mixture import GaussianMixture

gmm = GaussianMixture(n_components=3, random_state=42)
labels = gmm.fit_predict(X)
probs = gmm.predict_proba(X)  # 各簇概率
```

### 10.2 谱聚类（Spectral Clustering）

基于图论的方法，适合发现任意形状的簇。

```python
from sklearn.cluster import SpectralClustering

spectral = SpectralClustering(n_clusters=3, affinity='nearest_neighbors')
labels = spectral.fit_predict(X)
```

### 10.3 算法选择指南

```
┌─────────────────────────────────────────────────────────────┐
│                      聚类算法选择                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  数据量小，需要层次结构？                                    │
│  → 层次聚类                                                 │
│                                                             │
│  数据量大，簇接近球形？                                      │
│  → K-Means                                                  │
│                                                             │
│  数据形状不规则，有噪声？                                    │
│  → DBSCAN                                                   │
│                                                             │
│  需要软聚类（概率）？                                        │
│  → GMM                                                       │
│                                                             │
│  复杂形状，高维数据？                                        │
│  → 谱聚类                                                   │
│                                                             │
│  不知道簇数量？                                              │
│  → DBSCAN，或用轮廓系数评估K-Means                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 11. 聚类评估指标

### 11.1 内部评估指标（无需真实标签）

**1. WCSS（簇内平方和）**

越小越好，但K越大WCSS越小。

**2. 轮廓系数（Silhouette Score）**

$$
s = \frac{b - a}{max(a, b)}
$$

- 范围：[-1, 1]
- 越接近1越好
- 考虑内聚度和分离度

**3. Calinski-Harabasz指数**

$$
CH = \frac{BGSS / (K-1)}{WGSS / (n-K)}
$$

- 越大越好
- BGSS = 簇间平方和
- WGSS = 簇内平方和

**4. Davies-Bouldin指数**

$$
DB = \frac{1}{K} \sum_{i=1}^{K} \max_{j \neq i} \frac{S_i + S_j}{d(c_i, c_j)}
$$

- 越小越好
- $S_i$ = 簇i的内聚度
- $d(c_i, c_j)$ = 簇i和j的中心距离

### 11.2 外部评估指标（需要真实标签）

**1. 调整兰德指数（Adjusted Rand Index, ARI）**

$$
ARI = \frac{2(ad - bc)}{n(n-1)}
$$

- 范围：[-1, 1]
- 1 = 完全一致
- 0 = 随机分配

**2. 归一化互信息（NMI）**

$$
NMI = \frac{2 \cdot I(U, V)}{\sqrt{H(U) \cdot H(V)}}
$$

- 范围：[0, 1]
- 越大越好
- 衡量两个聚类的一致性

### 11.3 评估指标代码

```python
from sklearn.metrics import silhouette_score, calinski_harabasz_score, davies_bouldin_score
from sklearn.metrics import adjusted_rand_score, normalized_mutual_info_score

# 假设y_true是真实标签，labels是聚类结果
y_true = ...  # 真实标签
labels = ...  # 聚类标签

# 内部指标（不需要真实标签）
silhouette = silhouette_score(X, labels)
calinski = calinski_harabasz_score(X, labels)
davies = davies_bouldin_score(X, labels)

print(f"轮廓系数: {silhouette:.4f} (越高越好)")
print(f"CH指数: {calinski:.4f} (越高越好)")
print(f"DB指数: {davies:.4f} (越低越好)")

# 外部指标（需要真实标签）
ari = adjusted_rand_score(y_true, labels)
nmi = normalized_mutual_info_score(y_true, labels)

print(f"\n调整兰德指数(ARI): {ari:.4f} (1=完美)")
print(f"归一化互信息(NMI): {nmi:.4f} (1=完美)")
```

### 11.4 评估指标选择指南

| 情况 | 推荐指标 |
|------|---------|
| 不知道真实标签 | 轮廓系数、CH指数、DB指数 |
| 有真实标签 | ARI、NMI |
| 评估不同K值 | 轮廓系数、WCSS |
| 比较不同算法 | 多指标综合 |

---

## 12. 特征预处理

### 12.1 为什么要预处理？

聚类对特征尺度敏感！

```
问题示例：

特征A: 收入 [0, 100万]
特征B: 年龄 [0, 100]

如果不处理：
- 收入差100 = 距离贡献100
- 年龄差100 = 距离贡献100
- 但100万的收入差异 vs 100岁年龄差异含义不同！
```

### 12.2 标准化（Z-score）

将特征转换为均值为0，标准差为1。

$$
x' = \frac{x - \mu}{\sigma}
$$

```python
from sklearn.preprocessing import StandardScaler

scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)
```

### 12.3 归一化（Min-Max）

将特征缩放到[0, 1]区间。

$$
x' = \frac{x - x_{min}}{x_{max} - x_{min}}
$$

```python
from sklearn.preprocessing import MinMaxScaler

scaler = MinMaxScaler()
X_normalized = scaler.fit_transform(X)
```

### 12.4 对数变换

处理偏态分布。

```python
X_log = np.log1p(X)  # log(1+x)避免log(0)
```

### 12.5 预处理流程

```python
import pandas as pd
from sklearn.preprocessing import StandardScaler, MinMaxScaler

# 创建示例数据
data = pd.DataFrame({
    'income': [30000, 50000, 80000, 120000, 200000],  # 右偏
    'age': [20, 30, 40, 50, 60],                      # 均匀
    'score': [0.1, 0.5, 0.8, 0.9, 0.95]             # 有界
})

print("原始数据统计:")
print(data.describe())

# 标准化
scaler = StandardScaler()
X_scaled = scaler.fit_transform(data)

print("\n标准化后:")
print(pd.DataFrame(X_scaled, columns=data.columns).describe())
```

---

## 13. 实战项目：客户分群

### 13.1 项目背景

使用银行客户数据，进行客户分群，帮助业务团队制定差异化营销策略。

### 13.2 数据加载与探索

```python
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans, DBSCAN
from sklearn.metrics import silhouette_score, silhouette_samples
import warnings
warnings.filterwarnings('ignore')

# 生成模拟银行客户数据
np.random.seed(42)
n_samples = 500

# 创建客户数据
data = {
    'customer_id': range(1, n_samples + 1),
    'age': np.random.normal(40, 15, n_samples).clip(18, 80).astype(int),
    'annual_income': np.random.lognormal(10.5, 0.5, n_samples),
    'spending_score': np.random.normal(50, 25, n_samples).clip(0, 100),
    'credit_score': np.random.normal(650, 100, n_samples).clip(300, 850).astype(int),
    'tenure_years': np.random.exponential(3, n_samples).clip(0, 15),
}

df = pd.DataFrame(data)

# 添加一些真实模式（让数据有自然聚类结构）
# 高收入高消费年轻人群
mask1 = (df['age'] < 35) & (df['annual_income'] > 60000) & (df['spending_score'] > 60)
df.loc[mask1, 'segment'] = '年轻高消费'

# 高收入低消费中年人群
mask2 = (df['age'] > 40) & (df['annual_income'] > 70000) & (df['spending_score'] < 40)
df.loc[mask2, 'segment'] = '富裕保守'

# 普通人群
mask3 = ~(mask1 | mask2)
df.loc[mask3, 'segment'] = '普通客户'

df['segment'] = df['segment'].fillna('普通客户')

print("=" * 60)
print("银行客户分群实战项目")
print("=" * 60)

print(f"\n数据集大小: {df.shape}")
print(f"\n客户分布:")
print(df['segment'].value_counts())

# 数据概览
print("\n数据统计:")
print(df.describe())
```

### 13.3 数据预处理

```python
# 数据预处理
print("\n" + "=" * 60)
print("步骤1：数据预处理")
print("=" * 60)

# 选择聚类特征
features = ['age', 'annual_income', 'spending_score', 'credit_score', 'tenure_years']
X = df[features].values

print(f"聚类特征: {features}")
print(f"特征数量: {len(features)}")

# 标准化
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

print("\n标准化后数据统计:")
X_scaled_df = pd.DataFrame(X_scaled, columns=features)
print(X_scaled_df.describe().round(2))

# 可视化原始数据分布
plt.figure(figsize=(14, 5))

plt.subplot(1, 3, 1)
plt.scatter(df['annual_income'], df['spending_score'], 
           c='steelblue', alpha=0.5)
plt.xlabel('年收入')
plt.ylabel('消费评分')
plt.title('收入 vs 消费')

plt.subplot(1, 3, 2)
plt.scatter(df['age'], df['spending_score'], 
           c='coral', alpha=0.5)
plt.xlabel('年龄')
plt.ylabel('消费评分')
plt.title('年龄 vs 消费')

plt.subplot(1, 3, 3)
plt.scatter(df['age'], df['annual_income'], 
           c='green', alpha=0.5)
plt.xlabel('年龄')
plt.ylabel('年收入')
plt.title('年龄 vs 收入')

plt.tight_layout()
plt.savefig('customer_data_exploration.png', dpi=150)
plt.show()
```

### 13.4 确定最优K值

```python
# 确定最优K值
print("\n" + "=" * 60)
print("步骤2：确定最优K值")
print("=" * 60)

K_range = range(2, 11)
wcss_list = []
silhouette_scores = []

for K in K_range:
    kmeans = KMeans(n_clusters=K, init='k-means++', n_init=10, random_state=42)
    labels = kmeans.fit_predict(X_scaled)
    
    wcss_list.append(kmeans.inertia_)
    score = silhouette_score(X_scaled, labels)
    silhouette_scores.append(score)
    print(f"K={K}: WCSS={kmeans.inertia_:.2f}, 轮廓系数={score:.4f}")

# 绘制评估曲线
plt.figure(figsize=(14, 5))

plt.subplot(1, 2, 1)
plt.plot(K_range, wcss_list, 'bo-', linewidth=2, markersize=8)
plt.xlabel('K值')
plt.ylabel('WCSS')
plt.title('肘部法则 - 寻找最优K')
plt.grid(True, alpha=0.3)
plt.xticks(K_range)

plt.subplot(1, 2, 2)
plt.plot(K_range, silhouette_scores, 'go-', linewidth=2, markersize=8)
plt.xlabel('K值')
plt.ylabel('轮廓系数')
plt.title('轮廓系数 - 越高越好')
plt.grid(True, alpha=0.3)
plt.xticks(K_range)

best_K = K_range[np.argmax(silhouette_scores)]
plt.axvline(x=best_K, color='r', linestyle='--', label=f'推荐K={best_K}')
plt.legend()

plt.tight_layout()
plt.savefig('optimal_k_selection.png', dpi=150)
plt.show()

print(f"\n根据轮廓系数，推荐K={best_K}")
```

### 13.5 K-Means聚类

```python
# K-Means聚类
print("\n" + "=" * 60)
print(f"步骤3：K-Means聚类 (K={best_K})")
print("=" * 60)

# 训练
kmeans = KMeans(n_clusters=best_K, init='k-means++', n_init=10, random_state=42)
df['cluster'] = kmeans.fit_predict(X_scaled)
centers_scaled = kmeans.cluster_centers_

# 将中心点转换回原始尺度
centers = scaler.inverse_transform(centers_scaled)
centers_df = pd.DataFrame(centers, columns=features)

print("\n各簇中心点:")
print(centers_df.round(2))

print("\n各簇客户数量:")
print(df['cluster'].value_counts().sort_index())

# 簇特征分析
print("\n各簇特征均值:")
cluster_stats = df.groupby('cluster')[features].mean()
print(cluster_stats.round(2))
```

### 13.6 聚类结果可视化

```python
# 聚类结果可视化
print("\n" + "=" * 60)
print("步骤4：聚类结果可视化")
print("=" * 60)

# 主要特征散点图
fig, axes = plt.subplots(2, 3, figsize=(15, 10))

# 收入 vs 消费
ax = axes[0, 0]
for i in range(best_K):
    mask = df['cluster'] == i
    ax.scatter(df.loc[mask, 'annual_income'], 
              df.loc[mask, 'spending_score'],
              label=f'簇{i}', alpha=0.6)
ax.scatter(centers[:, 1], centers[:, 2], 
         c='red', marker='★', s=200, edgecolors='black')
ax.set_xlabel('年收入')
ax.set_ylabel('消费评分')
ax.set_title('收入 vs 消费')
ax.legend()

# 年龄 vs 消费
ax = axes[0, 1]
for i in range(best_K):
    mask = df['cluster'] == i
    ax.scatter(df.loc[mask, 'age'], 
              df.loc[mask, 'spending_score'],
              label=f'簇{i}', alpha=0.6)
ax.set_xlabel('年龄')
ax.set_ylabel('消费评分')
ax.set_title('年龄 vs 消费')

# 年龄 vs 收入
ax = axes[0, 2]
for i in range(best_K):
    mask = df['cluster'] == i
    ax.scatter(df.loc[mask, 'age'], 
              df.loc[mask, 'annual_income'],
              label=f'簇{i}', alpha=0.6)
ax.set_xlabel('年龄')
ax.set_ylabel('年收入')
ax.set_title('年龄 vs 收入')

# 信用评分 vs 消费
ax = axes[1, 0]
for i in range(best_K):
    mask = df['cluster'] == i
    ax.scatter(df.loc[mask, 'credit_score'], 
              df.loc[mask, 'spending_score'],
              label=f'簇{i}', alpha=0.6)
ax.set_xlabel('信用评分')
ax.set_ylabel('消费评分')
ax.set_title('信用评分 vs 消费')

# 各簇大小
ax = axes[1, 1]
cluster_counts = df['cluster'].value_counts().sort_index()
ax.bar(cluster_counts.index, cluster_counts.values, color='steelblue')
ax.set_xlabel('簇编号')
ax.set_ylabel('客户数量')
ax.set_title('各簇客户数量')
for i, v in enumerate(cluster_counts.values):
    ax.text(i, v + 5, str(v), ha='center')

# 簇特征雷达图
ax = axes[1, 2]
cluster_stats_normalized = (cluster_stats - cluster_stats.min()) / (cluster_stats.max() - cluster_stats.min())
cluster_stats_normalized.T.plot(kind='bar', ax=ax)
ax.set_xlabel('特征')
ax.set_ylabel('标准化值')
ax.set_title('各簇特征对比')
ax.legend(title='簇', bbox_to_anchor=(1.05, 1))
ax.set_xticklabels(ax.get_xticklabels(), rotation=45, ha='right')

plt.tight_layout()
plt.savefig('clustering_results.png', dpi=150)
plt.show()
```

### 13.7 客户分群解读

```python
# 客户分群解读
print("\n" + "=" * 60)
print("步骤5：客户分群解读")
print("=" * 60)

# 给每个簇打标签
for i in range(best_K):
    cluster_data = df[df['cluster'] == i]
    print(f"\n【簇{i}】共{len(cluster_data)}人 ({len(cluster_data)/len(df)*100:.1f}%)")
    print("-" * 40)
    
    stats = cluster_data[features].mean()
    print(f"  平均年龄: {stats['age']:.1f}岁")
    print(f"  平均年收入: {stats['annual_income']:.0f}元")
    print(f"  平均消费评分: {stats['spending_score']:.1f}")
    print(f"  平均信用评分: {stats['credit_score']:.0f}")
    print(f"  平均 tenure: {stats['tenure_years']:.1f}年")
```

### 13.8 轮廓系数分析

```python
# 轮廓系数分析
print("\n" + "=" * 60)
print("步骤6：聚类质量评估")
print("=" * 60)

# 整体轮廓系数
overall_silhouette = silhouette_score(X_scaled, df['cluster'])
print(f"\n整体轮廓系数: {overall_silhouette:.4f}")

# 各样本轮廓系数
sample_silhouette = silhouette_samples(X_scaled, df['cluster'])

# 绘制轮廓图
fig, axes = plt.subplots(1, 2, figsize=(14, 5))

# 轮廓系数分布
ax = axes[0]
ax.hist(sample_silhouette, bins=30, edgecolor='black', alpha=0.7)
ax.axvline(x=overall_silhouette, color='r', linestyle='--', 
          label=f'均值={overall_silhouette:.3f}')
ax.set_xlabel('轮廓系数')
ax.set_ylabel('频数')
ax.set_title('轮廓系数分布')
ax.legend()

# 各簇轮廓系数
ax = axes[1]
cluster_silhouette = df.groupby('cluster').apply(
    lambda x: sample_silhouette[x.index].mean()
)
ax.bar(cluster_silhouette.index, cluster_silhouette.values, color='steelblue')
ax.set_xlabel('簇编号')
ax.set_ylabel('平均轮廓系数')
ax.set_title('各簇平均轮廓系数')
ax.axhline(y=overall_silhouette, color='r', linestyle='--')
for i, v in enumerate(cluster_silhouette.values):
    ax.text(i, v + 0.01, f'{v:.3f}', ha='center')

plt.tight_layout()
plt.savefig('silhouette_analysis.png', dpi=150)
plt.show()
```

### 13.9 业务建议

```python
# 业务建议
print("\n" + "=" * 60)
print("步骤7：业务建议")
print("=" * 60)

# 基于聚类结果给出业务建议
for i in range(best_K):
    cluster_data = df[df['cluster'] == i]
    stats = cluster_data[features].mean()
    n_customers = len(cluster_data)
    
    print(f"\n【簇{i}】客户群体分析 & 营销建议")
    print("=" * 50)
    
    # 群体画像
    age = stats['age']
    income = stats['annual_income']
    spending = stats['spending_score']
    credit = stats['credit_score']
    
    print(f"\n📊 群体画像:")
    
    # 年龄描述
    if age < 30:
        age_desc = "年轻"
    elif age < 45:
        age_desc = "中青年"
    elif age < 60:
        age_desc = "中年"
    else:
        age_desc = "中老年"
    
    # 收入描述
    if income < 50000:
        income_desc = "低收入"
    elif income < 80000:
        income_desc = "中等收入"
    else:
        income_desc = "高收入"
    
    # 消费描述
    if spending < 35:
        spending_desc = "保守型消费者"
    elif spending < 65:
        spending_desc = "平衡型消费者"
    else:
        spending_desc = "活跃型消费者"
    
    print(f"   - 群体规模: {n_customers}人 ({n_customers/len(df)*100:.1f}%)")
    print(f"   - 年龄特征: {age_desc}（平均{age:.0f}岁）")
    print(f"   - 收入水平: {income_desc}（年均{income:.0f}元）")
    print(f"   - 消费偏好: {spending_desc}（评分{spending:.0f}）")
    
    # 营销建议
    print(f"\n💡 营销建议:")
    
    if income > 70000 and spending > 60:
        print("   ★ 推荐高端理财产品")
        print("   ★ 提供VIP专属服务")
        print("   ★ 邀请参加高端活动")
    
    elif income > 70000 and spending < 40:
        print("   ★ 推送稳健型理财产品")
        print("   ★ 提供储蓄类产品")
        print("   ★ 激励消费活动")
    
    elif age < 35 and spending > 50:
        print("   ★ 推荐数字化服务")
        print("   ★ 年轻人专属优惠")
        print("   ★ 社交媒体营销")
    
    elif credit < 600:
        print("   ★ 提供信用提升建议")
        print("   ★ 推荐基础服务")
        print("   ★ 注意风险控制")
    
    else:
        print("   ★ 常规营销活动")
        print("   ★ 交叉销售机会")
        print("   ★ 客户关系维护")
```

### 13.10 项目总结

```python
# 项目总结
print("\n" + "=" * 60)
print("项目总结")
print("=" * 60)

print(f"""
银行客户分群项目 - 总结报告
═══════════════════════════════════════════════════════════════

1. 数据概况:
   - 总客户数: {len(df)}
   - 聚类特征: {len(features)}个
   - 最优簇数: {best_K}

2. 聚类质量:
   - 轮廓系数: {overall_silhouette:.4f}
   - 各簇客户数: {dict(df['cluster'].value_counts().sort_index())}

3. 分群结果:
""")

for i in range(best_K):
    n = len(df[df['cluster'] == i])
    pct = n / len(df) * 100
    stats = df[df['cluster'] == i][features].mean()
    print(f"   簇{i}: {n}人 ({pct:.1f}%) | "
          f"年龄{stats['age']:.0f} | "
          f"收入{stats['annual_income']:.0f} | "
          f"消费{stats['spending_score']:.0f}")

print("""
4. 业务价值:
   - 实现客户精细化分层
   - 支持差异化营销策略
   - 提高营销ROI

5. 后续建议:
   - 定期更新聚类模型
   - 结合业务反馈调整分群
   - 持续跟踪各群体转化率
═══════════════════════════════════════════════════════════════
""")

print("可视化图表已保存:")
print("  - customer_data_exploration.png: 数据探索")
print("  - optimal_k_selection.png: K值选择")
print("  - clustering_results.png: 聚类结果")
print("  - silhouette_analysis.png: 轮廓分析")
```

---

## 14. 总结与展望

### 14.1 聚类算法总结

```
┌─────────────────────────────────────────────────────────────────┐
│                      聚类算法速查表                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  算法         │ 优点              │ 缺点              │ 适用场景  │
│  ────────────┼──────────────────┼──────────────────┼───────── │
│  K-Means     │ 简单高效          │ 需指定K,球形簇   │ 大数据    │
│  层次聚类    │ 无需指定K,层次结构│ 复杂度高         │ 小数据    │
│  DBSCAN      │ 自动找K,任意形状  │ 参数敏感          │ 有噪声    │
│  GMM         │ 软分配,椭圆簇     │ 需指定K          │ 概率解释  │
│  谱聚类      │ 任意形状          │ 复杂度高         │ 复杂形状  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 14.2 学习路径

```
第1阶段：入门
  - 理解聚类基本概念
  - 掌握K-Means
  - 学习如何选K值

第2阶段：进阶
  - 学习层次聚类
  - 掌握DBSCAN
  - 理解评估指标

第3阶段：实战
  - 完成实际项目
  - 特征工程
  - 结果解读

第4阶段：深入
  - 学习更多算法
  - 深度聚类
  - 聚类的应用扩展
```

### 14.3 进阶学习方向

| 方向 | 内容 |
|------|------|
| 深度聚类 | 用深度学习做聚类（如DEC, DCN） |
| 子空间聚类 | 在子空间中发现簇 |
| 多视图聚类 | 融合多源数据 |
| 动态聚类 | 处理时间序列数据 |
| 集成聚类 | 结合多个聚类结果 |

### 14.4 常用工具库

| 库 | 用途 |
|------|------|
| sklearn | 基础聚类算法 |
| scipy | 层次聚类 |
| sklearn.preprocessing | 数据预处理 |
| sklearn.metrics | 聚类评估 |
| seaborn | 可视化 |

---

**教程结束**

希望这份聚类教程能帮助你从零开始掌握聚类知识！祝你学习愉快！
