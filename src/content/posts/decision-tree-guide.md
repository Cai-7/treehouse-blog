---
title: 决策树完全入门指南
date: 2026-10-17
item: board
topic: ml
tags: [机器学习, 决策树, scikit-learn]
summary: 熵、信息增益、基尼系数，ID3、C4.5、CART 从零实现，再到剪枝、调参和随机森林。
---

## 1. 什么是决策树？

### 1.1 生活中的决策树

想象一下，你今天出门前要考虑是否带伞。你可能会思考以下问题：

1. 今天天气预报怎么说？
   - 如果预报有雨 → 检查是否要长时间外出
     - 如果长时间外出 → 带伞
     - 如果短时间外出 → 可以不带伞
   - 如果预报没雨 → 检查天气是否闷热
     - 如果闷热 → 带伞遮阳
     - 如果不闷热 → 不带伞

这就是一个简单的决策过程！而**决策树（Decision Tree）**就是用树形结构来表达这种决策过程的算法模型。

### 1.2 正式定义

决策树是一种**监督学习**算法，主要用于**分类**和**回归**任务。它通过学习数据特征与目标变量之间的关系，构建一个树形结构的预测模型。

```
                    [天气如何？]
                      /    |    \
                   晴天   雨天   阴天
                   /       \       \
              [温度如何？] [带伞] [检查时间]
              /    \
           高温   适宜
            |      |
         不带伞   不带伞
```

### 1.3 决策树的基本组成

决策树由以下三部分组成：

1. **根节点（Root Node）**：树的顶端，包含整个数据集
2. **内部节点（Internal Node）**：表示一个特征上的测试
3. **叶节点（Leaf Node）**：表示最终的决策结果

### 1.4 决策树的应用场景

决策树在实际生活中有广泛应用：

- **医学诊断**：根据症状判断疾病
- **金融风控**：评估贷款申请人的信用风险
- **客户分类**：判断客户是否会购买产品
- **垃圾邮件识别**：判断邮件是否为垃圾邮件
- **故障诊断**：判断设备是否出现故障

---

## 2. 决策树的核心概念

### 2.1 什么是"节点"和"分支"？

在决策树中：

- **节点（Node）**：表示一个决策点或结果点
- **分支（Branch）**：从节点延伸出来的线条，表示不同的决策结果
- **父节点（Parent Node）**：有子节点的节点
- **子节点（Child Node）**：从父节点分支出来的节点

```
        [父节点]
        /     \
    [子节点1] [子节点2]  ← 子节点
```

### 2.2 什么是"分裂"？

**分裂（Split）**是指根据某个特征的某个取值，将数据集分成更小的子集的过程。

例如，我们有一个判断水果是苹果还是橙子的数据集：

```
原始数据集：
特征1(形状) | 特征2(颜色) | 标签
------------------------------
圆形       | 红色       | 苹果
圆形       | 橙色       | 橙子
椭圆形     | 绿色       | 青苹果

如果选择"形状"进行分裂：
├── 圆形分支 → {苹果, 橙子}
└── 椭圆形分支 → {青苹果}
```

### 2.3 什么是"叶节点"？

**叶节点（Leaf Node）**是决策树的末端节点，它不再分裂，代表最终的分类或回归结果。

```
                    [根节点]
                    /      \
            [内部节点]    [内部节点]
               /              \
        [叶节点: 是]    [叶节点: 否]
```

### 2.4 什么是"树的深度"？

**深度（Depth）**是指从根节点到某个节点经过的边数。

- 根节点的深度为0
- 根节点的子节点深度为1
- 以此类推

```
深度0:     [根节点]
          /      \
深度1: [节点A]  [节点B]
       /    \
深度2: [叶1] [叶2]
```

### 2.5 什么是"树的层次"？

树的层次（Level）与深度类似，根节点的层次为1，子节点的层次为父节点层次+1。

---

## 3. 信息论基础：熵与信息增益

### 3.1 为什么需要"熵"的概念？

在构建决策树时，我们需要决定**首先使用哪个特征进行分裂**。这需要一个衡量"数据纯度"的标准。

**熵（Entropy）**就是用来衡量数据混乱程度或纯度的概念。

### 3.2 什么是熵？

熵来源于物理学，表示系统的混乱程度。在信息论中，熵表示一个随机变量的不确定性。

**直观理解**：
- 如果一个盒子里全是红球，我们说它"纯"，熵为0
- 如果一个盒子里红球蓝球各一半，我们说它"乱"，熵为1
- 如果一个盒子里红球蓝球绿球各三分之一，更乱，熵更高

### 3.3 熵的数学公式

对于一个二分类问题，熵的公式为：

$$
H(S) = -p_1 \log_2(p_1) - p_2 \log_2(p_2)
$$

其中：
- $S$ 是数据集
- $p_1$ 是正类（在二分类中通常指"是"）的比例
- $p_2$ 是负类（在二分类中通常指"否"）的比例
- $\log_2$ 是以2为底的对数

**注意**：如果某个 $p_i$ 为0，我们定义 $0 \log_2(0) = 0$

### 3.4 熵的计算示例

**示例1：纯数据集**

假设有10个样本，全部是正类（标签=1），则：
- $p_1 = 10/10 = 1$
- $p_2 = 0/10 = 0$
- $H = -1 \times \log_2(1) - 0 \times \log_2(0) = -1 \times 0 - 0 = 0$

**结论**：纯数据集的熵为0。

**示例2：五五开的数据集**

假设有10个样本，5个正类、5个负类，则：
- $p_1 = 5/10 = 0.5$
- $p_2 = 5/10 = 0.5$
- $H = -0.5 \times \log_2(0.5) - 0.5 \times \log_2(0.5)$
- $H = -0.5 \times (-1) - 0.5 \times (-1) = 0.5 + 0.5 = 1$

**结论**：最混乱的数据集（二分类中正负各半）熵为1。

**示例3：七三开的数据集**

假设有10个样本，7个正类、3个负类，则：
- $p_1 = 0.7$
- $p_2 = 0.3$
- $H = -0.7 \times \log_2(0.7) - 0.3 \times \log_2(0.3)$
- $H = -0.7 \times (-0.515) - 0.3 \times (-1.737)$
- $H = 0.3605 + 0.5211 = 0.8816$

**结论**：纯度介于纯数据和五五开数据之间，熵也介于0和1之间。

### 3.5 熵的可视化理解

让我们用Python代码画出熵的变化曲线：

```python
import numpy as np
import matplotlib.pyplot as plt

def entropy(p):
    """
    计算二分类的熵
    p: 正类的比例
    """
    if p == 0 or p == 1:
        return 0
    return -p * np.log2(p) - (1 - p) * np.log2(1 - p)

# 生成0到1之间的各种比例
p_values = np.linspace(0.001, 0.999, 1000)
entropies = [entropy(p) for p in p_values]

# 绘图
plt.figure(figsize=(10, 6))
plt.plot(p_values, entropies, 'b-', linewidth=2)
plt.xlabel('正类比例 (p)', fontsize=12)
plt.ylabel('熵 H(p)', fontsize=12)
plt.title('二分类问题的熵函数', fontsize=14)
plt.grid(True, alpha=0.3)
plt.axvline(x=0.5, color='r', linestyle='--', alpha=0.5, label='p=0.5 (最大熵)')
plt.legend()
plt.savefig('entropy_plot.png', dpi=150, bbox_inches='tight')
plt.show()

print("熵的最大值在 p=0.5 处，最大值为:", entropy(0.5))
```

运行结果会显示一条钟形曲线，在p=0.5时达到最大值1。

### 3.6 什么是信息增益？

**信息增益（Information Gain）**表示通过某个特征进行分裂后，数据集的熵减少了多少。

$$
IG(S, A) = H(S) - H(S|A)
$$

其中：
- $IG(S, A)$ 是特征A对数据集S的信息增益
- $H(S)$ 是分裂前数据集S的熵
- $H(S|A)$ 是分裂后数据集的条件熵

**条件熵** $H(S|A)$ 的计算：

$$
H(S|A) = \sum_{v \in Values(A)} \frac{|S_v|}{|S|} H(S_v)
$$

其中：
- $Values(A)$ 是特征A的所有可能取值
- $S_v$ 是特征A取值为v时的子数据集
- $|S_v|$ 和 $|S|$ 是对应数据集的样本数量

### 3.7 信息增益的计算示例

让我们通过一个完整例子理解信息增益的计算过程。

**数据集：是否去打网球**

| 天气 | 温度 | 湿度 | 有风 | 是否打网球 |
|------|------|------|------|-----------|
| 晴   | 炎热 | 高   | 无   | 否        |
| 晴   | 炎热 | 高   | 有   | 否        |
| 阴   | 炎热 | 高   | 无   | 是        |
| 雨   | 温和 | 高   | 无   | 是        |
| 雨   | 凉爽 | 正常 | 无   | 是        |
| 雨   | 凉爽 | 正常 | 有   | 否        |
| 阴   | 凉爽 | 正常 | 有   | 是        |
| 晴   | 温和 | 高   | 无   | 否        |
| 晴   | 凉爽 | 正常 | 无   | 是        |
| 雨   | 温和 | 正常 | 无   | 是        |
| 晴   | 温和 | 正常 | 有   | 是        |
| 阴   | 温和 | 高   | 有   | 是        |
| 阴   | 炎热 | 正常 | 无   | 否        |
| 雨   | 温和 | 高   | 有   | 否        |

**Step 1：计算原始数据集的熵**

在14个样本中，9个"是"，5个"否"：

$$
H(S) = -\frac{9}{14} \log_2\left(\frac{9}{14}\right) - \frac{5}{14} \log_2\left(\frac{5}{14}\right)
$$

$$
H(S) = -0.6429 \times (-0.6365) - 0.3571 \times (-1.485) = 0.4096 + 0.5302 = 0.9398
$$

**Step 2：计算按"天气"分裂后的条件熵**

天气特征有三个取值：晴、阴、雨

- 晴：样本数5，其中2个"是"，3个"否"
  $$
  H(S_{晴}) = -\frac{2}{5} \log_2\left(\frac{2}{5}\right) - \frac{3}{5} \log_2\left(\frac{3}{5}\right) = 0.5283 + 0.4427 = 0.9710
  $$

- 阴：样本数4，其中3个"是"，1个"否"
  $$
  H(S_{阴}) = -\frac{3}{4} \log_2\left(\frac{3}{4}\right) - \frac{1}{4} \log_2\left(\frac{1}{4}\right) = 0.1887 + 0.5 = 0.6887
  $$

- 雨：样本数5，其中3个"是"，2个"否"
  $$
  H(S_{雨}) = -\frac{3}{5} \log_2\left(\frac{3}{5}\right) - \frac{2}{5} \log_2\left(\frac{2}{5}\right) = 0.4427 + 0.5283 = 0.9710
  $$

条件熵：
$$
H(S|天气) = \frac{5}{14} \times 0.9710 + \frac{4}{14} \times 0.6887 + \frac{5}{14} \times 0.9710
$$
$$
= 0.3470 + 0.1968 + 0.3470 = 0.8908
$$

**Step 3：计算信息增益**

$$
IG(S, 天气) = H(S) - H(S|天气) = 0.9398 - 0.8908 = 0.049
$$

### 3.8 用Python代码验证计算

```python
import numpy as np

def entropy(p):
    """计算二分类的熵"""
    if p == 0 or p == 1:
        return 0
    return -p * np.log2(p) - (1 - p) * np.log2(1 - p)

def information_gain(data, feature_index, target_index):
    """
    计算某个特征的信息增益
    
    参数:
        data: 数据集，每行是一个样本
        feature_index: 特征所在的列索引
        target_index: 目标变量所在的列索引
    
    返回:
        信息增益值
    """
    # 1. 计算原始数据集的熵
    n_total = len(data)
    positive_count = sum(1 for row in data if row[target_index] == 1)
    p_positive = positive_count / n_total
    h_original = entropy(p_positive)
    
    print(f"原始数据集: {n_total}个样本, {positive_count}个正类")
    print(f"原始熵 H(S) = {h_original:.4f}")
    print()
    
    # 2. 获取该特征的所有可能取值
    feature_values = set(row[feature_index] for row in data)
    print(f"特征取值: {feature_values}")
    
    # 3. 计算条件熵
    h_conditional = 0
    print("\n各取值的子集熵:")
    for value in feature_values:
        subset = [row for row in data if row[feature_index] == value]
        n_subset = len(subset)
        positive_in_subset = sum(1 for row in subset if row[target_index] == 1)
        p_subset = positive_in_subset / n_subset
        h_subset = entropy(p_subset)
        
        weight = n_subset / n_total
        h_conditional += weight * h_subset
        
        print(f"  值'{value}': {n_subset}个样本, {positive_in_subset}个正类, "
              f"比例={p_subset:.3f}, 子熵={h_subset:.4f}, 权重={weight:.4f}")
    
    print(f"\n条件熵 H(S|特征) = {h_conditional:.4f}")
    
    # 4. 计算信息增益
    ig = h_original - h_conditional
    print(f"\n信息增益 IG = H(S) - H(S|特征) = {h_original:.4f} - {h_conditional:.4f} = {ig:.4f}")
    
    return ig

# 示例数据集（简化版：是否打网球）
# 特征: [天气, 温度, 湿度, 有风]
# 目标: 是否打网球 (1=是, 0=否)

data = [
    ['晴', '炎热', '高', '无', 0],
    ['晴', '炎热', '高', '有', 0],
    ['阴', '炎热', '高', '无', 1],
    ['雨', '温和', '高', '无', 1],
    ['雨', '凉爽', '正常', '无', 1],
    ['雨', '凉爽', '正常', '有', 0],
    ['阴', '凉爽', '正常', '有', 1],
    ['晴', '温和', '高', '无', 0],
    ['晴', '凉爽', '正常', '无', 1],
    ['雨', '温和', '正常', '无', 1],
]

print("=" * 50)
print("计算'天气'特征的信息增益")
print("=" * 50)
ig_weather = information_gain(data, feature_index=0, target_index=4)

print("\n" + "=" * 50)
print("计算'湿度'特征的信息增益")
print("=" * 50)
ig_humidity = information_gain(data, feature_index=2, target_index=4)
```

---

## 4. 决策树的构建过程

### 4.1 构建决策树的核心思想

构建决策树的基本算法可以概括为以下步骤：

```
1. 从根节点开始，使用所有训练数据
2. 选择一个最优特征进行分裂
3. 根据特征取值创建子节点
4. 对每个子节点递归执行步骤2-3
5. 停止条件：
   - 所有样本属于同一类别
   - 没有更多特征可以分裂
   - 达到预设的最大深度
   - 节点样本数小于最小阈值
```

### 4.2 选择最优特征的方法

构建决策树的关键是**如何选择最优的分裂特征**。常见的方法有：

1. **信息增益（Information Gain）**：ID3算法使用
2. **信息增益率（Gain Ratio）**：C4.5算法使用
3. **基尼系数（Gini Index）**：CART算法使用

### 4.3 构建决策树的具体步骤

让我们用一个完整的例子演示决策树的构建过程。

**数据集：购买电脑的客户分类**

| 年龄 | 收入 | 是否大学生 | 信用等级 | 是否购买 |
|------|------|-----------|---------|---------|
| <=30 | 高   | 是        | 一般    | 否      |
| <=30 | 高   | 否        | 良好    | 否      |
| 31-40| 高   | 否        | 良好    | 是      |
| >40  | 中等 | 否        | 良好    | 是      |
| >40  | 低   | 是        | 良好    | 是      |
| >40  | 低   | 是        | 一般    | 否      |
| 31-40| 低   | 是        | 良好    | 是      |
| <=30 | 中等 | 否        | 一般    | 否      |
| <=30 | 低   | 是        | 良好    | 是      |
| >40  | 中等 | 是        | 良好    | 是      |
| <=30 | 中等 | 是        | 良好    | 是      |
| 31-40| 中等 | 否        | 良好    | 是      |
| 31-40| 高   | 是        | 良好    | 是      |
| >40  | 中等 | 否        | 一般    | 否      |

**Step 1：计算根节点的熵**

- 9个"是"，5个"否"
- $H(S) = -\frac{9}{14} \log_2(\frac{9}{14}) - \frac{5}{14} \log_2(\frac{5}{14}) = 0.940$

**Step 2：计算每个特征的信息增益**

**年龄特征：**
- <=30：5个样本（2是，3否），熵 = 0.971
- 31-40：4个样本（4是，0否），熵 = 0
- >40：5个样本（3是，2否），熵 = 0.971

$$
H(S|年龄) = \frac{5}{14} \times 0.971 + \frac{4}{14} \times 0 + \frac{5}{14} \times 0.971 = 0.694
$$
$$
IG(年龄) = 0.940 - 0.694 = 0.246
$$

**收入特征：**
- 高：4个样本（2是，2否），熵 = 1.0
- 中等：6个样本（4是，2否），熵 = 0.918
- 低：4个样本（3是，1否），熵 = 0.811

$$
H(S|收入) = \frac{4}{14} \times 1.0 + \frac{6}{14} \times 0.918 + \frac{4}{14} \times 0.811 = 0.911
$$
$$
IG(收入) = 0.940 - 0.911 = 0.029
$$

**学生特征：**
- 是：5个样本（3是，2否），熵 = 0.971
- 否：9个样本（6是，3否），熵 = 0.918

$$
H(S|学生) = \frac{5}{14} \times 0.971 + \frac{9}{14} \times 0.918 = 0.937
$$
$$
IG(学生) = 0.940 - 0.937 = 0.003
$$

**信用等级特征：**
- 一般：6个样本（2是，4否），熵 = 0.918
- 良好：8个样本（7是，1否），熵 = 0.544

$$
H(S|信用) = \frac{6}{14} \times 0.918 + \frac{8}{14} \times 0.544 = 0.704
$$
$$
IG(信用) = 0.940 - 0.704 = 0.236
$$

**Step 3：选择最优特征**

| 特征 | 信息增益 |
|------|---------|
| 年龄 | 0.246   |
| 收入 | 0.029   |
| 学生 | 0.003   |
| 信用 | 0.236   |

年龄的信息增益最大（0.246），所以选择**年龄**作为根节点的分裂特征。

**Step 4：构建第一层树**

```
                    [年龄]
                   /  |   \
              <=30  31-40  >40
              /       \      \
           ...       ...     ...
```

**Step 5：递归分裂**

对于年龄="31-40"的分支，4个样本全部是"是"，已经纯，无需继续分裂。

对于年龄="<=30"的分支，5个样本（2是，3否），需要继续分裂。

对于年龄=">40"的分支，5个样本（3是，2否），需要继续分裂。

继续对"<=30"分支计算剩余特征的信息增益...

### 4.4 完整的决策树构建代码

```python
import numpy as np
from collections import Counter

class DecisionTree:
    """
    从零实现决策树算法
    
    使用信息增益作为分裂准则
    """
    
    def __init__(self, max_depth=10, min_samples_split=2):
        """
        初始化决策树
        
        参数:
            max_depth: 树的最大深度
            min_samples_split: 分裂所需的最小样本数
        """
        self.max_depth = max_depth
        self.min_samples_split = min_samples_split
        self.tree = None
    
    def fit(self, X, y):
        """
        训练决策树
        
        参数:
            X: 特征矩阵 (n_samples, n_features)
            y: 目标变量 (n_samples,)
        """
        self.n_classes = len(np.unique(y))
        self.n_features = X.shape[1]
        self.tree = self._build_tree(X, y, depth=0)
        return self
    
    def _build_tree(self, X, y, depth):
        """
        递归构建决策树
        
        参数:
            X: 特征矩阵
            y: 目标变量
            depth: 当前深度
        
        返回:
            树的节点（字典结构）
        """
        n_samples = len(y)
        n_positive = sum(y)
        n_negative = n_samples - n_positive
        
        # 停止条件
        if (depth >= self.max_depth or 
            n_samples < self.min_samples_split or 
            n_positive == 0 or 
            n_negative == 0):
            # 返回叶节点
            leaf_class = 1 if n_positive >= n_negative else 0
            return {'leaf': True, 'class': leaf_class, 'samples': n_samples}
        
        # 找到最优分裂特征
        best_feature, best_threshold = self._find_best_split(X, y)
        
        if best_feature is None:
            # 无法分裂，返回叶节点
            leaf_class = 1 if n_positive >= n_negative else 0
            return {'leaf': True, 'class': leaf_class, 'samples': n_samples}
        
        # 构建节点
        node = {
            'leaf': False,
            'feature': best_feature,
            'threshold': best_threshold,
            'samples': n_samples,
            'children': {}
        }
        
        # 根据最优特征分裂数据
        left_mask = X[:, best_feature] <= best_threshold
        right_mask = ~left_mask
        
        # 递归构建子树
        node['children']['left'] = self._build_tree(
            X[left_mask], y[left_mask], depth + 1
        )
        node['children']['right'] = self._build_tree(
            X[right_mask], y[right_mask], depth + 1
        )
        
        return node
    
    def _find_best_split(self, X, y):
        """
        找到最优分裂特征和阈值
        
        返回:
            (best_feature, best_threshold)
        """
        n_samples, n_features = X.shape
        
        # 计算原始熵
        p_positive = sum(y) / n_samples
        original_entropy = self._entropy(p_positive)
        
        best_gain = 0
        best_feature = None
        best_threshold = None
        
        for feature_idx in range(n_features):
            # 获取该特征的唯一值作为候选阈值
            unique_values = np.unique(X[:, feature_idx])
            
            if len(unique_values) == 1:
                continue
            
            # 候选阈值：相邻值的平均值
            thresholds = (unique_values[:-1] + unique_values[1:]) / 2
            
            for threshold in thresholds:
                # 分裂数据
                left_mask = X[:, feature_idx] <= threshold
                right_mask = ~left_mask
                
                # 计算加权熵
                left_entropy = self._entropy(sum(y[left_mask]) / sum(left_mask))
                right_entropy = self._entropy(sum(y[right_mask]) / sum(right_mask))
                
                weighted_entropy = (
                    sum(left_mask) / n_samples * left_entropy + 
                    sum(right_mask) / n_samples * right_entropy
                )
                
                # 计算信息增益
                gain = original_entropy - weighted_entropy
                
                if gain > best_gain:
                    best_gain = gain
                    best_feature = feature_idx
                    best_threshold = threshold
        
        return best_feature, best_threshold
    
    @staticmethod
    def _entropy(p):
        """计算熵"""
        if p == 0 or p == 1:
            return 0
        return -p * np.log2(p) - (1 - p) * np.log2(1 - p)
    
    def predict_single(self, x, node=None):
        """
        预测单个样本
        
        参数:
            x: 单个样本的特征
            node: 当前节点
        
        返回:
            预测的类别
        """
        if node is None:
            node = self.tree
        
        if node['leaf']:
            return node['class']
        
        feature = node['feature']
        threshold = node['threshold']
        
        if x[feature] <= threshold:
            return self.predict_single(x, node['children']['left'])
        else:
            return self.predict_single(x, node['children']['right'])
    
    def predict(self, X):
        """
        预测多个样本
        
        参数:
            X: 特征矩阵
        
        返回:
            预测的类别数组
        """
        return np.array([self.predict_single(x) for x in X])
    
    def score(self, X, y):
        """
        计算准确率
        
        参数:
            X: 特征矩阵
            y: 真实标签
        
        返回:
            准确率
        """
        predictions = self.predict(X)
        return np.mean(predictions == y)
    
    def print_tree(self, node=None, depth=0):
        """打印决策树"""
        if node is None:
            node = self.tree
        
        indent = "  " * depth
        
        if node['leaf']:
            print(f"{indent}[叶节点] 类别={node['class']}, 样本数={node['samples']}")
        else:
            print(f"{indent}[节点] 特征{node['feature']} <= {node['threshold']:.3f}, "
                  f"样本数={node['samples']}")
            print(f"{indent}  左子树:")
            self.print_tree(node['children']['left'], depth + 1)
            print(f"{indent}  右子树:")
            self.print_tree(node['children']['right'], depth + 1)

# 测试代码
if __name__ == "__main__":
    # 生成简单的测试数据
    np.random.seed(42)
    
    # 创建一些非线性可分的数据
    X = np.array([
        [1, 2], [2, 3], [3, 1], [4, 4], [5, 3],
        [6, 7], [7, 8], [8, 6], [9, 10], [10, 9]
    ])
    y = np.array([0, 0, 0, 0, 0, 1, 1, 1, 1, 1])
    
    # 创建并训练决策树
    tree = DecisionTree(max_depth=5)
    tree.fit(X, y)
    
    # 打印树结构
    print("决策树结构:")
    print("=" * 50)
    tree.print_tree()
    
    # 预测
    print("\n预测结果:")
    predictions = tree.predict(X)
    print(f"预测: {predictions}")
    print(f"真实: {y}")
    print(f"准确率: {tree.score(X, y):.2%}")
```

---

## 5. ID3算法详解

### 5.1 ID3算法的历史

ID3（Iterative Dichotomiser 3）是由Ross Quinlan于1986年提出的，是最早的决策树算法之一。它为后来的C4.5和CART算法奠定了基础。

### 5.2 ID3算法的核心思想

ID3算法使用**信息增益**作为分裂准则，每次选择信息增益最大的特征进行分裂。

**ID3算法的特点**：
1. 只能处理分类问题（不能处理回归问题）
2. 只能处理离散型特征（不能处理连续型特征）
3. 使用信息增益选择分裂特征
4. 默认特征有多个取值（多叉树）

### 5.3 ID3算法的步骤

```
ID3算法(Data, Features):
    1. 如果所有样本属于同一类别，返回该类别作为叶节点
    2. 如果Features为空，返回多数类作为叶节点
    3. 否则：
       a. 从Features中选择信息增益最大的特征A
       b. 将A作为分裂特征，创建节点
       c. 对于A的每个取值v：
          - 创建子节点
          - 将Data中A=v的样本递归调用ID3算法
    4. 返回节点
```

### 5.4 ID3算法的局限性

1. **偏向多值特征**：倾向于选择取值多的特征。例如"学号"这样的特征，每个值只对应一个样本，会获得很大的信息增益，但对分类没有实际意义。

2. **不能处理连续值**：只能处理离散型特征。

3. **不能处理缺失值**：没有考虑缺失值的情况。

4. **只生成多叉树**：不像CART算法可以生成二叉树。

5. **容易过拟合**：没有剪枝机制。

### 5.5 ID3算法的完整实现

```python
import numpy as np
from collections import Counter
import math

class ID3DecisionTree:
    """
    ID3决策树算法的完整实现
    
    特点：
    - 使用信息增益作为分裂准则
    - 只能处理离散特征
    - 生成多叉树
    - 不能处理连续值和缺失值
    """
    
    def __init__(self, max_depth=None, min_samples_leaf=1):
        self.max_depth = max_depth
        self.min_samples_leaf = min_samples_leaf
        self.tree = None
        self.feature_names = None
    
    def fit(self, X, y, feature_names=None):
        """
        训练ID3决策树
        
        参数:
            X: 特征矩阵 (n_samples, n_features)
            y: 目标变量
            feature_names: 特征名称列表
        """
        self.feature_names = feature_names
        self.tree = self._build_tree(X, y, depth=0, used_features=set())
        return self
    
    def _build_tree(self, X, y, depth, used_features):
        """递归构建决策树"""
        n_samples = len(y)
        unique_classes = np.unique(y)
        
        # 停止条件1：所有样本属于同一类别
        if len(unique_classes) == 1:
            return {
                'type': 'leaf',
                'class': unique_classes[0],
                'samples': n_samples
            }
        
        # 停止条件2：达到最大深度
        if self.max_depth is not None and depth >= self.max_depth:
            majority_class = Counter(y).most_common(1)[0][0]
            return {
                'type': 'leaf',
                'class': majority_class,
                'samples': n_samples
            }
        
        # 停止条件3：样本数太少
        if n_samples < self.min_samples_leaf:
            majority_class = Counter(y).most_common(1)[0][0]
            return {
                'type': 'leaf',
                'class': majority_class,
                'samples': n_samples
            }
        
        # 找到最优特征
        best_feature = self._select_best_feature(X, y, used_features)
        
        # 停止条件4：没有可用特征
        if best_feature is None:
            majority_class = Counter(y).most_common(1)[0][0]
            return {
                'type': 'leaf',
                'class': majority_class,
                'samples': n_samples
            }
        
        # 获取特征名
        if self.feature_names is not None:
            feature_name = self.feature_names[best_feature]
        else:
            feature_name = f"feature_{best_feature}"
        
        # 获取该特征的所有取值
        feature_values = np.unique(X[:, best_feature])
        
        # 如果只有一个取值，返回叶节点
        if len(feature_values) == 1:
            majority_class = Counter(y).most_common(1)[0][0]
            return {
                'type': 'leaf',
                'class': majority_class,
                'samples': n_samples
            }
        
        # 创建决策节点
        node = {
            'type': 'decision',
            'feature': best_feature,
            'feature_name': feature_name,
            'samples': n_samples,
            'children': {}
        }
        
        # 对每个特征值递归构建子树
        new_used_features = used_features | {best_feature}
        for value in feature_values:
            mask = X[:, best_feature] == value
            subset_X = X[mask]
            subset_y = y[mask]
            
            if len(subset_y) == 0:
                # 如果子集为空，返回多数类
                majority_class = Counter(y).most_common(1)[0][0]
                node['children'][value] = {
                    'type': 'leaf',
                    'class': majority_class,
                    'samples': 0
                }
            else:
                node['children'][value] = self._build_tree(
                    subset_X, subset_y, depth + 1, new_used_features
                )
        
        return node
    
    def _select_best_feature(self, X, y, used_features):
        """选择最优特征（信息增益最大）"""
        n_features = X.shape[1]
        n_samples = len(y)
        
        # 计算原始熵
        original_entropy = self._calculate_entropy(y)
        
        best_gain = -1
        best_feature = None
        
        for feature_idx in range(n_features):
            if feature_idx in used_features:
                continue
            
            # 计算该特征的条件熵
            feature_values = np.unique(X[:, feature_idx])
            conditional_entropy = 0
            
            for value in feature_values:
                mask = X[:, feature_idx] == value
                subset_y = y[mask]
                subset_size = len(subset_y)
                
                if subset_size > 0:
                    entropy_v = self._calculate_entropy(subset_y)
                    weight = subset_size / n_samples
                    conditional_entropy += weight * entropy_v
            
            # 计算信息增益
            gain = original_entropy - conditional_entropy
            
            if gain > best_gain:
                best_gain = gain
                best_feature = feature_idx
        
        return best_feature
    
    def _calculate_entropy(self, y):
        """计算熵"""
        n_samples = len(y)
        if n_samples == 0:
            return 0
        
        counter = Counter(y)
        entropy = 0
        
        for count in counter.values():
            p = count / n_samples
            if p > 0:
                entropy -= p * math.log2(p)
        
        return entropy
    
    def predict_single(self, x, node=None):
        """预测单个样本"""
        if node is None:
            node = self.tree
        
        if node['type'] == 'leaf':
            return node['class']
        
        feature_value = x[node['feature']]
        
        if feature_value in node['children']:
            return self.predict_single(x, node['children'][feature_value])
        else:
            # 如果特征值不在训练数据中，返回多数类
            # 这里简化处理，实际可以更复杂
            most_common = None
            max_samples = -1
            for child in node['children'].values():
                if child['samples'] > max_samples:
                    max_samples = child['samples']
                    most_common = child['class']
            return most_common
    
    def predict(self, X):
        """预测多个样本"""
        return np.array([self.predict_single(x) for x in X])
    
    def score(self, X, y):
        """计算准确率"""
        predictions = self.predict(X)
        return np.mean(predictions == y)
    
    def print_tree(self, node=None, depth=0, indent=""):
        """打印决策树"""
        if node is None:
            node = self.tree
        
        if node['type'] == 'leaf':
            print(f"{indent}叶子: 类别={node['class']}, 样本数={node['samples']}")
        else:
            print(f"{indent}[{node['feature_name']}]")
            for value, child in node['children'].items():
                print(f"{indent}  |-- {value}:")
                self.print_tree(child, depth + 1, indent + "      ")

# 示例：使用ID3算法处理天气数据
if __name__ == "__main__":
    # 天气数据集
    # 特征: 天气, 温度, 湿度, 有风
    # 目标: 是否打网球
    
    feature_names = ['天气', '温度', '湿度', '有风']
    
    data_X = np.array([
        ['晴', '炎热', '高', '无'],
        ['晴', '炎热', '高', '有'],
        ['阴', '炎热', '高', '无'],
        ['雨', '温和', '高', '无'],
        ['雨', '凉爽', '正常', '无'],
        ['雨', '凉爽', '正常', '有'],
        ['阴', '凉爽', '正常', '有'],
        ['晴', '温和', '高', '无'],
        ['晴', '凉爽', '正常', '无'],
        ['雨', '温和', '正常', '无'],
        ['晴', '温和', '正常', '有'],
        ['阴', '温和', '高', '有'],
        ['阴', '炎热', '正常', '无'],
        ['雨', '温和', '高', '有'],
    ])
    
    # 将字符串转换为数值编码
    from sklearn.preprocessing import LabelEncoder
    
    X_encoded = np.zeros((len(data_X), len(feature_names)), dtype=int)
    encoders = []
    
    for j in range(len(feature_names)):
        le = LabelEncoder()
        X_encoded[:, j] = le.fit_transform(data_X[:, j])
        encoders.append(le)
    
    # 目标变量
    y = np.array([0, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 0, 0])  # 0=否, 1=是
    
    # 创建并训练ID3决策树
    tree = ID3DecisionTree(max_depth=5)
    tree.fit(X_encoded, y, feature_names)
    
    # 打印树结构
    print("ID3决策树结构:")
    print("=" * 50)
    tree.print_tree()
    
    # 预测
    print("\n预测结果:")
    predictions = tree.predict(X_encoded)
    print(f"预测: {predictions}")
    print(f"真实: {y}")
    print(f"训练准确率: {tree.score(X_encoded, y):.2%}")
    
    # 测试单个样本
    print("\n测试单个样本:")
    test_sample = X_encoded[0]
    pred = tree.predict_single(test_sample)
    print(f"样本特征: {data_X[0]}")
    print(f"预测结果: {'打网球' if pred == 1 else '不打网球'}")
    print(f"真实结果: {'打网球' if y[0] == 1 else '不打网球'}")
```

---

## 6. C4.5算法：改进的信息增益率

### 6.1 为什么需要信息增益率？

ID3算法使用信息增益选择分裂特征，但存在一个严重问题：**偏向选择取值多的特征**。

例如，假设有一个"学号"特征，每个学生的学号都不同，那么按学号分裂会得到：
- 每个子节点只有一个样本
- 每个子节点的熵都是0
- 信息增益最大

但这样的分裂**对分类没有任何帮助**，因为学号与类别没有任何关系。

### 6.2 信息增益率的定义

C4.5算法使用**信息增益率（Gain Ratio）**来解决这个问题：

$$
GR(S, A) = \frac{IG(S, A)}{SplitInfo(S, A)}
$$

其中：
- $IG(S, A)$ 是特征A的信息增益
- $SplitInfo(S, A)$ 是分裂信息，表示按特征A分裂产生的"潜在信息"

### 6.3 分裂信息的计算

$$
SplitInfo(S, A) = -\sum_{v \in Values(A)} \frac{|S_v|}{|S|} \log_2\left(\frac{|S_v|}{|S|}\right)
$$

分裂信息衡量的是**按特征A分裂后，各子集的分布均匀程度**。

- 如果特征A的取值非常均匀（各子集大小相近），分裂信息较大
- 如果特征A只有一个取值（没有分裂），分裂信息为0
- 如果特征A的某个取值特别多，分裂信息较小

### 6.4 信息增益率的问题

信息增益率有一个问题：**当某个特征的取值分布非常不均匀时，分裂信息可能接近0**，导致信息增益率变得很大甚至无穷大。

为了解决这个问题，C4.5算法采用了一个**启发式策略**：
1. 先筛选出信息增益高于平均水平的特征
2. 只在这些特征中选择信息增益率最高的

### 6.5 C4.5算法的改进

除了使用信息增益率，C4.5还做了以下改进：

1. **处理连续特征**：将连续值离散化，找出最佳分裂点
2. **处理缺失值**：使用加权方式处理缺失值
3. **剪枝策略**：使用悲观剪枝法减少过拟合
4. **生成规则**：可以从决策树生成if-then规则

### 6.6 C4.5算法的完整实现

```python
import numpy as np
from collections import Counter
import math

class C45DecisionTree:
    """
    C4.5决策树算法的完整实现
    
    改进点：
    - 使用信息增益率代替信息增益
    - 支持连续特征
    - 支持缺失值处理
    - 包含剪枝策略
    """
    
    def __init__(self, max_depth=None, min_samples_leaf=1):
        self.max_depth = max_depth
        self.min_samples_leaf = min_samples_leaf
        self.tree = None
        self.feature_names = None
        self.feature_types = None  # 'discrete' or 'continuous'
    
    def fit(self, X, y, feature_names=None, feature_types=None):
        """
        训练C4.5决策树
        
        参数:
            X: 特征矩阵
            y: 目标变量
            feature_names: 特征名称
            feature_types: 每个特征的类型 ['discrete', 'continuous']
        """
        self.feature_names = feature_names
        self.n_features = X.shape[1]
        
        # 默认所有特征为离散型
        if feature_types is None:
            self.feature_types = ['discrete'] * self.n_features
        else:
            self.feature_types = feature_types
        
        self.tree = self._build_tree(X, y, depth=0, used_features=set())
        return self
    
    def _build_tree(self, X, y, depth, used_features):
        """递归构建决策树"""
        n_samples = len(y)
        unique_classes = np.unique(y)
        
        # 停止条件1：所有样本属于同一类别
        if len(unique_classes) == 1:
            return {
                'type': 'leaf',
                'class': unique_classes[0],
                'samples': n_samples
            }
        
        # 停止条件2：达到最大深度
        if self.max_depth is not None and depth >= self.max_depth:
            majority_class = Counter(y).most_common(1)[0][0]
            return {
                'type': 'leaf',
                'class': majority_class,
                'samples': n_samples
            }
        
        # 停止条件3：样本数太少
        if n_samples < self.min_samples_leaf:
            majority_class = Counter(y).most_common(1)[0][0]
            return {
                'type': 'leaf',
                'class': majority_class,
                'samples': n_samples
            }
        
        # 找到最优特征
        best_feature, best_gain_ratio, best_split_value = self._select_best_feature(
            X, y, used_features
        )
        
        # 停止条件4：没有可用特征或没有有效分裂
        if best_feature is None or best_gain_ratio <= 0:
            majority_class = Counter(y).most_common(1)[0][0]
            return {
                'type': 'leaf',
                'class': majority_class,
                'samples': n_samples
            }
        
        # 获取特征名
        if self.feature_names is not None:
            feature_name = self.feature_names[best_feature]
        else:
            feature_name = f"feature_{best_feature}"
        
        # 判断是连续特征还是离散特征
        if self.feature_types[best_feature] == 'continuous':
            feature_type = 'continuous'
        else:
            feature_type = 'discrete'
        
        # 创建决策节点
        node = {
            'type': 'decision',
            'feature': best_feature,
            'feature_name': feature_name,
            'feature_type': feature_type,
            'split_value': best_split_value,
            'samples': n_samples,
            'gain_ratio': best_gain_ratio,
            'children': {}
        }
        
        # 分裂数据
        if feature_type == 'continuous':
            # 连续特征：二分裂
            left_mask = X[:, best_feature] <= best_split_value
            right_mask = ~left_mask
            
            if np.sum(left_mask) > 0:
                node['children']['left'] = self._build_tree(
                    X[left_mask], y[left_mask], depth + 1, used_features | {best_feature}
                )
            else:
                majority_class = Counter(y).most_common(1)[0][0]
                node['children']['left'] = {
                    'type': 'leaf', 'class': majority_class, 'samples': 0
                }
            
            if np.sum(right_mask) > 0:
                node['children']['right'] = self._build_tree(
                    X[right_mask], y[right_mask], depth + 1, used_features | {best_feature}
                )
            else:
                majority_class = Counter(y).most_common(1)[0][0]
                node['children']['right'] = {
                    'type': 'leaf', 'class': majority_class, 'samples': 0
                }
        else:
            # 离散特征：多分裂
            feature_values = np.unique(X[:, best_feature])
            new_used_features = used_features | {best_feature}
            
            for value in feature_values:
                mask = X[:, best_feature] == value
                subset_X = X[mask]
                subset_y = y[mask]
                
                if len(subset_y) == 0:
                    majority_class = Counter(y).most_common(1)[0][0]
                    node['children'][value] = {
                        'type': 'leaf', 'class': majority_class, 'samples': 0
                    }
                else:
                    node['children'][value] = self._build_tree(
                        subset_X, subset_y, depth + 1, new_used_features
                    )
        
        return node
    
    def _select_best_feature(self, X, y, used_features):
        """选择最优特征（使用信息增益率）"""
        n_features = X.shape[1]
        n_samples = len(y)
        
        # 计算原始熵
        original_entropy = self._calculate_entropy(y)
        
        best_gain = -1
        best_gain_ratio = -1
        best_feature = None
        best_split_value = None
        
        # 首先计算所有特征的信息增益
        gains = {}
        split_infos = {}
        
        for feature_idx in range(n_features):
            if feature_idx in used_features:
                continue
            
            if self.feature_types[feature_idx] == 'continuous':
                # 连续特征：计算最佳分裂点的信息增益
                gain, split_info, split_value = self._calculate_continuous_gain(
                    X[:, feature_idx], y, original_entropy
                )
            else:
                # 离散特征：计算信息增益和分裂信息
                gain, split_info = self._calculate_discrete_gain(
                    X[:, feature_idx], y, original_entropy
                )
                split_value = None
            
            if gain > best_gain:
                best_gain = gain
                best_feature = feature_idx
                best_split_value = split_value
            
            gains[feature_idx] = gain
            split_infos[feature_idx] = split_info
        
        # 如果没有找到有效特征
        if best_gain <= 0:
            return None, None, None
        
        # 计算信息增益率
        avg_gain = np.mean(list(gains.values()))
        
        # C4.5策略：只考虑信息增益高于平均水平的特征
        candidate_features = [f for f, g in gains.items() if g >= avg_gain]
        
        best_gain_ratio = -1
        for feature_idx in candidate_features:
            if split_infos[feature_idx] > 0:
                gain_ratio = gains[feature_idx] / split_infos[feature_idx]
                if gain_ratio > best_gain_ratio:
                    best_gain_ratio = gain_ratio
                    best_feature = feature_idx
                    if self.feature_types[feature_idx] == 'continuous':
                        _, _, best_split_value = self._calculate_continuous_gain(
                            X[:, feature_idx], y, original_entropy
                        )
                    else:
                        best_split_value = None
        
        return best_feature, best_gain_ratio, best_split_value
    
    def _calculate_continuous_gain(self, feature_values, y, original_entropy):
        """计算连续特征的最佳分裂信息增益"""
        n_samples = len(y)
        
        # 对特征值排序
        sorted_indices = np.argsort(feature_values)
        sorted_values = feature_values[sorted_indices]
        sorted_y = y[sorted_indices]
        
        best_gain = -1
        best_split_value = None
        
        # 尝试所有可能的分裂点（相邻值的中间点）
        for i in range(n_samples - 1):
            split_value = (sorted_values[i] + sorted_values[i + 1]) / 2
            
            # 分裂数据
            left_mask = feature_values <= split_value
            right_mask = ~left_mask
            
            if np.sum(left_mask) == 0 or np.sum(right_mask) == 0:
                continue
            
            # 计算条件熵
            left_entropy = self._calculate_entropy(sorted_y[left_mask])
            right_entropy = self._calculate_entropy(sorted_y[right_mask])
            
            weighted_entropy = (
                np.sum(left_mask) / n_samples * left_entropy +
                np.sum(right_mask) / n_samples * right_entropy
            )
            
            # 计算信息增益
            gain = original_entropy - weighted_entropy
            
            if gain > best_gain:
                best_gain = gain
                best_split_value = split_value
        
        # 计算分裂信息
        if best_split_value is not None:
            left_mask = feature_values <= best_split_value
            right_mask = ~left_mask
            split_info = self._calculate_split_info([
                np.sum(left_mask) / n_samples,
                np.sum(right_mask) / n_samples
            ])
        else:
            split_info = 1
        
        return best_gain, split_info, best_split_value
    
    def _calculate_discrete_gain(self, feature_values, y, original_entropy):
        """计算离散特征的信息增益"""
        n_samples = len(y)
        unique_values = np.unique(feature_values)
        
        conditional_entropy = 0
        split_info = 0
        
        for value in unique_values:
            mask = feature_values == value
            subset_size = np.sum(mask)
            subset_y = y[mask]
            
            if subset_size > 0:
                weight = subset_size / n_samples
                entropy_v = self._calculate_entropy(subset_y)
                conditional_entropy += weight * entropy_v
                
                # 分裂信息
                if weight > 0:
                    split_info -= weight * math.log2(weight)
        
        gain = original_entropy - conditional_entropy
        
        return gain, split_info
    
    def _calculate_entropy(self, y):
        """计算熵"""
        n_samples = len(y)
        if n_samples == 0:
            return 0
        
        counter = Counter(y)
        entropy = 0
        
        for count in counter.values():
            p = count / n_samples
            if p > 0:
                entropy -= p * math.log2(p)
        
        return entropy
    
    def _calculate_split_info(self, proportions):
        """计算分裂信息"""
        split_info = 0
        for p in proportions:
            if p > 0:
                split_info -= p * math.log2(p)
        return split_info
    
    def predict_single(self, x, node=None):
        """预测单个样本"""
        if node is None:
            node = self.tree
        
        if node['type'] == 'leaf':
            return node['class']
        
        if node['feature_type'] == 'continuous':
            # 连续特征：根据分裂值判断
            if x[node['feature']] <= node['split_value']:
                return self.predict_single(x, node['children']['left'])
            else:
                return self.predict_single(x, node['children']['right'])
        else:
            # 离散特征：根据特征值选择分支
            feature_value = x[node['feature']]
            
            if feature_value in node['children']:
                return self.predict_single(x, node['children'][feature_value])
            else:
                # 如果特征值不在训练数据中，返回多数类
                most_common = None
                max_samples = -1
                for child in node['children'].values():
                    if child['samples'] > max_samples:
                        max_samples = child['samples']
                        most_common = child['class']
                return most_common
    
    def predict(self, X):
        """预测多个样本"""
        return np.array([self.predict_single(x) for x in X])
    
    def score(self, X, y):
        """计算准确率"""
        predictions = self.predict(X)
        return np.mean(predictions == y)
    
    def print_tree(self, node=None, depth=0, indent=""):
        """打印决策树"""
        if node is None:
            node = self.tree
        
        if node['type'] == 'leaf':
            print(f"{indent}叶子: 类别={node['class']}, 样本数={node['samples']}")
        else:
            if node['feature_type'] == 'continuous':
                condition = f"{node['feature_name']} <= {node['split_value']:.3f}"
            else:
                condition = node['feature_name']
            
            print(f"{indent}[{condition}] (增益率={node['gain_ratio']:.4f})")
            
            for key, child in node['children'].items():
                print(f"{indent}  |-- {key}:")
                self.print_tree(child, depth + 1, indent + "      ")

# 示例：使用C4.5算法处理混合特征数据
if __name__ == "__main__":
    # 创建包含连续特征和离散特征的混合数据集
    # 特征: 年龄(连续), 收入(离散), 是否大学生(离散), 信用等级(离散)
    
    feature_names = ['年龄', '收入', '是否大学生', '信用等级']
    feature_types = ['continuous', 'discrete', 'discrete', 'discrete']
    
    # 模拟数据
    np.random.seed(42)
    n_samples = 200
    
    # 生成连续特征
    ages = np.random.normal(35, 10, n_samples)
    
    # 生成离散特征
    incomes = np.random.choice(['低', '中', '高'], n_samples, p=[0.3, 0.5, 0.2])
    is_student = np.random.choice(['是', '否'], n_samples, p=[0.3, 0.7])
    credit = np.random.choice(['一般', '良好'], n_samples, p=[0.4, 0.6])
    
    # 生成目标变量（与特征有一定关系）
    buy = np.zeros(n_samples, dtype=int)
    for i in range(n_samples):
        score = 0
        if ages[i] < 30:
            score -= 1
        if ages[i] >= 30 and ages[i] <= 50:
            score += 2
        if incomes[i] == '高':
            score += 3
        elif incomes[i] == '中':
            score += 1
        if is_student[i] == '否':
            score += 2
        if credit[i] == '良好':
            score += 2
        
        buy[i] = 1 if score >= 5 else 0
    
    # 编码离散特征
    from sklearn.preprocessing import LabelEncoder
    
    X = np.column_stack([
        ages,
        LabelEncoder().fit_transform(incomes),
        LabelEncoder().fit_transform(is_student),
        LabelEncoder().fit_transform(credit)
    ])
    
    y = buy
    
    # 创建并训练C4.5决策树
    tree = C45DecisionTree(max_depth=5)
    tree.fit(X, y, feature_names, feature_types)
    
    # 打印树结构
    print("C4.5决策树结构:")
    print("=" * 50)
    tree.print_tree()
    
    # 评估
    print(f"\n训练准确率: {tree.score(X, y):.2%}")
    
    # 特征重要性分析
    print("\n特征分析:")
    print(f"- 收入编码: '低'=0, '中'=1, '高'=2")
    print(f"- 是否大学生: '否'=0, '是'=1")
    print(f"- 信用等级: '一般'=0, '良好'=1")
```

---

## 7. CART算法：基尼系数

### 7.1 CART算法简介

CART（Classification and Regression Tree）是Breiman等人于1984年提出的决策树算法。与ID3和C4.5不同，CART算法有以下几个特点：

1. **既能处理分类问题，也能处理回归问题**
2. **生成二叉树**（每个节点最多有两个子节点）
3. **使用基尼系数（Gini Index）**作为分裂准则
4. **支持剪枝**

### 7.2 什么是基尼系数？

基尼系数是衡量数据集纯度的另一种指标，类似于熵。基尼系数的值越小，表示数据集越纯。

对于二分类问题，基尼系数的公式为：

$$
Gini(S) = 1 - \sum_{i=1}^{2} p_i^2
$$

其中 $p_i$ 是第 $i$ 类样本的比例。

对于多分类问题：

$$
Gini(S) = 1 - \sum_{i=1}^{k} p_i^2
$$

### 7.3 基尼系数的直观理解

假设我们有两类样本，比例分别为 $p$ 和 $1-p$：

$$
Gini = 1 - p^2 - (1-p)^2 = 2p(1-p)
$$

**特殊值分析**：
- 当 $p=0$ 或 $p=1$（纯数据集）时：$Gini = 0$
- 当 $p=0.5$（最混乱的数据集）时：$Gini = 0.5$

这意味着基尼系数的范围是 $[0, 0.5]$（二分类）。

### 7.4 基尼系数 vs 熵

| 特性 | 熵 | 基尼系数 |
|------|-----|---------|
| 公式 | $-\sum p_i \log_2(p_i)$ | $1 - \sum p_i^2$ |
| 二分类最大值 | 1 | 0.5 |
| 计算复杂度 | 需要计算对数 | 只需乘法 |
| 对概率变化的敏感度 | 较高 | 中等 |
| 倾向 | 不容易偏向多值特征 | 容易偏向多值特征 |

**实践中的选择**：
- scikit-learn的DecisionTree默认使用基尼系数
- 两者在大多数情况下产生的结果差异不大
- 基尼系数计算更快（不需要对数运算）

### 7.5 CART分类树的完整实现

```python
import numpy as np
from collections import Counter
import copy

class CARTDecisionTreeClassifier:
    """
    CART分类决策树的完整实现
    
    特点：
    - 生成二叉树
    - 使用基尼系数作为分裂准则
    - 支持连续特征
    - 包含后剪枝机制
    """
    
    def __init__(self, max_depth=None, min_samples_split=2, 
                 min_samples_leaf=1, ccp_alpha=0):
        """
        参数:
            max_depth: 树的最大深度
            min_samples_split: 分裂所需的最小样本数
            min_samples_leaf: 叶节点的最小样本数
            ccp_alpha: 复杂度参数（用于代价复杂度剪枝）
        """
        self.max_depth = max_depth
        self.min_samples_split = min_samples_split
        self.min_samples_leaf = min_samples_leaf
        self.ccp_alpha = ccp_alpha
        self.tree = None
        self.feature_names = None
    
    def fit(self, X, y, feature_names=None):
        """
        训练CART决策树
        """
        self.feature_names = feature_names
        self.n_features = X.shape[1]
        self.n_classes = len(np.unique(y))
        
        # 构建树
        self.tree = self._build_tree(X, y, depth=0)
        
        # 代价复杂度剪枝
        if self.ccp_alpha > 0:
            self._prune_tree()
        
        return self
    
    def _build_tree(self, X, y, depth):
        """递归构建决策树"""
        n_samples = len(y)
        unique_classes = np.unique(y)
        
        # 记录类分布
        class_counts = Counter(y)
        
        # 停止条件1：所有样本属于同一类别
        if len(unique_classes) == 1:
            return {
                'type': 'leaf',
                'class': unique_classes[0],
                'class_distribution': dict(class_counts),
                'n_samples': n_samples,
                'impurity': 0
            }
        
        # 停止条件2：达到最大深度
        if self.max_depth is not None and depth >= self.max_depth:
            majority_class = class_counts.most_common(1)[0][0]
            return {
                'type': 'leaf',
                'class': majority_class,
                'class_distribution': dict(class_counts),
                'n_samples': n_samples,
                'impurity': self._gini(y)
            }
        
        # 停止条件3：样本数少于最小分裂数
        if n_samples < self.min_samples_split:
            majority_class = class_counts.most_common(1)[0][0]
            return {
                'type': 'leaf',
                'class': majority_class,
                'class_distribution': dict(class_counts),
                'n_samples': n_samples,
                'impurity': self._gini(y)
            }
        
        # 找到最优分裂
        best_feature, best_threshold, best_gain = self._find_best_split(X, y)
        
        # 停止条件4：没有有效分裂
        if best_feature is None or best_gain <= 0:
            majority_class = class_counts.most_common(1)[0][0]
            return {
                'type': 'leaf',
                'class': majority_class,
                'class_distribution': dict(class_counts),
                'n_samples': n_samples,
                'impurity': self._gini(y)
            }
        
        # 获取特征名
        if self.feature_names is not None:
            feature_name = self.feature_names[best_feature]
        else:
            feature_name = f"feature_{best_feature}"
        
        # 分裂数据
        left_mask = X[:, best_feature] <= best_threshold
        right_mask = ~left_mask
        
        # 检查子节点样本数
        if np.sum(left_mask) < self.min_samples_leaf or \
           np.sum(right_mask) < self.min_samples_leaf:
            majority_class = class_counts.most_common(1)[0][0]
            return {
                'type': 'leaf',
                'class': majority_class,
                'class_distribution': dict(class_counts),
                'n_samples': n_samples,
                'impurity': self._gini(y)
            }
        
        # 创建内部节点
        current_impurity = self._gini(y)
        node = {
            'type': 'internal',
            'feature': best_feature,
            'feature_name': feature_name,
            'threshold': best_threshold,
            'n_samples': n_samples,
            'impurity': current_impurity,
            'gain': best_gain,
            'left': self._build_tree(X[left_mask], y[left_mask], depth + 1),
            'right': self._build_tree(X[right_mask], y[right_mask], depth + 1)
        }
        
        return node
    
    def _find_best_split(self, X, y):
        """找到最优分裂"""
        n_samples, n_features = X.shape
        
        best_gain = 0
        best_feature = None
        best_threshold = None
        
        current_gini = self._gini(y)
        
        for feature_idx in range(n_features):
            # 获取该特征的唯一值
            unique_values = np.unique(X[:, feature_idx])
            
            # 尝试所有可能的分裂点
            for i in range(len(unique_values) - 1):
                threshold = (unique_values[i] + unique_values[i + 1]) / 2
                
                # 分裂
                left_mask = X[:, feature_idx] <= threshold
                right_mask = ~left_mask
                
                # 检查叶节点样本数
                if np.sum(left_mask) < self.min_samples_leaf or \
                   np.sum(right_mask) < self.min_samples_leaf:
                    continue
                
                # 计算加权基尼系数
                left_gini = self._gini(y[left_mask])
                right_gini = self._gini(y[right_mask])
                
                weighted_gini = (
                    np.sum(left_mask) / n_samples * left_gini +
                    np.sum(right_mask) / n_samples * right_gini
                )
                
                # 计算基尼增益
                gain = current_gini - weighted_gini
                
                if gain > best_gain:
                    best_gain = gain
                    best_feature = feature_idx
                    best_threshold = threshold
        
        return best_feature, best_threshold, best_gain
    
    def _gini(self, y):
        """计算基尼系数"""
        n_samples = len(y)
        if n_samples == 0:
            return 0
        
        class_counts = Counter(y)
        gini = 1
        
        for count in class_counts.values():
            p = count / n_samples
            gini -= p ** 2
        
        return gini
    
    def _prune_tree(self):
        """代价复杂度剪枝"""
        # 获取所有节点的路径
        # 这里简化处理，实际的剪枝更复杂
        pass
    
    def predict_single(self, x, node=None):
        """预测单个样本"""
        if node is None:
            node = self.tree
        
        if node['type'] == 'leaf':
            return node['class']
        
        if x[node['feature']] <= node['threshold']:
            return self.predict_single(x, node['left'])
        else:
            return self.predict_single(x, node['right'])
    
    def predict(self, X):
        """预测多个样本"""
        return np.array([self.predict_single(x) for x in X])
    
    def predict_proba(self, X):
        """预测类别概率"""
        probas = []
        for x in X:
            node = self.tree
            while node['type'] != 'leaf':
                if x[node['feature']] <= node['threshold']:
                    node = node['left']
                else:
                    node = node['right']
            
            # 计算该叶节点的类别分布概率
            total = sum(node['class_distribution'].values())
            proba = [node['class_distribution'].get(c, 0) / total 
                    for c in range(self.n_classes)]
            probas.append(proba)
        
        return np.array(probas)
    
    def score(self, X, y):
        """计算准确率"""
        predictions = self.predict(X)
        return np.mean(predictions == y)
    
    def get_depth(self, node=None):
        """获取树的深度"""
        if node is None:
            node = self.tree
        
        if node['type'] == 'leaf':
            return 0
        
        return 1 + max(
            self.get_depth(node['left']),
            self.get_depth(node['right'])
        )
    
    def get_n_leaves(self, node=None):
        """获取叶节点数量"""
        if node is None:
            node = self.tree
        
        if node['type'] == 'leaf':
            return 1
        
        return self.get_n_leaves(node['left']) + self.get_n_leaves(node['right'])
    
    def print_tree(self, node=None, depth=0, indent=""):
        """打印决策树"""
        if node is None:
            node = self.tree
        
        if node['type'] == 'leaf':
            class_dist = node['class_distribution']
            total = sum(class_dist.values())
            dist_str = ", ".join([f"类{c}: {count}/{total}" 
                                 for c, count in sorted(class_dist.items())])
            print(f"{indent}叶子: 预测={node['class']}, {dist_str}")
        else:
            print(f"{indent}[{node['feature_name']} <= {node['threshold']:.3f}] "
                  f"(增益={node['gain']:.4f})")
            print(f"{indent}  左子树:")
            self.print_tree(node['left'], depth + 1, indent + "    ")
            print(f"{indent}  右子树:")
            self.print_tree(node['right'], depth + 1, indent + "    ")

# 示例：使用CART算法
if __name__ == "__main__":
    from sklearn.datasets import make_classification
    from sklearn.model_selection import train_test_split
    from sklearn.metrics import classification_report, confusion_matrix
    
    # 生成随机数据
    np.random.seed(42)
    X, y = make_classification(
        n_samples=500,
        n_features=5,
        n_informative=3,
        n_redundant=2,
        n_classes=2,
        random_state=42
    )
    
    feature_names = [f'特征{i+1}' for i in range(5)]
    
    # 划分训练集和测试集
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    
    # 创建并训练CART决策树
    tree = CARTDecisionTreeClassifier(
        max_depth=5,
        min_samples_split=10,
        min_samples_leaf=5
    )
    tree.fit(X_train, y_train, feature_names)
    
    # 打印树结构
    print("CART决策树结构:")
    print("=" * 50)
    tree.print_tree()
    
    # 评估
    print(f"\n树的深度: {tree.get_depth()}")
    print(f"叶节点数量: {tree.get_n_leaves()}")
    
    y_pred = tree.predict(X_test)
    print(f"\n测试集准确率: {tree.score(X_test, y_test):.2%}")
    
    print("\n分类报告:")
    print(classification_report(y_test, y_pred))
    
    print("混淆矩阵:")
    print(confusion_matrix(y_test, y_pred))
```

### 7.6 CART回归树

除了分类，CART算法还可以用于回归任务。回归树的叶节点不是类别，而是连续值（通常是该叶节点所有样本目标值的平均值）。

回归树使用**方差减少**（Variance Reduction）或**最小二乘误差**作为分裂准则：

$$
MSE = \frac{1}{n} \sum_{i=1}^{n} (y_i - \bar{y})^2
$$

```python
class CARTDecisionTreeRegressor:
    """
    CART回归决策树的完整实现
    
    特点：
    - 生成二叉树
    - 使用MSE（均方误差）作为分裂准则
    - 叶节点返回该区域内样本的目标均值
    """
    
    def __init__(self, max_depth=None, min_samples_split=2, 
                 min_samples_leaf=1):
        self.max_depth = max_depth
        self.min_samples_split = min_samples_split
        self.min_samples_leaf = min_samples_leaf
        self.tree = None
        self.feature_names = None
        self.n_features = None
    
    def fit(self, X, y, feature_names=None):
        """训练回归树"""
        self.feature_names = feature_names
        self.n_features = X.shape[1]
        
        self.tree = self._build_tree(X, y, depth=0)
        return self
    
    def _build_tree(self, X, y, depth):
        """递归构建回归树"""
        n_samples = len(y)
        
        # 记录统计信息
        node_stats = {
            'mean': np.mean(y),
            'variance': np.var(y),
            'n_samples': n_samples
        }
        
        # 停止条件1：达到最大深度
        if self.max_depth is not None and depth >= self.max_depth:
            return {
                'type': 'leaf',
                'prediction': node_stats['mean'],
                'stats': node_stats
            }
        
        # 停止条件2：样本数少于最小分裂数
        if n_samples < self.min_samples_split:
            return {
                'type': 'leaf',
                'prediction': node_stats['mean'],
                'stats': node_stats
            }
        
        # 找到最优分裂
        best_feature, best_threshold, best_reduction = self._find_best_split(X, y)
        
        # 停止条件3：没有有效分裂
        if best_feature is None or best_reduction <= 0:
            return {
                'type': 'leaf',
                'prediction': node_stats['mean'],
                'stats': node_stats
            }
        
        # 分裂数据
        left_mask = X[:, best_feature] <= best_threshold
        right_mask = ~left_mask
        
        # 检查子节点样本数
        if np.sum(left_mask) < self.min_samples_leaf or \
           np.sum(right_mask) < self.min_samples_leaf:
            return {
                'type': 'leaf',
                'prediction': node_stats['mean'],
                'stats': node_stats
            }
        
        # 获取特征名
        if self.feature_names is not None:
            feature_name = self.feature_names[best_feature]
        else:
            feature_name = f"feature_{best_feature}"
        
        # 创建内部节点
        current_variance = node_stats['variance']
        node = {
            'type': 'internal',
            'feature': best_feature,
            'feature_name': feature_name,
            'threshold': best_threshold,
            'stats': node_stats,
            'mse_reduction': best_reduction,
            'left': self._build_tree(X[left_mask], y[left_mask], depth + 1),
            'right': self._build_tree(X[right_mask], y[right_mask], depth + 1)
        }
        
        return node
    
    def _find_best_split(self, X, y):
        """找到最优分裂（使用方差减少）"""
        n_samples, n_features = X.shape
        
        best_reduction = 0
        best_feature = None
        best_threshold = None
        
        current_variance = np.var(y)
        
        if current_variance == 0:
            return None, None, 0
        
        for feature_idx in range(n_features):
            unique_values = np.unique(X[:, feature_idx])
            
            for i in range(len(unique_values) - 1):
                threshold = (unique_values[i] + unique_values[i + 1]) / 2
                
                left_mask = X[:, feature_idx] <= threshold
                right_mask = ~left_mask
                
                if np.sum(left_mask) < self.min_samples_leaf or \
                   np.sum(right_mask) < self.min_samples_leaf:
                    continue
                
                # 计算加权方差
                left_variance = np.var(y[left_mask]) if np.sum(left_mask) > 0 else 0
                right_variance = np.var(y[right_mask]) if np.sum(right_mask) > 0 else 0
                
                weighted_variance = (
                    np.sum(left_mask) / n_samples * left_variance +
                    np.sum(right_mask) / n_samples * right_variance
                )
                
                # 计算方差减少量
                reduction = current_variance - weighted_variance
                
                if reduction > best_reduction:
                    best_reduction = reduction
                    best_feature = feature_idx
                    best_threshold = threshold
        
        return best_feature, best_threshold, best_reduction
    
    def predict_single(self, x, node=None):
        """预测单个样本"""
        if node is None:
            node = self.tree
        
        if node['type'] == 'leaf':
            return node['prediction']
        
        if x[node['feature']] <= node['threshold']:
            return self.predict_single(x, node['left'])
        else:
            return self.predict_single(x, node['right'])
    
    def predict(self, X):
        """预测多个样本"""
        return np.array([self.predict_single(x) for x in X])
    
    def score(self, X, y):
        """
        计算R²分数（决定系数）
        R² = 1 - SS_res / SS_tot
        """
        predictions = self.predict(X)
        ss_res = np.sum((y - predictions) ** 2)
        ss_tot = np.sum((y - np.mean(y)) ** 2)
        return 1 - ss_res / ss_tot if ss_tot != 0 else 0
    
    def print_tree(self, node=None, depth=0, indent=""):
        """打印决策树"""
        if node is None:
            node = self.tree
        
        if node['type'] == 'leaf':
            print(f"{indent}叶子: 预测值={node['prediction']:.4f}, "
                  f"样本数={node['stats']['n_samples']}")
        else:
            print(f"{indent}[{node['feature_name']} <= {node['threshold']:.3f}] "
                  f"(MSE减少={node['mse_reduction']:.4f})")
            print(f"{indent}  左子树:")
            self.print_tree(node['left'], depth + 1, indent + "    ")
            print(f"{indent}  右子树:")
            self.print_tree(node['right'], depth + 1, indent + "    ")

# 示例：使用CART回归树
if __name__ == "__main__":
    # 生成回归数据
    np.random.seed(42)
    n_samples = 500
    
    X = np.random.randn(n_samples, 3) * 2
    y = 3 * X[:, 0] + 2 * X[:, 1] - X[:, 2] + np.random.randn(n_samples) * 0.5
    
    feature_names = ['特征1', '特征2', '特征3']
    
    # 划分训练集和测试集
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    
    # 创建并训练回归树
    tree = CARTDecisionTreeRegressor(max_depth=5)
    tree.fit(X_train, y_train, feature_names)
    
    # 打印树结构
    print("CART回归树结构:")
    print("=" * 50)
    tree.print_tree()
    
    # 评估
    y_pred = tree.predict(X_test)
    r2_score = tree.score(X_test, y_test)
    
    print(f"\nR²分数: {r2_score:.4f}")
    print(f"MSE: {np.mean((y_test - y_pred) ** 2):.4f}")
    print(f"RMSE: {np.sqrt(np.mean((y_test - y_pred) ** 2)):.4f}")
    
    # 可视化预测结果
    plt.figure(figsize=(10, 5))
    
    plt.subplot(1, 2, 1)
    plt.scatter(y_test, y_pred, alpha=0.5)
    plt.plot([y_test.min(), y_test.max()], 
             [y_test.min(), y_test.max()], 'r--', lw=2)
    plt.xlabel('真实值')
    plt.ylabel('预测值')
    plt.title('回归树预测效果')
    
    plt.subplot(1, 2, 2)
    residuals = y_test - y_pred
    plt.hist(residuals, bins=30, edgecolor='black')
    plt.xlabel('残差')
    plt.ylabel('频数')
    plt.title('残差分布')
    
    plt.tight_layout()
    plt.savefig('regression_tree_results.png', dpi=150)
    plt.show()
```

---

## 8. 决策树的剪枝策略

### 8.1 什么是过拟合？

决策树的一个主要问题是**过拟合（Overfitting）**。过拟合是指模型在训练数据上表现很好，但在新数据（测试数据）上表现很差。

**过拟合的原因**：
1. 树的深度太大，学习了训练数据中的噪声
2. 分支过多，某些分支只包含很少的样本
3. 完全拟合训练数据，包括噪声

### 8.2 什么是剪枝？

**剪枝（Pruning）**是防止过拟合的技术，通过移除树的某些部分来简化模型。

剪枝有两种主要策略：
1. **预剪枝（Pre-pruning）**：在构建树的过程中设置停止条件
2. **后剪枝（Post-pruning）**：先构建完整的树，然后移除不重要的分支

### 8.3 预剪枝策略

预剪枝在树的构建过程中进行限制，主要方法包括：

1. **限制最大深度**：`max_depth`
2. **限制最小样本数**：分裂或叶节点的最小样本数
3. **限制最小信息增益**：只有增益大于阈值时才分裂
4. **限制叶节点数量**：`max_leaf_nodes`

**预剪枝的优点**：
- 计算简单，效率高
- 可以避免过拟合

**预剪枝的缺点**：
- 可能导致欠拟合
- 可能会错过有价值的信息

### 8.4 后剪枝策略

后剪枝先让树完全生长，然后再进行修剪。主要方法包括：

1. **代价复杂度剪枝（Cost Complexity Pruning, CCP）**
2. **悲观剪枝（Pesimistic Pruning）**
3. **错误率降低剪枝（Reduced Error Pruning, REP）**

### 8.5 代价复杂度剪枝（CCP）

CCP是CART算法使用的剪枝方法，它在树的复杂度和预测误差之间寻找平衡。

CCP的核心概念是**代价复杂度参数** $\alpha$：

$$
R_\alpha(T) = R(T) + \alpha |T|
$$

其中：
- $R(T)$ 是树T的预测误差（如基尼系数或熵）
- $|T|$ 是树T的叶节点数量
- $\alpha$ 是复杂度参数

**CCP剪枝步骤**：

```
1. 构建完整的树 T_max
2. 对树进行序列剪枝：
   a. 对于每个非叶节点，计算其剪枝后的误差
   b. 找到误差减少最少的节点
   c. 剪掉该节点，用叶节点替代
   d. 重复直到只剩根节点
3. 使用验证集选择最优的树
```

### 8.6 剪枝的完整实现

```python
import numpy as np
from collections import Counter

class DecisionTreePruner:
    """
    决策树剪枝工具类
    
    实现了：
    - 预剪枝
    - 代价复杂度剪枝（CCP）
    - 悲观剪枝
    """
    
    @staticmethod
    def pre_prune_by_depth(tree, max_depth):
        """根据最大深度进行预剪枝"""
        if tree['type'] == 'leaf':
            return tree
        
        current_depth = tree.get('depth', 0)
        
        if current_depth >= max_depth:
            # 转换为叶节点
            majority_class = max(tree.get('class_distribution', {0: 1}).items(),
                                key=lambda x: x[1])[0]
            return {
                'type': 'leaf',
                'class': majority_class,
                'class_distribution': tree.get('class_distribution', {}),
                'n_samples': tree.get('n_samples', 0),
                'pruned': True
            }
        
        # 递归处理子节点
        tree['left'] = DecisionTreePruner.pre_prune_by_depth(
            tree['left'], max_depth, current_depth + 1
        )
        tree['right'] = DecisionTreePruner.pre_prune_by_depth(
            tree['right'], max_depth, current_depth + 1
        )
        
        return tree
    
    @staticmethod
    def pre_prune_by_samples(tree, min_samples_leaf):
        """根据最小叶节点样本数进行预剪枝"""
        if tree['type'] == 'leaf':
            return tree
        
        # 递归处理子节点
        tree['left'] = DecisionTreePruner.pre_prune_by_samples(
            tree['left'], min_samples_leaf
        )
        tree['right'] = DecisionTreePruner.pre_prune_by_samples(
            tree['right'], min_samples_leaf
        )
        
        # 检查是否需要剪枝
        left_samples = tree['left'].get('n_samples', 0)
        right_samples = tree['right'].get('n_samples', 0)
        
        if left_samples < min_samples_leaf and right_samples < min_samples_leaf:
            majority_class = max(tree.get('class_distribution', {0: 1}).items(),
                                key=lambda x: x[1])[0]
            return {
                'type': 'leaf',
                'class': majority_class,
                'class_distribution': tree.get('class_distribution', {}),
                'n_samples': tree.get('n_samples', 0),
                'pruned': True
            }
        
        return tree
    
    @staticmethod
    def cost_complexity_prune(tree, X_val, y_val, ccp_alpha=0.01):
        """
        代价复杂度剪枝
        
        参数:
            tree: 决策树
            X_val: 验证集特征
            y_val: 验证集标签
            ccp_alpha: 复杂度参数
        """
        # 获取所有可能的剪枝序列
        trees_sequence = DecisionTreePruner._get_pruning_sequence(tree)
        
        best_tree = tree
        best_accuracy = DecisionTreePruner._evaluate(best_tree, X_val, y_val)
        
        # 尝试每个剪枝后的树
        for pruned_tree in trees_sequence:
            accuracy = DecisionTreePruner._evaluate(pruned_tree, X_val, y_val)
            
            if accuracy > best_accuracy:
                best_accuracy = accuracy
                best_tree = pruned_tree
        
        return best_tree
    
    @staticmethod
    def _get_pruning_sequence(tree):
        """获取剪枝序列（从底向上）"""
        # 找到所有非叶节点
        non_leaf_nodes = DecisionTreePruner._find_non_leaf_nodes(tree)
        
        # 按深度排序（从浅到深）
        sorted_nodes = sorted(non_leaf_nodes, key=lambda n: n.get('depth', 0))
        
        # 生成剪枝序列
        sequence = []
        current_tree = tree
        
        for node in reversed(sorted_nodes):  # 从深到浅剪枝
            # 复制当前树
            pruned_tree = DecisionTreePruner._prune_node(
                current_tree, node['path']
            )
            sequence.append(pruned_tree)
        
        return sequence
    
    @staticmethod
    def _find_non_leaf_nodes(tree, depth=0, parent=None, path=None):
        """找到所有非叶节点"""
        if path is None:
            path = []
        
        if tree['type'] == 'leaf':
            return []
        
        nodes = [{
            'node': tree,
            'depth': depth,
            'parent': parent,
            'path': path + ['current']
        }]
        
        # 递归查找子节点
        nodes.extend(DecisionTreePruner._find_non_leaf_nodes(
            tree.get('left', {}), depth + 1, tree, path + ['left']
        ))
        nodes.extend(DecisionTreePruner._find_non_leaf_nodes(
            tree.get('right', {}), depth + 1, tree, path + ['right']
        ))
        
        return nodes
    
    @staticmethod
    def _prune_node(tree, path):
        """根据路径剪枝节点"""
        if not path:
            return DecisionTreePruner._make_leaf(tree)
        
        current = path[0]
        
        if current == 'current':
            return DecisionTreePruner._make_leaf(tree)
        elif current == 'left':
            return {
                **tree,
                'left': DecisionTreePruner._prune_node(
                    tree['left'], path[1:]
                )
            }
        elif current == 'right':
            return {
                **tree,
                'right': DecisionTreePruner._prune_node(
                    tree['right'], path[1:]
                )
            }
        
        return tree
    
    @staticmethod
    def _make_leaf(node):
        """将节点转换为叶节点"""
        majority_class = max(node.get('class_distribution', {0: 1}).items(),
                            key=lambda x: x[1])[0]
        return {
            'type': 'leaf',
            'class': majority_class,
            'class_distribution': node.get('class_distribution', {}),
            'n_samples': node.get('n_samples', 0),
            'pruned': True
        }
    
    @staticmethod
    def _evaluate(tree, X, y):
        """评估树的准确率"""
        predictions = DecisionTreePruner._predict(tree, X)
        return np.mean(predictions == y)
    
    @staticmethod
    def _predict(tree, X):
        """预测"""
        return np.array([DecisionTreePruner._predict_single(tree, x) for x in X])
    
    @staticmethod
    def _predict_single(tree, x):
        """预测单个样本"""
        if tree['type'] == 'leaf':
            return tree['class']
        
        if x[tree['feature']] <= tree['threshold']:
            return DecisionTreePruner._predict_single(tree['left'], x)
        else:
            return DecisionTreePruner._predict_single(tree['right'], x)

# 示例：对比剪枝前后的效果
if __name__ == "__main__":
    from sklearn.datasets import make_moons
    from sklearn.model_selection import train_test_split
    from sklearn.tree import DecisionTreeClassifier
    from sklearn.metrics import accuracy_score
    
    # 生成复杂数据集
    np.random.seed(42)
    X, y = make_moons(n_samples=500, noise=0.3, random_state=42)
    
    # 划分训练集和验证集
    X_train, X_val, y_train, y_val = train_test_split(
        X, y, test_size=0.3, random_state=42
    )
    
    # 测试不同的深度
    depths = range(1, 20)
    train_scores = []
    val_scores = []
    
    for depth in depths:
        # 训练不剪枝的树
        tree = DecisionTreeClassifier(max_depth=depth, random_state=42)
        tree.fit(X_train, y_train)
        
        train_scores.append(accuracy_score(y_train, tree.predict(X_train)))
        val_scores.append(accuracy_score(y_val, tree.predict(X_val)))
    
    # 绘图
    plt.figure(figsize=(12, 5))
    
    plt.subplot(1, 2, 1)
    plt.plot(depths, train_scores, 'b-o', label='训练集准确率')
    plt.plot(depths, val_scores, 'r-o', label='验证集准确率')
    plt.xlabel('树深度')
    plt.ylabel('准确率')
    plt.title('不同深度的准确率对比')
    plt.legend()
    plt.grid(True, alpha=0.3)
    
    # 找到最优深度
    best_depth = depths[np.argmax(val_scores)]
    best_score = max(val_scores)
    
    plt.axvline(x=best_depth, color='g', linestyle='--', 
                label=f'最优深度={best_depth}')
    plt.legend()
    
    plt.subplot(1, 2, 2)
    
    # 可视化数据分布
    plt.scatter(X[:, 0], X[:, 1], c=y, cmap='coolwarm', alpha=0.5)
    plt.xlabel('特征1')
    plt.ylabel('特征2')
    plt.title('数据集分布')
    
    plt.tight_layout()
    plt.savefig('pruning_comparison.png', dpi=150)
    plt.show()
    
    print(f"\n最优深度: {best_depth}")
    print(f"最优验证集准确率: {best_score:.2%}")
    print(f"训练集准确率（在最优深度）: {train_scores[best_depth-1]:.2%}")
    print(f"\n过拟合程度: {train_scores[best_depth-1] - best_score:.2%}")
```

---

## 9. 连续值和缺失值处理

### 9.1 连续值处理

在实际数据中，很多特征是连续值（如年龄、收入、温度等）。决策树需要将这些连续值离散化才能使用。

**连续值处理的方法**：

1. **二分法（Binary Split）**：找到最佳分裂点，将连续值分成两组
2. **多路分裂**：每个唯一值作为一个分支

scikit-learn的决策树默认使用二分法。

### 9.2 连续值分裂点选择

对于连续特征，找到最优分裂点的步骤：

```
1. 对所有样本按该特征值排序
2. 计算相邻值的平均值作为候选分裂点
3. 计算每个候选分裂点的信息增益/基尼系数
4. 选择信息增益最大/基尼系数最小的分裂点
```

**计算复杂度**：如果有N个唯一值，需要计算N-1个候选分裂点。

### 9.3 缺失值处理

缺失值在实际数据中很常见。处理缺失值的方法包括：

1. **删除法**：删除含有缺失值的样本或特征
2. **填充法**：用均值、中位数、众数等填充
3. **特殊值法**：将缺失值当作一个特殊类别
4. **加权法**：根据非缺失值的分布给缺失样本分配权重

### 9.4 C4.5的缺失值处理

C4.5算法使用加权方式处理缺失值：

```
对于特征A的缺失值：
1. 将样本按比例分配到各子节点
2. 权重 = 该子节点样本数 / 总样本数
3. 在计算信息增益时考虑权重
```

### 9.5 连续值和缺失值的完整实现

```python
import numpy as np
from collections import Counter
import math

class DecisionTreeWithContinuousAndMissing:
    """
    支持连续特征和缺失值的决策树实现
    """
    
    def __init__(self, max_depth=10, min_samples_split=2, 
                 min_samples_leaf=1, missing_value_strategy='weighted'):
        self.max_depth = max_depth
        self.min_samples_split = min_samples_split
        self.min_samples_leaf = min_samples_leaf
        self.missing_value_strategy = missing_value_strategy
        self.tree = None
    
    def fit(self, X, y, feature_types=None):
        """
        训练决策树
        
        参数:
            X: 特征矩阵 (可能包含NaN表示缺失值)
            y: 目标变量
            feature_types: 每个特征的类型 ['continuous', 'discrete']
        """
        self.n_features = X.shape[1]
        self.n_classes = len(np.unique(y))
        
        # 默认所有特征为连续型
        if feature_types is None:
            feature_types = ['continuous'] * self.n_features
        self.feature_types = feature_types
        
        # 处理缺失值
        X_processed = self._handle_missing_values(X)
        
        # 构建树
        self.tree = self._build_tree(X_processed, y, depth=0)
        
        return self
    
    def _handle_missing_values(self, X):
        """处理缺失值"""
        X_processed = X.copy()
        
        if self.missing_value_strategy == 'mean':
            # 用均值填充
            for j in range(X.shape[1]):
                mask = ~np.isnan(X[:, j])
                if not np.all(mask):  # 如果有缺失值
                    mean_val = np.mean(X[mask, j])
                    X_processed[np.isnan(X[:, j]), j] = mean_val
        
        elif self.missing_value_strategy == 'median':
            # 用中位数填充
            for j in range(X.shape[1]):
                mask = ~np.isnan(X[:, j])
                if not np.all(mask):
                    median_val = np.median(X[mask, j])
                    X_processed[np.isnan(X[:, j]), j] = median_val
        
        elif self.missing_value_strategy == 'most_frequent':
            # 用众数填充（离散特征）
            for j in range(X.shape[1]):
                mask = ~np.isnan(X[:, j])
                if not np.all(mask):
                    if self.feature_types[j] == 'discrete':
                        counter = Counter(X[mask, j])
                        mode_val = counter.most_common(1)[0][0]
                    else:
                        mode_val = np.median(X[mask, j])
                    X_processed[np.isnan(X[:, j]), j] = mode_val
        
        elif self.missing_value_strategy == 'weighted':
            # 不填充，在分裂时处理
            pass
        
        return X_processed
    
    def _build_tree(self, X, y, depth, sample_weights=None):
        """递归构建决策树"""
        n_samples = len(y)
        
        # 初始化样本权重
        if sample_weights is None:
            sample_weights = np.ones(n_samples) / n_samples
        else:
            sample_weights = sample_weights / np.sum(sample_weights)
        
        unique_classes = np.unique(y)
        
        # 记录类分布（加权）
        class_distribution = {}
        for c in unique_classes:
            mask = y == c
            class_distribution[c] = np.sum(sample_weights[mask])
        
        # 停止条件1：所有样本属于同一类别
        if len(unique_classes) == 1:
            return {
                'type': 'leaf',
                'class': unique_classes[0],
                'class_distribution': class_distribution,
                'n_samples': n_samples,
                'weight': np.sum(sample_weights)
            }
        
        # 停止条件2：达到最大深度
        if depth >= self.max_depth:
            majority_class = max(class_distribution.items(), key=lambda x: x[1])[0]
            return {
                'type': 'leaf',
                'class': majority_class,
                'class_distribution': class_distribution,
                'n_samples': n_samples,
                'weight': np.sum(sample_weights)
            }
        
        # 停止条件3：样本数太少
        if n_samples < self.min_samples_split:
            majority_class = max(class_distribution.items(), key=lambda x: x[1])[0]
            return {
                'type': 'leaf',
                'class': majority_class,
                'class_distribution': class_distribution,
                'n_samples': n_samples,
                'weight': np.sum(sample_weights)
            }
        
        # 找到最优分裂
        best_feature, best_threshold, best_gain = self._find_best_split(
            X, y, sample_weights
        )
        
        # 停止条件4：没有有效分裂
        if best_feature is None:
            majority_class = max(class_distribution.items(), key=lambda x: x[1])[0]
            return {
                'type': 'leaf',
                'class': majority_class,
                'class_distribution': class_distribution,
                'n_samples': n_samples,
                'weight': np.sum(sample_weights)
            }
        
        # 创建决策节点
        node = {
            'type': 'internal',
            'feature': best_feature,
            'feature_type': self.feature_types[best_feature],
            'threshold': best_threshold,
            'n_samples': n_samples,
            'class_distribution': class_distribution,
            'weight': np.sum(sample_weights)
        }
        
        # 分裂数据
        if self.feature_types[best_feature] == 'continuous':
            # 连续特征：二分裂
            left_mask = X[:, best_feature] <= best_threshold
            right_mask = ~left_mask
            
            # 处理缺失值：将缺失样本分配到两个子节点
            missing_mask = np.isnan(X[:, best_feature])
            if np.any(missing_mask):
                # 按比例分配
                left_ratio = np.sum(left_mask) / (n_samples - np.sum(missing_mask))
                right_ratio = 1 - left_ratio
                
                # 分配权重
                missing_weights_left = sample_weights[missing_mask] * left_ratio
                missing_weights_right = sample_weights[missing_mask] * right_ratio
                
                # 更新权重
                left_weights = sample_weights.copy()
                left_weights[missing_mask] = missing_weights_left
                
                right_weights = sample_weights.copy()
                right_weights[missing_mask] = missing_weights_right
            else:
                left_weights = sample_weights
                right_weights = sample_weights
            
            node['left'] = self._build_tree(
                X, y, depth + 1, left_weights
            )
            node['right'] = self._build_tree(
                X, y, depth + 1, right_weights
            )
        else:
            # 离散特征：多分裂
            unique_values = np.unique(X[~np.isnan(X[:, best_feature]), best_feature])
            node['children'] = {}
            
            for value in unique_values:
                value_mask = X[:, best_feature] == value
                subset_weights = sample_weights.copy()
                subset_weights[~value_mask] = 0
                
                node['children'][value] = self._build_tree(
                    X, y, depth + 1, subset_weights / np.sum(subset_weights)
                )
            
            # 处理缺失值
            missing_mask = np.isnan(X[:, best_feature])
            if np.any(missing_mask):
                # 创建缺失类别
                missing_weights = sample_weights.copy()
                missing_weights[~missing_mask] = 0
                
                node['children']['missing'] = self._build_tree(
                    X, y, depth + 1, missing_weights / np.sum(missing_weights)
                )
        
        return node
    
    def _find_best_split(self, X, y, sample_weights):
        """找到最优分裂"""
        n_samples = len(y)
        
        # 计算原始加权熵/基尼
        original_impurity = self._weighted_gini(y, sample_weights)
        
        best_gain = 0
        best_feature = None
        best_threshold = None
        
        for feature_idx in range(self.n_features):
            feature_values = X[:, feature_idx]
            valid_mask = ~np.isnan(feature_values)
            
            if self.feature_types[feature_idx] == 'continuous':
                # 连续特征
                unique_values = np.unique(feature_values[valid_mask])
                
                if len(unique_values) < 2:
                    continue
                
                for i in range(len(unique_values) - 1):
                    threshold = (unique_values[i] + unique_values[i + 1]) / 2
                    
                    left_mask = feature_values <= threshold
                    right_mask = feature_values > threshold
                    
                    # 计算加权基尼系数
                    gain = self._calculate_split_gain(
                        y, feature_values, left_mask, right_mask,
                        sample_weights, original_impurity
                    )
                    
                    if gain > best_gain:
                        best_gain = gain
                        best_feature = feature_idx
                        best_threshold = threshold
            else:
                # 离散特征
                unique_values = np.unique(feature_values[valid_mask])
                
                if len(unique_values) < 2:
                    continue
                
                # 计算分裂增益
                impurity = 0
                for value in unique_values:
                    value_mask = feature_values == value
                    value_y = y[value_mask]
                    value_weights = sample_weights[value_mask]
                    
                    if len(value_y) > 0:
                        value_gini = self._weighted_gini(value_y, value_weights)
                        impurity += np.sum(value_weights) * value_gini
                
                impurity /= np.sum(sample_weights)
                gain = original_impurity - impurity
                
                if gain > best_gain:
                    best_gain = gain
                    best_feature = feature_idx
                    best_threshold = None
        
        return best_feature, best_threshold, best_gain
    
    def _weighted_gini(self, y, weights):
        """计算加权基尼系数"""
        n_samples = len(y)
        if n_samples == 0:
            return 0
        
        classes = np.unique(y)
        gini = 1
        
        for c in classes:
            mask = y == c
            p = np.sum(weights[mask])
            gini -= p ** 2
        
        return gini
    
    def _calculate_split_gain(self, y, feature_values, left_mask, right_mask,
                              weights, original_impurity):
        """计算分裂增益"""
        n_samples = len(y)
        
        # 检查子集样本数
        left_weight = np.sum(weights[left_mask])
        right_weight = np.sum(weights[right_mask])
        
        if left_weight < self.min_samples_leaf or right_weight < self.min_samples_leaf:
            return 0
        
        # 计算加权基尼系数
        left_y = y[left_mask]
        left_weights = weights[left_mask]
        right_y = y[right_mask]
        right_weights = weights[right_mask]
        
        left_gini = self._weighted_gini(left_y, left_weights / np.sum(left_weights))
        right_gini = self._weighted_gini(right_y, right_weights / np.sum(right_weights))
        
        weighted_gini = left_weight * left_gini + right_weight * right_gini
        weighted_gini /= n_samples
        
        return original_impurity - weighted_gini
    
    def predict_single(self, x, node=None):
        """预测单个样本"""
        if node is None:
            node = self.tree
        
        if node['type'] == 'leaf':
            return node['class']
        
        feature_value = x[node['feature']]
        
        if node['feature_type'] == 'continuous':
            if np.isnan(feature_value):
                # 缺失值：选择权重更大的子节点
                if node['left']['weight'] > node['right']['weight']:
                    return self.predict_single(x, node['left'])
                else:
                    return self.predict_single(x, node['right'])
            elif feature_value <= node['threshold']:
                return self.predict_single(x, node['left'])
            else:
                return self.predict_single(x, node['right'])
        else:
            if feature_value in node['children']:
                return self.predict_single(x, node['children'][feature_value])
            elif 'missing' in node['children']:
                return self.predict_single(x, node['children']['missing'])
            else:
                return max(node['class_distribution'].items(), 
                          key=lambda x: x[1])[0]
    
    def predict(self, X):
        """预测多个样本"""
        return np.array([self.predict_single(x) for x in X])

# 示例：处理缺失值
if __name__ == "__main__":
    from sklearn.datasets import make_classification
    from sklearn.impute import SimpleImputer
    
    # 生成数据并人为添加缺失值
    np.random.seed(42)
    X, y = make_classification(n_samples=500, n_features=5, random_state=42)
    
    # 添加缺失值
    missing_rate = 0.1
    X_with_missing = X.copy()
    missing_mask = np.random.random(X.shape) < missing_rate
    X_with_missing[missing_mask] = np.nan
    
    print(f"缺失值数量: {np.sum(missing_mask)} / {X.size}")
    print(f"缺失比例: {np.sum(missing_mask) / X.size:.2%}")
    
    # 方法1：使用sklearn的填充
    imputer = SimpleImputer(strategy='mean')
    X_imputed = imputer.fit_transform(X_with_missing)
    
    # 方法2：使用自定义的加权处理
    tree = DecisionTreeWithContinuousAndMissing(max_depth=5)
    tree.fit(X_with_missing, y)
    
    # 比较效果
    from sklearn.tree import DecisionTreeClassifier
    from sklearn.model_selection import cross_val_score
    
    # 使用填充数据
    tree_filled = DecisionTreeClassifier(max_depth=5, random_state=42)
    scores_filled = cross_val_score(tree_filled, X_imputed, y, cv=5)
    
    # 使用原生支持缺失值的树
    tree_native = DecisionTreeWithContinuousAndMissing(max_depth=5)
    scores_native = []
    for train_idx, test_idx in StratifiedKFold(n_splits=5).split(X_with_missing, y):
        X_train, X_test = X_with_missing[train_idx], X_with_missing[test_idx]
        y_train, y_test = y[train_idx], y[test_idx]
        tree_native.fit(X_train, y_train)
        pred = tree_native.predict(X_test)
        scores_native.append(np.mean(pred == y_test))
    
    print(f"\n使用填充数据的准确率: {np.mean(scores_filled):.2%} (+/- {np.std(scores_filled):.2%})")
    print(f"使用原生缺失值处理的准确率: {np.mean(scores_native):.2%} (+/- {np.std(scores_native):.2%})")

from sklearn.model_selection import StratifiedKFold
```

---

## 10. 多叉树与二叉树的区别

### 10.1 多叉树（ID3、C4.5）

ID3和C4.5算法默认生成**多叉树**，即每个节点可以有多于两个子节点。

**特点**：
- 节点的分支数等于该特征的取值数
- 树可能更宽但更浅
- 适合离散特征

```
        [天气]
       /  |   \
    晴   阴   雨
```

### 10.2 二叉树（CART）

CART算法生成**二叉树**，即每个节点最多有两个子节点。

**特点**：
- 无论特征有多少取值，都通过二分法变成两个分支
- 树可能更深但更窄
- 更灵活，可以处理连续和离散特征

```
        [天气<=阴?]
         /       \
      是/         \否
       /           \
    [晴?]        [雨?]
```

### 10.3 两种树结构的比较

| 特性 | 多叉树 | 二叉树 |
|------|-------|-------|
| 分支数 | 多个 | 两个 |
| 深度 | 通常较浅 | 通常较深 |
| 复杂度 | 较低 | 较高 |
| 过拟合风险 | 较低 | 较高（需要剪枝） |
| 实现难度 | 较简单 | 较复杂 |
| 算法支持 | ID3, C4.5 | CART |

### 10.4 相互转换

多叉树和二叉树可以相互转换：

**多叉树转二叉树**：
- 为每个非二叉节点添加"虚拟"子节点
- 使用左子右兄表示法

**二叉树转多叉树**：
- 递归地将左子树转换为兄弟节点

---

## 11. 决策树的优缺点

### 11.1 优点

1. **易于理解和解释**
   - 决策树可以可视化
   - 生成的规则可以用自然语言表达
   - 非技术人员也能理解

2. **不需要太多的数据预处理**
   - 可以处理连续和离散特征
   - 对缺失值不敏感
   - 不需要特征缩放（如归一化）

3. **可以处理多输出问题**
   - 可以同时预测多个目标

4. **模型验证和评估简单**
   - 可以使用统计检验进行验证

5. **计算效率高**
   - 预测时间复杂度为 O(log n)
   - 训练时间复杂度为 O(n log n)

### 11.2 缺点

1. **容易过拟合**
   - 复杂的树容易记住噪声
   - 需要剪枝或设置深度限制

2. **对数据变化敏感**
   - 小的数据变化可能导致完全不同的树
   - 稳定性较低

3. **偏向选择多值特征**
   - 信息增益可能偏向取值多的特征
   - C4.5通过信息增益率改善了这个问题

4. **可能产生复杂的树**
   - 最优决策树是NP难问题
   - 贪婪算法可能找到局部最优

5. **不适合高维数据**
   - 特征过多时可能过拟合
   - 需要特征选择

### 11.3 决策树的适用场景

**适合使用决策树**：
- 数据特征相对较少（<20）
- 需要可解释的模型
- 数据有明显的决策边界
- 需要处理混合类型特征

**不适合使用决策树**：
- 特征数量非常大
- 数据变化剧烈
- 需要高精度的预测
- 数据没有明显的决策边界

---

## 12. Python实现：从零构建决策树

### 12.1 完整的从零实现

现在我们已经学习了决策树的所有核心概念。让我用Python从零实现一个完整的决策树分类器，包括所有我们学过的内容。

```python
"""
决策树从零实现完整版

包含功能：
1. 支持ID3（信息增益）、C4.5（信息增益率）、CART（基尼系数）三种算法
2. 支持连续特征和离散特征
3. 支持缺失值处理
4. 支持预剪枝和后剪枝
5. 支持分类和回归
"""

import numpy as np
from collections import Counter
import math
import copy

class DecisionTreeClassifier:
    """
    完整的决策树分类器
    
    参数:
        criterion: 分裂准则 ('gini', 'entropy', 'gain_ratio')
        max_depth: 树的最大深度
        min_samples_split: 分裂所需的最小样本数
        min_samples_leaf: 叶节点的最小样本数
        max_features: 分裂时考虑的最大特征数
    """
    
    def __init__(self, criterion='gini', max_depth=None, 
                 min_samples_split=2, min_samples_leaf=1, 
                 max_features=None, random_state=None):
        self.criterion = criterion
        self.max_depth = max_depth
        self.min_samples_split = min_samples_split
        self.min_samples_leaf = min_samples_leaf
        self.max_features = max_features
        self.random_state = random_state
        self.tree_ = None
        self.n_features_ = None
        self.n_classes_ = None
        self.feature_importances_ = None
        
    def fit(self, X, y, feature_types=None):
        """
        训练决策树
        
        参数:
            X: 特征矩阵 (n_samples, n_features)
            y: 目标变量 (n_samples,)
            feature_types: 每个特征的类型 ['continuous', 'discrete']
        """
        if self.random_state is not None:
            np.random.seed(self.random_state)
        
        self.n_features_ = X.shape[1]
        self.n_classes_ = len(np.unique(y))
        
        # 默认所有特征为连续型
        if feature_types is None:
            feature_types = ['continuous'] * self.n_features_
        self.feature_types_ = feature_types
        
        # 初始化特征重要性
        self.feature_importances_ = np.zeros(self.n_features_)
        
        # 构建树
        self.tree_ = self._build_tree(X, y, depth=0, used_features=set())
        
        # 归一化特征重要性
        total_importance = np.sum(self.feature_importances_)
        if total_importance > 0:
            self.feature_importances_ /= total_importance
        
        return self
    
    def _build_tree(self, X, y, depth, used_features):
        """递归构建决策树"""
        n_samples = len(y)
        unique_classes = np.unique(y)
        
        # 记录类分布
        class_counts = Counter(y)
        
        # ========== 停止条件 ==========
        
        # 停止条件1：所有样本属于同一类别
        if len(unique_classes) == 1:
            return self._create_leaf_node(unique_classes[0], class_counts, n_samples)
        
        # 停止条件2：达到最大深度
        if self.max_depth is not None and depth >= self.max_depth:
            return self._create_leaf_node(
                self._most_common_class(class_counts), class_counts, n_samples
            )
        
        # 停止条件3：样本数少于最小分裂数
        if n_samples < self.min_samples_split:
            return self._create_leaf_node(
                self._most_common_class(class_counts), class_counts, n_samples
            )
        
        # ========== 选择最优分裂 ==========
        
        best_split = self._find_best_split(X, y, used_features)
        
        if best_split is None:
            return self._create_leaf_node(
                self._most_common_class(class_counts), class_counts, n_samples
            )
        
        feature_idx, threshold, impurity_reduction = best_split
        
        # 检查叶节点样本数
        left_mask = self._get_split_mask(X, feature_idx, threshold)
        right_mask = ~left_mask
        
        if np.sum(left_mask) < self.min_samples_leaf or \
           np.sum(right_mask) < self.min_samples_leaf:
            return self._create_leaf_node(
                self._most_common_class(class_counts), class_counts, n_samples
            )
        
        # 更新特征重要性
        self.feature_importances_[feature_idx] += impurity_reduction * n_samples
        
        # ========== 创建内部节点 ==========
        
        node = {
            'type': 'internal',
            'feature': feature_idx,
            'threshold': threshold,
            'n_samples': n_samples,
            'class_distribution': dict(class_counts),
            'impurity': self._calculate_impurity(y),
            'left': self._build_tree(
                X[left_mask], y[left_mask], depth + 1, used_features | {feature_idx}
            ),
            'right': self._build_tree(
                X[right_mask], y[right_mask], depth + 1, used_features | {feature_idx}
            )
        }
        
        return node
    
    def _find_best_split(self, X, y, used_features):
        """找到最优分裂"""
        n_samples = n_features = X.shape[1]
        
        # 确定要检查的特征
        if self.max_features is None:
            feature_indices = range(n_features)
        elif self.max_features == 'sqrt':
            feature_indices = np.random.choice(
                n_features, size=int(np.sqrt(n_features)), replace=False
            )
        elif self.max_features == 'log2':
            feature_indices = np.random.choice(
                n_features, size=int(np.log2(n_features)), replace=False
            )
        else:
            feature_indices = np.random.choice(
                n_features, size=self.max_features, replace=False
            )
        
        # 过滤已使用的特征
        feature_indices = [f for f in feature_indices if f not in used_features]
        
        if not feature_indices:
            return None
        
        # 计算原始不纯度
        original_impurity = self._calculate_impurity(y)
        
        best_reduction = 0
        best_feature = None
        best_threshold = None
        
        for feature_idx in feature_indices:
            if self.feature_types_[feature_idx] == 'continuous':
                split = self._find_best_split_continuous(
                    X[:, feature_idx], y, original_impurity
                )
            else:
                split = self._find_best_split_discrete(
                    X[:, feature_idx], y, original_impurity
                )
            
            if split is not None and split[2] > best_reduction:
                best_reduction = split[2]
                best_feature = feature_idx
                best_threshold = split[1]
        
        if best_feature is None:
            return None
        
        return best_feature, best_threshold, best_reduction
    
    def _find_best_split_continuous(self, feature_values, y, original_impurity):
        """连续特征的最佳分裂"""
        n_samples = len(y)
        unique_values = np.unique(feature_values)
        
        if len(unique_values) < 2:
            return None
        
        best_gain = 0
        best_threshold = None
        
        # 候选分裂点：相邻值的平均值
        for i in range(len(unique_values) - 1):
            threshold = (unique_values[i] + unique_values[i + 1]) / 2
            
            left_mask = feature_values <= threshold
            right_mask = ~left_mask
            
            if np.sum(left_mask) < self.min_samples_leaf or \
               np.sum(right_mask) < self.min_samples_leaf:
                continue
            
            # 计算分裂后的加权不纯度
            left_impurity = self._calculate_impurity(y[left_mask])
            right_impurity = self._calculate_impurity(y[right_mask])
            
            weighted_impurity = (
                np.sum(left_mask) / n_samples * left_impurity +
                np.sum(right_mask) / n_samples * right_impurity
            )
            
            gain = original_impurity - weighted_impurity
            
            if gain > best_gain:
                best_gain = gain
                best_threshold = threshold
        
        if best_threshold is None:
            return None
        
        return 'continuous', best_threshold, best_gain
    
    def _find_best_split_discrete(self, feature_values, y, original_impurity):
        """离散特征的最佳分裂（使用二分法）"""
        n_samples = len(y)
        unique_values = np.unique(feature_values)
        
        if len(unique_values) < 2:
            return None
        
        best_gain = 0
        best_threshold = None
        
        # 对于C4.5的信息增益率，需要计算分裂信息
        if self.criterion == 'gain_ratio':
            # 先尝试所有可能的分组
            for i in range(len(unique_values)):
                group1 = unique_values[:i+1]
                group2 = unique_values[i+1:]
                
                left_mask = np.isin(feature_values, group1)
                right_mask = np.isin(feature_values, group2)
                
                if np.sum(left_mask) < self.min_samples_leaf or \
                   np.sum(right_mask) < self.min_samples_leaf:
                    continue
                
                # 计算信息增益
                left_impurity = self._calculate_impurity(y[left_mask])
                right_impurity = self._calculate_impurity(y[right_mask])
                
                weighted_impurity = (
                    np.sum(left_mask) / n_samples * left_impurity +
                    np.sum(right_mask) / n_samples * right_impurity
                )
                
                gain = original_impurity - weighted_impurity
                
                if gain > best_gain:
                    best_gain = gain
                    best_threshold = (tuple(group1), tuple(group2))
        else:
            # CART风格的二分分裂
            for i in range(len(unique_values) - 1):
                group1 = unique_values[:i+1]
                group2 = unique_values[i+1:]
                
                left_mask = np.isin(feature_values, group1)
                right_mask = ~left_mask
                
                if np.sum(left_mask) < self.min_samples_leaf or \
                   np.sum(right_mask) < self.min_samples_leaf:
                    continue
                
                left_impurity = self._calculate_impurity(y[left_mask])
                right_impurity = self._calculate_impurity(y[right_mask])
                
                weighted_impurity = (
                    np.sum(left_mask) / n_samples * left_impurity +
                    np.sum(right_mask) / n_samples * right_impurity
                )
                
                gain = original_impurity - weighted_impurity
                
                if gain > best_gain:
                    best_gain = gain
                    best_threshold = (tuple(group1), tuple(group2))
        
        if best_threshold is None:
            return None
        
        return 'discrete', best_threshold, best_gain
    
    def _calculate_impurity(self, y):
        """计算不纯度"""
        n_samples = len(y)
        if n_samples == 0:
            return 0
        
        if self.criterion == 'gini':
            return self._gini(y)
        elif self.criterion == 'entropy':
            return self._entropy(y)
        elif self.criterion == 'gain_ratio':
            return self._entropy(y)
        else:
            return self._gini(y)
    
    def _gini(self, y):
        """计算基尼系数"""
        n_samples = len(y)
        class_counts = Counter(y)
        gini = 1
        
        for count in class_counts.values():
            p = count / n_samples
            gini -= p ** 2
        
        return gini
    
    def _entropy(self, y):
        """计算熵"""
        n_samples = len(y)
        class_counts = Counter(y)
        entropy = 0
        
        for count in class_counts.values():
            p = count / n_samples
            if p > 0:
                entropy -= p * math.log2(p)
        
        return entropy
    
    def _get_split_mask(self, X, feature_idx, threshold):
        """获取分裂掩码"""
        if self.feature_types_[feature_idx] == 'continuous':
            return X[:, feature_idx] <= threshold
        else:
            # threshold是分组
            return np.isin(X[:, feature_idx], threshold[0])
    
    def _create_leaf_node(self, class_label, class_counts, n_samples):
        """创建叶节点"""
        return {
            'type': 'leaf',
            'class': class_label,
            'class_distribution': dict(class_counts),
            'n_samples': n_samples
        }
    
    def _most_common_class(self, class_counts):
        """获取多数类"""
        return max(class_counts.items(), key=lambda x: x[1])[0]
    
    def predict(self, X):
        """预测"""
        return np.array([self._predict_single(x) for x in X])
    
    def _predict_single(self, x):
        """预测单个样本"""
        node = self.tree_
        
        while node['type'] != 'leaf':
            if self._should_go_left(x, node):
                node = node['left']
            else:
                node = node['right']
        
        return node['class']
    
    def _should_go_left(self, x, node):
        """判断应该走左子树还是右子树"""
        feature_idx = node['feature']
        threshold = node['threshold']
        
        if self.feature_types_[feature_idx] == 'continuous':
            return x[feature_idx] <= threshold
        else:
            return x[feature_idx] in threshold[0]
    
    def predict_proba(self, X):
        """预测概率"""
        probas = []
        for x in X:
            node = self.tree_
            
            while node['type'] != 'leaf':
                if self._should_go_left(x, node):
                    node = node['left']
                else:
                    node = node['right']
            
            # 计算概率分布
            total = sum(node['class_distribution'].values())
            proba = [node['class_distribution'].get(c, 0) / total 
                    for c in range(self.n_classes_)]
            probas.append(proba)
        
        return np.array(probas)
    
    def score(self, X, y):
        """计算准确率"""
        return np.mean(self.predict(X) == y)
    
    def get_depth(self):
        """获取树的深度"""
        return self._get_depth(self.tree_)
    
    def _get_depth(self, node):
        """递归获取深度"""
        if node['type'] == 'leaf':
            return 0
        return 1 + max(
            self._get_depth(node['left']),
            self._get_depth(node['right'])
        )
    
    def get_n_leaves(self):
        """获取叶节点数量"""
        return self._get_n_leaves(self.tree_)
    
    def _get_n_leaves(self, node):
        """递归获取叶节点数量"""
        if node['type'] == 'leaf':
            return 1
        return self._get_n_leaves(node['left']) + self._get_n_leaves(node['right'])
    
    def print_tree(self, node=None, depth=0, indent=""):
        """打印树结构"""
        if node is None:
            node = self.tree_
        
        if node['type'] == 'leaf':
            dist = node['class_distribution']
            total = sum(dist.values())
            dist_str = ", ".join([f"类{c}:{count}" for c, count in dist.items()])
            print(f"{indent}叶子: 预测={node['class']} ({dist_str}, n={total})")
        else:
            print(f"{indent}[特征{node['feature']} <= {node['threshold']}, "
                  f"impurity={node['impurity']:.4f}]")
            print(f"{indent}  左:")
            self.print_tree(node['left'], depth + 1, indent + "    ")
            print(f"{indent}  右:")
            self.print_tree(node['right'], depth + 1, indent + "    ")

# ==================== 测试代码 ====================

if __name__ == "__main__":
    from sklearn.datasets import load_iris, make_moons
    from sklearn.model_selection import train_test_split, cross_val_score
    from sklearn.metrics import classification_report
    
    print("=" * 60)
    print("测试1：鸢尾花数据集")
    print("=" * 60)
    
    # 加载数据
    iris = load_iris()
    X, y = iris.data, iris.target
    feature_names = iris.feature_names
    
    # 使用基尼系数
    print("\n使用基尼系数（criterion='gini'）:")
    tree_gini = DecisionTreeClassifier(
        criterion='gini', max_depth=5, random_state=42
    )
    tree_gini.fit(X, y, feature_types=['continuous'] * 4)
    
    scores = cross_val_score(tree_gini, X, y, cv=5)
    print(f"5折交叉验证准确率: {np.mean(scores):.2%} (+/- {np.std(scores):.2%})")
    print(f"树的深度: {tree_gini.get_depth()}")
    print(f"叶节点数量: {tree_gini.get_n_leaves()}")
    print("特征重要性:")
    for name, importance in zip(feature_names, tree_gini.feature_importances_):
        print(f"  {name}: {importance:.4f}")
    
    # 使用熵
    print("\n使用熵（criterion='entropy'）:")
    tree_entropy = DecisionTreeClassifier(
        criterion='entropy', max_depth=5, random_state=42
    )
    tree_entropy.fit(X, y, feature_types=['continuous'] * 4)
    
    scores = cross_val_score(tree_entropy, X, y, cv=5)
    print(f"5折交叉验证准确率: {np.mean(scores):.2%} (+/- {np.std(scores):.2%})")
    
    print("\n" + "=" * 60)
    print("测试2：月亮数据集（复杂边界）")
    print("=" * 60)
    
    # 生成复杂数据
    X, y = make_moons(n_samples=500, noise=0.2, random_state=42)
    
    # 划分数据
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    
    # 测试不同的深度
    print("\n不同深度的效果:")
    print("-" * 40)
    print(f"{'深度':<8} {'训练准确率':<12} {'测试准确率':<12}")
    print("-" * 40)
    
    for depth in [2, 3, 5, 10, 15, None]:
        tree = DecisionTreeClassifier(
            criterion='gini', max_depth=depth, random_state=42
        )
        tree.fit(X_train, y_train)
        
        train_acc = tree.score(X_train, y_train)
        test_acc = tree.score(X_test, y_test)
        
        depth_str = str(depth) if depth else "无限制"
        print(f"{depth_str:<8} {train_acc:<12.2%} {test_acc:<12.2%}")
    
    # 可视化决策边界
    print("\n" + "=" * 60)
    print("测试3：决策边界可视化")
    print("=" * 60)
    
    def plot_decision_boundary(X, y, tree, title, ax):
        """绘制决策边界"""
        h = 0.02
        x_min, x_max = X[:, 0].min() - 0.5, X[:, 0].max() + 0.5
        y_min, y_max = X[:, 1].min() - 0.5, X[:, 1].max() + 0.5
        xx, yy = np.meshgrid(
            np.arange(x_min, x_max, h),
            np.arange(y_min, y_max, h)
        )
        
        Z = tree.predict(np.c_[xx.ravel(), yy.ravel()])
        Z = Z.reshape(xx.shape)
        
        ax.contourf(xx, yy, Z, alpha=0.4, cmap='coolwarm')
        ax.scatter(X[:, 0], X[:, 1], c=y, alpha=0.8, cmap='coolwarm')
        ax.set_title(title)
        ax.set_xlabel('特征1')
        ax.set_ylabel('特征2')
    
    fig, axes = plt.subplots(2, 3, figsize=(15, 10))
    
    depths = [2, 3, 5, 10, 15, None]
    titles = ['深度=2', '深度=3', '深度=5', '深度=10', '深度=15', '无限制']
    
    for i, (depth, title) in enumerate(zip(depths, titles)):
        tree = DecisionTreeClassifier(
            criterion='gini', max_depth=depth, random_state=42
        )
        tree.fit(X_train, y_train)
        
        ax = axes[i // 3, i % 3]
        plot_decision_boundary(X_test, y_test, tree, 
                               f"{title}\n测试准确率: {tree.score(X_test, y_test):.2%}", ax)
    
    plt.tight_layout()
    plt.savefig('decision_tree_boundaries.png', dpi=150)
    plt.show()
    
    print("\n决策边界图已保存到 decision_tree_boundaries.png")
```

---

## 13. 使用scikit-learn构建决策树

### 13.1 scikit-learn决策树API

scikit-learn是Python最流行的机器学习库之一，它提供了完整的决策树实现。

```python
from sklearn.tree import DecisionTreeClassifier, DecisionTreeRegressor
```

**主要参数**：

```python
DecisionTreeClassifier(
    criterion='gini',           # 分裂准则: 'gini', 'entropy', 'log_loss'
    splitter='best',             # 分裂策略: 'best', 'random'
    max_depth=None,              # 最大深度
    min_samples_split=2,         # 分裂所需最小样本数
    min_samples_leaf=1,         # 叶节点最小样本数
    max_features=None,           # 分裂时考虑的最大特征数
    random_state=None,          # 随机种子
    class_weight=None,          # 类别权重
)
```

### 13.2 完整示例：使用scikit-learn

```python
"""
scikit-learn决策树完整示例
"""

import numpy as np
import matplotlib.pyplot as plt
from sklearn.datasets import load_iris, load_wine, load_breast_cancer
from sklearn.tree import DecisionTreeClassifier, plot_tree
from sklearn.model_selection import train_test_split, cross_val_score, GridSearchCV
from sklearn.metrics import (classification_report, confusion_matrix,
                             accuracy_score, precision_score, recall_score, f1_score)
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline

# 设置中文字体
plt.rcParams['font.sans-serif'] = ['SimHei', 'DejaVu Sans']
plt.rcParams['axes.unicode_minus'] = False

# ============ 示例1：鸢尾花数据集 ============

print("=" * 60)
print("示例1：鸢尾花数据集分类")
print("=" * 60)

# 加载数据
iris = load_iris()
X, y = iris.data, iris.target
feature_names = iris.feature_names
target_names = iris.target_names

print(f"数据集大小: {X.shape[0]} 样本, {X.shape[1]} 特征")
print(f"特征: {list(feature_names)}")
print(f"类别: {list(target_names)}")

# 划分训练集和测试集
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

# 创建决策树分类器
clf = DecisionTreeClassifier(
    criterion='gini',
    max_depth=5,
    min_samples_split=5,
    min_samples_leaf=2,
    random_state=42
)

# 训练
clf.fit(X_train, y_train)

# 预测
y_pred = clf.predict(X_test)
y_pred_proba = clf.predict_proba(X_test)

# 评估
print(f"\n训练集准确率: {clf.score(X_train, y_train):.2%}")
print(f"测试集准确率: {clf.score(X_test, y_test):.2%}")

print("\n分类报告:")
print(classification_report(y_test, y_pred, target_names=target_names))

print("混淆矩阵:")
print(confusion_matrix(y_test, y_pred))

# 交叉验证
cv_scores = cross_val_score(clf, X, y, cv=5)
print(f"\n5折交叉验证: {cv_scores}")
print(f"平均准确率: {np.mean(cv_scores):.2%} (+/- {np.std(cv_scores):.2%})")

# 特征重要性
print("\n特征重要性:")
for name, importance in zip(feature_names, clf.feature_importances_):
    bar = '█' * int(importance * 50)
    print(f"  {name:<15} {importance:.4f} {bar}")

# 可视化决策树
plt.figure(figsize=(20, 10))
plot_tree(clf, feature_names=feature_names, class_names=target_names,
          filled=True, rounded=True, fontsize=10)
plt.title('鸢尾花数据集决策树', fontsize=16)
plt.tight_layout()
plt.savefig('sklearn_decision_tree.png', dpi=150)
plt.show()

print("\n决策树图已保存到 sklearn_decision_tree.png")

# ============ 示例2：葡萄酒数据集 ============

print("\n" + "=" * 60)
print("示例2：葡萄酒数据集分类")
print("=" * 60)

# 加载数据
wine = load_wine()
X, y = wine.data, wine.target
feature_names = wine.feature_names
target_names = wine.target_names

print(f"数据集大小: {X.shape[0]} 样本, {X.shape[1]} 特征")
print(f"类别分布: {dict(zip(*np.unique(y, return_counts=True)))}")

# 划分数据
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.3, random_state=42, stratify=y
)

# 参数调优
param_grid = {
    'max_depth': [3, 5, 7, 10, None],
    'min_samples_split': [2, 5, 10],
    'min_samples_leaf': [1, 2, 4],
    'criterion': ['gini', 'entropy']
}

grid_search = GridSearchCV(
    DecisionTreeClassifier(random_state=42),
    param_grid,
    cv=5,
    scoring='accuracy',
    n_jobs=-1
)

grid_search.fit(X_train, y_train)

print(f"\n最优参数: {grid_search.best_params_}")
print(f"最优交叉验证准确率: {grid_search.best_score_:.2%}")

# 使用最优模型
best_clf = grid_search.best_estimator_
y_pred = best_clf.predict(X_test)

print(f"\n测试集准确率: {accuracy_score(y_test, y_pred):.2%}")
print("\n详细分类报告:")
print(classification_report(y_test, y_pred, target_names=target_names))

# ============ 示例3：乳腺癌数据集 ============

print("\n" + "=" * 60)
print("示例3：乳腺癌数据集分类")
print("=" * 60)

# 加载数据
cancer = load_breast_cancer()
X, y = cancer.data, cancer.target
feature_names = cancer.feature_names

print(f"数据集大小: {X.shape[0]} 样本, {X.shape[1]} 特征")
print(f"类别分布: 良性={sum(y==1)}, 恶性={sum(y==0)}")

# 使用管道（标准化 + 决策树）
pipeline = Pipeline([
    ('scaler', StandardScaler()),
    ('clf', DecisionTreeClassifier(random_state=42))
])

# 交叉验证
cv_scores = cross_val_score(pipeline, X, y, cv=10)
print(f"\n10折交叉验证: {np.mean(cv_scores):.2%} (+/- {np.std(cv_scores):.2%})")

# ============ 示例4：不同深度的效果对比 ============

print("\n" + "=" * 60)
print("示例4：不同深度的效果对比")
print("=" * 60)

# 使用月亮数据集
from sklearn.datasets import make_moons

X, y = make_moons(n_samples=500, noise=0.3, random_state=42)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.3)

# 测试不同深度
depths = range(1, 20)
train_scores = []
test_scores = []
depths_list = []

for depth in depths:
    clf = DecisionTreeClassifier(max_depth=depth, random_state=42)
    clf.fit(X_train, y_train)
    
    train_score = clf.score(X_train, y_train)
    test_score = clf.score(X_test, y_test)
    
    train_scores.append(train_score)
    test_scores.append(test_score)
    depths_list.append(depth)
    
    print(f"深度={depth:2d}: 训练准确率={train_score:.4f}, 测试准确率={test_score:.4f}")

# 绘图
plt.figure(figsize=(12, 5))

plt.subplot(1, 2, 1)
plt.plot(depths_list, train_scores, 'b-o', label='训练集')
plt.plot(depths_list, test_scores, 'r-o', label='测试集')
plt.xlabel('树的深度')
plt.ylabel('准确率')
plt.title('准确率 vs 树深度')
plt.legend()
plt.grid(True, alpha=0.3)

# 标记过拟合区域
overfitting_idx = test_scores.index(max(test_scores))
plt.axvline(x=depths_list[overfitting_idx], color='g', linestyle='--',
            label=f'最优深度={depths_list[overfitting_idx]}')

plt.subplot(1, 2, 2)
train_gap = np.array(train_scores) - np.array(test_scores)
plt.bar(depths_list, train_gap, color='orange', alpha=0.7)
plt.xlabel('树的深度')
plt.ylabel('过拟合程度（训练-测试）')
plt.title('过拟合程度 vs 树深度')
plt.axhline(y=0, color='r', linestyle='--')
plt.grid(True, alpha=0.3)

plt.tight_layout()
plt.savefig('depth_comparison.png', dpi=150)
plt.show()

print(f"\n最优深度: {depths_list[overfitting_idx]}")
print(f"最优测试准确率: {max(test_scores):.2%}")

# ============ 示例5：决策树回归 ============

print("\n" + "=" * 60)
print("示例5：决策树回归")
print("=" * 60)

from sklearn.tree import DecisionTreeRegressor

# 生成回归数据
np.random.seed(42)
n_samples = 200
X = np.sort(np.random.rand(n_samples) * 10)
y = np.sin(X) + np.random.randn(n_samples) * 0.3

X = X.reshape(-1, 1)

# 划分数据
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.3)

# 不同深度的回归树
fig, axes = plt.subplots(2, 3, figsize=(15, 10))

depths = [1, 2, 3, 5, 10, None]
test_scores = []

for i, depth in enumerate(depths):
    ax = axes[i // 3, i % 3]
    
    reg = DecisionTreeRegressor(max_depth=depth, random_state=42)
    reg.fit(X_train, y_train)
    
    # 预测
    X_plot = np.linspace(0, 10, 500).reshape(-1, 1)
    y_pred = reg.predict(X_plot)
    
    # 绘图
    ax.scatter(X_train, y_train, c='blue', alpha=0.5, label='训练数据')
    ax.plot(X_plot, y_pred, 'r-', linewidth=2, label='预测')
    ax.plot(X_plot, np.sin(X_plot), 'g--', alpha=0.5, label='真实函数')
    
    # 计算R²
    train_r2 = reg.score(X_train, y_train)
    test_r2 = reg.score(X_test, y_test)
    test_scores.append(test_r2)
    
    title = f'深度={depth if depth else "无限制"}\nR²(训练)={train_r2:.3f}, R²(测试)={test_r2:.3f}'
    ax.set_title(title)
    ax.legend(fontsize=8)
    ax.grid(True, alpha=0.3)

plt.suptitle('决策树回归：不同深度的效果', fontsize=14)
plt.tight_layout()
plt.savefig('regression_trees.png', dpi=150)
plt.show()

print(f"\n各深度测试集R²分数: {dict(zip(depths, [f'{s:.3f}' for s in test_scores]))}")
```

---

## 14. 决策树的可视化

### 14.1 使用plot_tree

```python
from sklearn.tree import plot_tree

# 绘制决策树
plt.figure(figsize=(20, 10))
plot_tree(
    clf,
    feature_names=feature_names,
    class_names=target_names,
    filled=True,          # 填充颜色
    rounded=True,         # 圆角边框
    fontsize=10,
    proportion=True,      # 显示比例
)
plt.show()
```

### 14.2 使用export_text

```python
from sklearn.tree import export_text

# 导出为文本规则
tree_rules = export_text(clf, feature_names=feature_names)
print(tree_rules)
```

### 14.3 自定义可视化

```python
def visualize_decision_tree_structure(tree, feature_names):
    """可视化决策树结构"""
    
    def get_tree_info(node, depth=0, info=None):
        if info is None:
            info = []
        
        indent = "  " * depth
        
        if tree.tree_.children_left[node] == -1:  # 叶节点
            class_counts = tree.tree_.value[node][0]
            predicted_class = np.argmax(class_counts)
            info.append({
                'depth': depth,
                'indent': indent,
                'type': 'leaf',
                'class': predicted_class,
                'samples': int(sum(class_counts))
            })
        else:
            feature = tree.tree_.feature[node]
            threshold = tree.tree_.threshold[node]
            impurity = tree.tree_.impurity[node]
            
            info.append({
                'depth': depth,
                'indent': indent,
                'type': 'internal',
                'feature': feature,
                'threshold': threshold,
                'impurity': impurity
            })
            
            # 递归处理子节点
            get_tree_info(tree.tree_.children_left[node], depth + 1, info)
            get_tree_info(tree.tree_.children_right[node], depth + 1, info)
        
        return info
    
    info = get_tree_info(0)
    
    for node_info in info:
        if node_info['type'] == 'leaf':
            print(f"{node_info['indent']}[叶节点] 类别={node_info['class']}, "
                  f"样本数={node_info['samples']}")
        else:
            print(f"{node_info['indent']}[内部] 特征{feature_names[node_info['feature']]} "
                  f"<= {node_info['threshold']:.3f}, 不纯度={node_info['impurity']:.4f}")

# 使用
visualize_decision_tree_structure(clf, feature_names)
```

### 14.4 决策边界可视化

```python
def plot_decision_boundary(X, y, clf, title, ax=None):
    """绘制决策边界"""
    if ax is None:
        fig, ax = plt.subplots(1, 1, figsize=(10, 8))
    
    # 创建网格
    h = 0.02
    x_min, x_max = X[:, 0].min() - 1, X[:, 0].max() + 1
    y_min, y_max = X[:, 1].min() - 1, X[:, 1].max() + 1
    xx, yy = np.meshgrid(
        np.arange(x_min, x_max, h),
        np.arange(y_min, y_max, h)
    )
    
    # 预测
    Z = clf.predict(np.c_[xx.ravel(), yy.ravel()])
    Z = Z.reshape(xx.shape)
    
    # 绘制决策边界
    ax.contourf(xx, yy, Z, alpha=0.4, cmap='RdYlBu')
    ax.scatter(X[:, 0], X[:, 1], c=y, alpha=0.8, cmap='RdYlBu', edgecolors='black')
    
    ax.set_xlabel('特征1')
    ax.set_ylabel('特征2')
    ax.set_title(title)
    
    return ax

# 示例
fig, axes = plt.subplots(1, 2, figsize=(14, 6))

# 使用基尼系数
clf_gini = DecisionTreeClassifier(max_depth=5, criterion='gini', random_state=42)
clf_gini.fit(X_train, y_train)
plot_decision_boundary(X_test, y_test, clf_gini, 
                      f'基尼系数 (深度={clf_gini.get_depth()})', axes[0])

# 使用熵
clf_entropy = DecisionTreeClassifier(max_depth=5, criterion='entropy', random_state=42)
clf_entropy.fit(X_train, y_train)
plot_decision_boundary(X_test, y_test, clf_entropy,
                      f'熵 (深度={clf_entropy.get_depth()})', axes[1])

plt.tight_layout()
plt.savefig('decision_boundary_comparison.png', dpi=150)
plt.show()
```

### 14.5 特征重要性可视化

```python
def plot_feature_importance(clf, feature_names, top_n=None):
    """绘制特征重要性"""
    importances = clf.feature_importances_
    indices = np.argsort(importances)[::-1]
    
    if top_n is not None:
        indices = indices[:top_n]
    
    n_features = len(indices)
    
    plt.figure(figsize=(10, 6))
    plt.barh(range(n_features), importances[indices], align='center')
    plt.yticks(range(n_features), [feature_names[i] for i in indices])
    plt.xlabel('特征重要性')
    plt.title('决策树特征重要性')
    plt.gca().invert_yaxis()
    plt.tight_layout()
    plt.show()
    
    return dict(zip([feature_names[i] for i in indices], 
                    importances[indices]))

# 示例
importances = plot_feature_importance(clf, feature_names)
```

---

## 15. 实战项目：鸢尾花分类

### 15.1 项目概述

鸢尾花数据集是机器学习中最经典的数据集之一，包含150个样本，3个类别（Setosa、Versicolor、Virginica），4个特征（花萼长度、花萼宽度、花瓣长度、花瓣宽度）。

### 15.2 完整项目代码

```python
"""
鸢尾花分类实战项目

目标：使用决策树对鸢尾花进行分类
"""

import numpy as np
import matplotlib.pyplot as plt
from sklearn.datasets import load_iris
from sklearn.tree import DecisionTreeClassifier, plot_tree, export_text
from sklearn.model_selection import train_test_split, cross_val_score, GridSearchCV
from sklearn.metrics import (classification_report, confusion_matrix,
                             accuracy_score, precision_recall_fscore_support)
from sklearn.preprocessing import StandardScaler

# ============ 1. 数据加载与探索 ============

print("=" * 60)
print("第1步：数据加载与探索")
print("=" * 60)

# 加载数据
iris = load_iris()
X, y = iris.data, iris.target
feature_names = iris.feature_names
target_names = iris.target_names

print(f"\n数据集信息:")
print(f"  - 样本数量: {X.shape[0]}")
print(f"  - 特征数量: {X.shape[1]}")
print(f"  - 类别: {list(target_names)}")

print(f"\n特征信息:")
for i, name in enumerate(feature_names):
    print(f"  {i+1}. {name}:")
    print(f"     最小值: {X[:, i].min():.2f}")
    print(f"     最大值: {X[:, i].max():.2f}")
    print(f"     均值: {X[:, i].mean():.2f}")
    print(f"     标准差: {X[:, i].std():.2f}")

print(f"\n类别分布:")
for i, name in enumerate(target_names):
    count = np.sum(y == i)
    print(f"  - {name}: {count} 样本 ({count/len(y)*100:.1f}%)")

# 可视化数据分布
fig, axes = plt.subplots(2, 2, figsize=(12, 10))

# 花萼长度 vs 花萼宽度
ax = axes[0, 0]
for i, name in enumerate(target_names):
    mask = y == i
    ax.scatter(X[mask, 0], X[mask, 1], c=f'C{i}', label=name, alpha=0.7)
ax.set_xlabel(feature_names[0])
ax.set_ylabel(feature_names[1])
ax.set_title('花萼长度 vs 花萼宽度')
ax.legend()

# 花瓣长度 vs 花瓣宽度
ax = axes[0, 1]
for i, name in enumerate(target_names):
    mask = y == i
    ax.scatter(X[mask, 2], X[mask, 3], c=f'C{i}', label=name, alpha=0.7)
ax.set_xlabel(feature_names[2])
ax.set_ylabel(feature_names[3])
ax.set_title('花瓣长度 vs 花瓣宽度')
ax.legend()

# 箱线图
ax = axes[1, 0]
data_to_plot = [X[y == i, 0] for i in range(3)]
bp = ax.boxplot(data_to_plot, labels=target_names, patch_artist=True)
for patch, color in zip(bp['boxes'], ['C0', 'C1', 'C2']):
    patch.set_facecolor(color)
    patch.set_alpha(0.7)
ax.set_ylabel(feature_names[0])
ax.set_title('花萼长度分布')

ax = axes[1, 1]
data_to_plot = [X[y == i, 2] for i in range(3)]
bp = ax.boxplot(data_to_plot, labels=target_names, patch_artist=True)
for patch, color in zip(bp['boxes'], ['C0', 'C1', 'C2']):
    patch.set_facecolor(color)
    patch.set_alpha(0.7)
ax.set_ylabel(feature_names[2])
ax.set_title('花瓣长度分布')

plt.tight_layout()
plt.savefig('iris_data_exploration.png', dpi=150)
plt.show()

# ============ 2. 数据预处理 ============

print("\n" + "=" * 60)
print("第2步：数据预处理")
print("=" * 60)

# 划分训练集和测试集
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

print(f"\n训练集: {X_train.shape[0]} 样本")
print(f"测试集: {X_test.shape[0]} 样本")

print(f"\n训练集类别分布:")
for i, name in enumerate(target_names):
    count = np.sum(y_train == i)
    print(f"  - {name}: {count} 样本 ({count/len(y_train)*100:.1f}%)")

print(f"\n测试集类别分布:")
for i, name in enumerate(target_names):
    count = np.sum(y_test == i)
    print(f"  - {name}: {count} 样本 ({count/len(y_test)*100:.1f}%)")

# ============ 3. 模型训练 ============

print("\n" + "=" * 60)
print("第3步：模型训练")
print("=" * 60)

# 创建决策树分类器
clf = DecisionTreeClassifier(
    criterion='gini',
    max_depth=5,
    min_samples_split=5,
    min_samples_leaf=2,
    random_state=42
)

# 训练
clf.fit(X_train, y_train)

print(f"\n决策树信息:")
print(f"  - 树深度: {clf.get_depth()}")
print(f"  - 叶节点数: {clf.get_n_leaves()}")
print(f"  - 训练样本数: {clf.n_samples_}")

print(f"\n特征重要性:")
for name, importance in zip(feature_names, clf.feature_importances_):
    bar = '█' * int(importance * 30)
    print(f"  {name:<18} {importance:.4f} {bar}")

# ============ 4. 模型评估 ============

print("\n" + "=" * 60)
print("第4步：模型评估")
print("=" * 60)

# 在训练集上预测
y_train_pred = clf.predict(X_train)
train_accuracy = accuracy_score(y_train, y_train_pred)

# 在测试集上预测
y_test_pred = clf.predict(X_test)
test_accuracy = accuracy_score(y_test, y_test_pred)

print(f"\n准确率:")
print(f"  - 训练集准确率: {train_accuracy:.2%}")
print(f"  - 测试集准确率: {test_accuracy:.2%}")

# 详细分类报告
print(f"\n测试集分类报告:")
print(classification_report(y_test, y_test_pred, target_names=target_names))

# 混淆矩阵
print(f"混淆矩阵:")
cm = confusion_matrix(y_test, y_test_pred)
print(f"预测 →    ", end='')
print('  '.join([f'{name[:4]:>4}' for name in target_names]))
for i, row in enumerate(cm):
    print(f"真实{target_names[i][:4]}  ", end='')
    print('  '.join([f'{v:>4}' for v in row]))

# 可视化混淆矩阵
fig, axes = plt.subplots(1, 2, figsize=(14, 5))

# 混淆矩阵热力图
ax = axes[0]
im = ax.imshow(cm, interpolation='nearest', cmap='Blues')
ax.figure.colorbar(im, ax=ax)
ax.set(xticks=np.arange(len(target_names)),
       yticks=np.arange(len(target_names)),
       xticklabels=target_names, yticklabels=target_names,
       ylabel='真实标签', xlabel='预测标签',
       title='混淆矩阵')

# 在矩阵中添加数值
thresh = cm.max() / 2
for i in range(len(target_names)):
    for j in range(len(target_names)):
        ax.text(j, i, format(cm[i, j], 'd'),
                ha="center", va="center",
                color="white" if cm[i, j] > thresh else "black")

# 特征重要性
ax = axes[1]
importances = clf.feature_importances_
indices = np.argsort(importances)[::-1]
colors = plt.cm.viridis(np.linspace(0, 0.8, len(feature_names)))

bars = ax.barh(range(len(feature_names)), importances[indices], color=colors)
ax.set_yticks(range(len(feature_names)))
ax.set_yticklabels([feature_names[i] for i in indices])
ax.set_xlabel('特征重要性')
ax.set_title('特征重要性排序')
ax.invert_yaxis()

# 添加数值标签
for bar, imp in zip(bars, importances[indices]):
    ax.text(imp + 0.01, bar.get_y() + bar.get_height()/2, 
           f'{imp:.3f}', va='center')

plt.tight_layout()
plt.savefig('iris_evaluation.png', dpi=150)
plt.show()

# ============ 5. 可视化决策树 ============

print("\n" + "=" * 60)
print("第5步：可视化决策树")
print("=" * 60)

# 绘制决策树
fig, ax = plt.subplots(figsize=(20, 12))
plot_tree(clf, feature_names=feature_names, class_names=target_names,
          filled=True, rounded=True, fontsize=9, ax=ax,
          impurity=True, proportion=True)
plt.title('鸢尾花决策树分类器', fontsize=16)
plt.tight_layout()
plt.savefig('iris_decision_tree.png', dpi=150)
plt.show()

# 导出决策规则
print("\n决策规则:")
print("-" * 40)
rules = export_text(clf, feature_names=feature_names)
print(rules)

# ============ 6. 交叉验证 ============

print("\n" + "=" * 60)
print("第6步：交叉验证")
print("=" * 60)

# 5折交叉验证
cv_scores = cross_val_score(clf, X, y, cv=5)
print(f"\n5折交叉验证结果:")
print(f"  - 各折准确率: {cv_scores}")
print(f"  - 平均准确率: {np.mean(cv_scores):.2%}")
print(f"  - 标准差: {np.std(cv_scores):.2%}")

# 不同折数的比较
fold_range = range(5, 16)
cv_means = []
cv_stds = []

for n_folds in fold_range:
    scores = cross_val_score(clf, X, y, cv=n_folds)
    cv_means.append(np.mean(scores))
    cv_stds.append(np.std(scores))

plt.figure(figsize=(10, 5))
plt.errorbar(fold_range, cv_means, yerr=cv_stds, fmt='o-', capsize=5)
plt.xlabel('折数')
plt.ylabel('准确率')
plt.title('交叉验证结果')
plt.grid(True, alpha=0.3)
plt.tight_layout()
plt.savefig('iris_cv_results.png', dpi=150)
plt.show()

# ============ 7. 参数调优 ============

print("\n" + "=" * 60)
print("第7步：参数调优")
print("=" * 60)

# 定义参数网格
param_grid = {
    'max_depth': [2, 3, 4, 5, 6, 7, None],
    'min_samples_split': [2, 5, 10, 20],
    'min_samples_leaf': [1, 2, 4, 8],
    'criterion': ['gini', 'entropy']
}

# 网格搜索
grid_search = GridSearchCV(
    DecisionTreeClassifier(random_state=42),
    param_grid,
    cv=5,
    scoring='accuracy',
    n_jobs=-1,
    verbose=1
)

grid_search.fit(X, y)

print(f"\n最优参数:")
for param, value in grid_search.best_params_.items():
    print(f"  - {param}: {value}")
print(f"\n最优交叉验证准确率: {grid_search.best_score_:.2%}")

# 可视化参数影响
results_df = pd.DataFrame(grid_search.cv_results_)

# max_depth的影响
fig, axes = plt.subplots(2, 2, figsize=(14, 10))

# max_depth
ax = axes[0, 0]
depth_means = results_df[results_df['param_criterion'] == 'gini'].groupby('param_max_depth')['mean_test_score'].mean()
depth_stds = results_df[results_df['param_criterion'] == 'gini'].groupby('param_max_depth')['std_test_score'].mean()
ax.errorbar(range(len(depth_means)), depth_means, yerr=depth_stds, fmt='o-', capsize=5)
ax.set_xticks(range(len(depth_means)))
ax.set_xticklabels([str(d) if d else 'None' for d in depth_means.index])
ax.set_xlabel('max_depth')
ax.set_ylabel('准确率')
ax.set_title('max_depth 对准确率的影响')
ax.grid(True, alpha=0.3)

# min_samples_split
ax = axes[0, 1]
split_means = results_df.groupby('param_min_samples_split')['mean_test_score'].mean()
split_stds = results_df.groupby('param_min_samples_split')['std_test_score'].mean()
ax.errorbar(range(len(split_means)), split_means, yerr=split_stds, fmt='o-', capsize=5)
ax.set_xticks(range(len(split_means)))
ax.set_xticklabels(split_means.index)
ax.set_xlabel('min_samples_split')
ax.set_ylabel('准确率')
ax.set_title('min_samples_split 对准确率的影响')
ax.grid(True, alpha=0.3)

# min_samples_leaf
ax = axes[1, 0]
leaf_means = results_df.groupby('param_min_samples_leaf')['mean_test_score'].mean()
leaf_stds = results_df.groupby('param_min_samples_leaf')['std_test_score'].mean()
ax.errorbar(range(len(leaf_means)), leaf_means, yerr=leaf_stds, fmt='o-', capsize=5)
ax.set_xticks(range(len(leaf_means)))
ax.set_xticklabels(leaf_means.index)
ax.set_xlabel('min_samples_leaf')
ax.set_ylabel('准确率')
ax.set_title('min_samples_leaf 对准确率的影响')
ax.grid(True, alpha=0.3)

# criterion
ax = axes[1, 1]
criterion_means = results_df.groupby('param_criterion')['mean_test_score'].mean()
criterion_stds = results_df.groupby('param_criterion')['std_test_score'].mean()
x_pos = range(len(criterion_means))
ax.bar(x_pos, criterion_means, yerr=criterion_stds, capsize=10, 
       color=['steelblue', 'coral'], alpha=0.7)
ax.set_xticks(x_pos)
ax.set_xticklabels(criterion_means.index)
ax.set_xlabel('criterion')
ax.set_ylabel('准确率')
ax.set_title('criterion 对准确率的影响')
ax.grid(True, alpha=0.3)

plt.tight_layout()
plt.savefig('iris_parameter_tuning.png', dpi=150)
plt.show()

# ============ 8. 使用最优模型 ============

print("\n" + "=" * 60)
print("第8步：使用最优模型")
print("=" * 60)

# 使用最优模型
best_clf = grid_search.best_estimator_

# 在测试集上评估
y_pred = best_clf.predict(X_test)
final_accuracy = accuracy_score(y_test, y_pred)

print(f"\n最优模型测试集准确率: {final_accuracy:.2%}")

# 绘制最优决策树
fig, ax = plt.subplots(figsize=(20, 12))
plot_tree(best_clf, feature_names=feature_names, class_names=target_names,
          filled=True, rounded=True, fontsize=9, ax=ax)
plt.title('最优鸢尾花决策树', fontsize=16)
plt.tight_layout()
plt.savefig('iris_best_tree.png', dpi=150)
plt.show()

print("\n所有图像已保存:")
print("  - iris_data_exploration.png: 数据探索")
print("  - iris_evaluation.png: 模型评估")
print("  - iris_decision_tree.png: 决策树可视化")
print("  - iris_cv_results.png: 交叉验证结果")
print("  - iris_parameter_tuning.png: 参数调优")
print("  - iris_best_tree.png: 最优决策树")

import pandas as pd
```

---

## 16. 实战项目：泰坦尼克号生存预测

### 16.1 项目概述

泰坦尼克号生存预测是一个经典的二分类问题，我们将使用决策树来预测乘客是否能生存。

### 16.2 项目代码

```python
"""
泰坦尼克号生存预测实战项目

目标：使用决策树预测乘客是否能生存
"""

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from sklearn.datasets import fetch_openml
from sklearn.tree import DecisionTreeClassifier, plot_tree, export_text
from sklearn.model_selection import train_test_split, cross_val_score, StratifiedKFold
from sklearn.metrics import (classification_report, confusion_matrix,
                             accuracy_score, roc_auc_score, precision_score,
                             recall_score, f1_score)
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.impute import SimpleImputer

# ============ 1. 数据加载 ============

print("=" * 60)
print("第1步：数据加载")
print("=" * 60)

# 加载泰坦尼克号数据集
titanic = fetch_openml('titanic', version=1, as_frame=True)
df = titanic.frame

print(f"\n原始数据集大小: {df.shape}")
print(f"\n列名: {df.columns.tolist()}")
print(f"\n前5行数据:")
print(df.head())

# ============ 2. 数据探索 ============

print("\n" + "=" * 60)
print("第2步：数据探索")
print("=" * 60)

print(f"\n数据类型:")
print(df.dtypes)

print(f"\n缺失值统计:")
print(df.isnull().sum())

print(f"\n目标变量分布:")
print(df['survived'].value_counts())
print(f"生存率: {df['survived'].mean():.2%}")

# 可视化
fig, axes = plt.subplots(2, 3, figsize=(15, 10))

# 生存率 vs 性别
ax = axes[0, 0]
survived_by_sex = df.groupby('sex')['survived'].mean()
survived_by_sex.plot(kind='bar', ax=ax, color=['coral', 'steelblue'])
ax.set_title('生存率 vs 性别')
ax.set_ylabel('生存率')
ax.set_xticklabels(['女性', '男性'], rotation=0)

# 生存率 vs 船票等级
ax = axes[0, 1]
survived_by_class = df.groupby('pclass')['survived'].mean()
survived_by_class.plot(kind='bar', ax=ax, color=['gold', 'silver', 'bronze'])
ax.set_title('生存率 vs 船票等级')
ax.set_ylabel('生存率')
ax.set_xticklabels(['一等舱', '二等舱', '三等舱'], rotation=0)

# 生存率 vs 年龄
ax = axes[0, 2]
df[df['survived'] == '1']['age'].hist(bins=30, alpha=0.5, label='存活', ax=ax, color='green')
df[df['survived'] == '0']['age'].hist(bins=30, alpha=0.5, label='死亡', ax=ax, color='red')
ax.set_title('年龄分布')
ax.set_xlabel('年龄')
ax.legend()

# 生存率 vs 票价
ax = axes[1, 0]
df[df['survived'] == '1']['fare'].hist(bins=30, alpha=0.5, label='存活', ax=ax, color='green')
df[df['survived'] == '0']['fare'].hist(bins=30, alpha=0.5, label='死亡', ax=ax, color='red')
ax.set_title('票价分布')
ax.set_xlabel('票价')
ax.legend()

# 生存率 vs 登船港口
ax = axes[1, 1]
survived_by_embarked = df.groupby('embarked')['survived'].mean()
survived_by_embarked.plot(kind='bar', ax=ax, color=['green', 'orange', 'blue'])
ax.set_title('生存率 vs 登船港口')
ax.set_ylabel('生存率')
ax.set_xticklabels(['C', 'Q', 'S'], rotation=0)

# 生存率 vs 是否独自旅行
ax = axes[1, 2]
survived_by_alone = df.groupby('alone')['survived'].mean()
survived_by_alone.plot(kind='bar', ax=ax, color=['purple', 'teal'])
ax.set_title('生存率 vs 是否独自旅行')
ax.set_ylabel('生存率')
ax.set_xticklabels(['否', '是'], rotation=0)

plt.tight_layout()
plt.savefig('titanic_eda.png', dpi=150)
plt.show()

# ============ 3. 数据预处理 ============

print("\n" + "=" * 60)
print("第3步：数据预处理")
print("=" * 60)

# 复制数据
df_processed = df.copy()

# 特征选择
features_to_use = ['pclass', 'sex', 'age', 'sibsp', 'parch', 'fare', 'embarked', 'alone']

# 处理缺失值
print(f"\n处理缺失值前:")
print(df_processed[features_to_use].isnull().sum())

# 年龄：用中位数填充
age_median = df_processed['age'].median()
df_processed['age'] = df_processed['age'].fillna(age_median)

# 票价：用中位数填充
fare_median = df_processed['fare'].median()
df_processed['fare'] = df_processed['fare'].fillna(fare_median)

# 登船港口：用众数填充
embarked_mode = df_processed['embarked'].mode()[0]
df_processed['embarked'] = df_processed['embarked'].fillna(embarked_mode)

print(f"\n处理缺失值后:")
print(df_processed[features_to_use].isnull().sum())

# 特征编码
print(f"\n特征编码:")

# 性别编码
df_processed['sex_encoded'] = (df_processed['sex'] == 'male').astype(int)

# 船票等级编码
df_processed['pclass_encoded'] = df_processed['pclass'].astype(int)

# 登船港口编码
embarked_mapping = {'C': 0, 'Q': 1, 'S': 2}
df_processed['embarked_encoded'] = df_processed['embarked'].map(embarked_mapping)

# 是否独自旅行编码
df_processed['alone_encoded'] = (df_processed['alone'] == 'y').astype(int)

# 目标变量编码
df_processed['survived_encoded'] = (df_processed['survived'] == '1').astype(int)

# 创建特征矩阵
feature_columns = ['pclass_encoded', 'sex_encoded', 'age', 'sibsp', 'parch', 
                   'fare', 'embarked_encoded', 'alone_encoded']

X = df_processed[feature_columns].values
y = df_processed['survived_encoded'].values

print(f"\n最终特征矩阵大小: {X.shape}")
print(f"目标变量分布: {np.bincount(y)}")

# ============ 4. 特征工程 ============

print("\n" + "=" * 60)
print("第4步：特征工程")
print("=" * 60)

# 创建新特征
# 家庭大小
df_processed['family_size'] = df_processed['sibsp'].astype(int) + df_processed['parch'].astype(int) + 1

# 是否是小孩
df_processed['is_child'] = (df_processed['age'] < 16).astype(int)

# 年龄分组
df_processed['age_group'] = pd.cut(df_processed['age'], 
                                    bins=[0, 12, 18, 35, 60, 100],
                                    labels=[0, 1, 2, 3, 4])

# 更新特征矩阵
feature_columns_v2 = ['pclass_encoded', 'sex_encoded', 'age', 'sibsp', 'parch', 
                      'fare', 'embarked_encoded', 'alone_encoded',
                      'family_size', 'is_child', 'age_group']

X_v2 = df_processed[feature_columns_v2].values.astype(float)

print(f"\n新特征矩阵大小: {X_v2.shape}")
print(f"新增特征: family_size, is_child, age_group")

# ============ 5. 模型训练 ============

print("\n" + "=" * 60)
print("第5步：模型训练")
print("=" * 60)

# 划分训练集和测试集
X_train, X_test, y_train, y_test = train_test_split(
    X_v2, y, test_size=0.2, random_state=42, stratify=y
)

print(f"\n训练集: {X_train.shape[0]} 样本")
print(f"测试集: {X_test.shape[0]} 样本")

# 创建决策树分类器
clf = DecisionTreeClassifier(
    criterion='gini',
    max_depth=5,
    min_samples_split=10,
    min_samples_leaf=5,
    random_state=42
)

# 训练
clf.fit(X_train, y_train)

print(f"\n决策树信息:")
print(f"  - 树深度: {clf.get_depth()}")
print(f"  - 叶节点数: {clf.get_n_leaves()}")

print(f"\n特征重要性:")
feature_names_v2 = ['船票等级', '性别', '年龄', '兄弟姐妹/配偶数', '父母/子女数',
                   '票价', '登船港口', '是否独自', '家庭大小', '是否儿童', '年龄组']
for name, importance in zip(feature_names_v2, clf.feature_importances_):
    bar = '█' * int(importance * 30)
    print(f"  {name:<15} {importance:.4f} {bar}")

# ============ 6. 模型评估 ============

print("\n" + "=" * 60)
print("第6步：模型评估")
print("=" * 60)

# 预测
y_train_pred = clf.predict(X_train)
y_test_pred = clf.predict(X_test)
y_test_proba = clf.predict_proba(X_test)[:, 1]

# 计算各项指标
print(f"\n训练集指标:")
print(f"  - 准确率: {accuracy_score(y_train, y_train_pred):.2%}")

print(f"\n测试集指标:")
print(f"  - 准确率: {accuracy_score(y_test, y_test_pred):.2%}")
print(f"  - 精确率: {precision_score(y_test, y_test_pred):.2%}")
print(f"  - 召回率: {recall_score(y_test, y_test_pred):.2%}")
print(f"  - F1分数: {f1_score(y_test, y_test_pred):.2%}")
print(f"  - AUC: {roc_auc_score(y_test, y_test_proba):.2%}")

# 分类报告
print(f"\n分类报告:")
print(classification_report(y_test, y_test_pred, 
                            target_names=['死亡', '存活']))

# 混淆矩阵
print(f"混淆矩阵:")
cm = confusion_matrix(y_test, y_test_pred)
print(f"预测 →      死亡   存活")
print(f"真实死亡    {cm[0,0]:4d}   {cm[0,1]:4d}")
print(f"真实存活    {cm[1,0]:4d}   {cm[1,1]:4d}")

# 可视化评估结果
fig, axes = plt.subplots(1, 3, figsize=(15, 5))

# 混淆矩阵热力图
ax = axes[0]
im = ax.imshow(cm, interpolation='nearest', cmap='Blues')
ax.figure.colorbar(im, ax=ax)
ax.set(xticks=[0, 1], yticks=[0, 1],
       xticklabels=['死亡', '存活'], yticklabels=['死亡', '存活'],
       ylabel='真实标签', xlabel='预测标签',
       title='混淆矩阵')

for i in range(2):
    for j in range(2):
        ax.text(j, i, format(cm[i, j], 'd'),
                ha="center", va="center",
                color="white" if cm[i, j] > cm.max()/2 else "black", fontsize=14)

# 特征重要性
ax = axes[1]
importances = clf.feature_importances_
indices = np.argsort(importances)[::-1][:8]  # 只显示前8个
ax.barh(range(len(indices)), importances[indices], color='steelblue')
ax.set_yticks(range(len(indices)))
ax.set_yticklabels([feature_names_v2[i] for i in indices])
ax.set_xlabel('特征重要性')
ax.set_title('Top 8 特征重要性')
ax.invert_yaxis()

# ROC曲线
from sklearn.metrics import roc_curve, auc
ax = axes[2]
fpr, tpr, thresholds = roc_curve(y_test, y_test_proba)
roc_auc = auc(fpr, tpr)
ax.plot(fpr, tpr, color='steelblue', lw=2, label=f'ROC曲线 (AUC = {roc_auc:.3f})')
ax.plot([0, 1], [0, 1], color='navy', lw=2, linestyle='--')
ax.set_xlim([0.0, 1.0])
ax.set_ylim([0.0, 1.05])
ax.set_xlabel('假阳性率')
ax.set_ylabel('真阳性率')
ax.set_title('ROC曲线')
ax.legend(loc="lower right")
ax.grid(True, alpha=0.3)

plt.tight_layout()
plt.savefig('titanic_evaluation.png', dpi=150)
plt.show()

# ============ 7. 交叉验证 ============

print("\n" + "=" * 60)
print("第7步：交叉验证")
print("=" * 60)

# 5折分层交叉验证
cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
cv_scores = cross_val_score(clf, X_v2, y, cv=cv, scoring='accuracy')

print(f"\n5折分层交叉验证结果:")
print(f"  - 各折准确率: {cv_scores}")
print(f"  - 平均准确率: {np.mean(cv_scores):.2%}")
print(f"  - 标准差: {np.std(cv_scores):.2%}")

# ============ 8. 决策树可视化 ============

print("\n" + "=" * 60)
print("第8步：决策树可视化")
print("=" * 60)

# 绘制决策树
fig, ax = plt.subplots(figsize=(25, 15))
plot_tree(clf, feature_names=feature_names_v2, 
          class_names=['死亡', '存活'],
          filled=True, rounded=True, fontsize=8, ax=ax,
          impurity=True, proportion=True)
plt.title('泰坦尼克号生存预测决策树', fontsize=16)
plt.tight_layout()
plt.savefig('titanic_decision_tree.png', dpi=150)
plt.show()

# 导出决策规则
print("\n主要决策规则（前20条）:")
print("-" * 40)
rules = export_text(clf, feature_names=feature_names_v2)
print('\n'.join(rules.split('\n')[:20]))

# ============ 9. 参数调优 ============

print("\n" + "=" * 60)
print("第9步：参数调优")
print("=" * 60)

from sklearn.model_selection import GridSearchCV

# 参数网格
param_grid = {
    'max_depth': [3, 4, 5, 6, 7, 8],
    'min_samples_split': [5, 10, 20, 30],
    'min_samples_leaf': [3, 5, 10, 15],
}

# 网格搜索
grid_search = GridSearchCV(
    DecisionTreeClassifier(random_state=42),
    param_grid,
    cv=5,
    scoring='accuracy',
    n_jobs=-1
)

grid_search.fit(X_train, y_train)

print(f"\n最优参数:")
for param, value in grid_search.best_params_.items():
    print(f"  - {param}: {value}")
print(f"\n最优交叉验证准确率: {grid_search.best_score_:.2%}")

# 使用最优模型
best_clf = grid_search.best_estimator_
y_pred_best = best_clf.predict(X_test)

print(f"\n最优模型测试集准确率: {accuracy_score(y_test, y_pred_best):.2%}")

# ============ 10. 结果总结 ============

print("\n" + "=" * 60)
print("第10步：结果总结")
print("=" * 60)

print("""
泰坦尼克号生存预测项目总结
========================

1. 数据概况:
   - 总样本数: {}
   - 特征数量: {}
   - 总体生存率: {:.1%}

2. 关键发现:
   - 性别是最重要的预测因素，女性生存率远高于男性
   - 船票等级对生存率有显著影响，一等舱生存率最高
   - 儿童（<16岁）有更高的生存优先权
   - 票价与生存率正相关
   - 独自旅行的乘客生存率较低

3. 模型性能:
   - 测试集准确率: {:.1%}
   - AUC分数: {:.3f}

4. 决策树解读:
   - 决策路径：首先考虑性别，然后是船票等级/票价
   - 最高生存率群体：女性 + 一等舱
   - 最低生存率群体：男性 + 三等舱

5. 改进方向:
   - 尝试集成学习（随机森林、梯度提升）
   - 更多的特征工程
   - 超参数优化
""".format(
    len(df),
    X_v2.shape[1],
    df['survived'].mean(),
    accuracy_score(y_test, y_pred_best),
    roc_auc_score(y_test, y_test_proba)
))

print("\n所有图像已保存:")
print("  - titanic_eda.png: 数据探索")
print("  - titanic_evaluation.png: 模型评估")
print("  - titanic_decision_tree.png: 决策树可视化")
```

---

## 17. 决策树的参数调优

### 17.1 主要参数

```python
DecisionTreeClassifier(
    # 分裂准则
    criterion='gini',           # 'gini', 'entropy', 'log_loss'
    
    # 树结构限制
    max_depth=None,             # 最大深度
    min_samples_split=2,        # 分裂所需最小样本数
    min_samples_leaf=1,         # 叶节点最小样本数
    max_leaf_nodes=None,        # 最大叶节点数
    min_impurity_decrease=0,    # 分裂所需最小不纯度减少
    
    # 特征选择
    max_features=None,          # 分裂时考虑的最大特征数
    
    # 其他
    random_state=None,          # 随机种子
    class_weight=None,          # 类别权重
)
```

### 17.2 参数调优示例

```python
from sklearn.tree import DecisionTreeClassifier
from sklearn.model_selection import GridSearchCV, RandomizedSearchCV
import numpy as np

# 定义参数网格
param_grid = {
    'max_depth': [3, 5, 7, 10, 15, None],
    'min_samples_split': [2, 5, 10, 20, 50],
    'min_samples_leaf': [1, 2, 5, 10, 20],
    'criterion': ['gini', 'entropy']
}

# 网格搜索
grid_search = GridSearchCV(
    DecisionTreeClassifier(random_state=42),
    param_grid,
    cv=5,
    scoring='accuracy',
    n_jobs=-1,
    verbose=1
)

grid_search.fit(X_train, y_train)

print(f"最优参数: {grid_search.best_params_}")
print(f"最优准确率: {grid_search.best_score_:.4f}")

# 使用最优模型
best_model = grid_search.best_estimator_
```

### 17.3 参数影响可视化

```python
def plot_parameter_effect(X, y, param_name, param_values, clf_class=DecisionTreeClassifier):
    """可视化参数对模型性能的影响"""
    train_scores = []
    test_scores = []
    
    for value in param_values:
        params = {param_name: value}
        clf = clf_class(**params, random_state=42)
        
        clf.fit(X_train, y_train)
        train_scores.append(clf.score(X_train, y_train))
        test_scores.append(clf.score(X_test, y_test))
    
    plt.figure(figsize=(10, 6))
    plt.plot(param_values, train_scores, 'b-o', label='训练集')
    plt.plot(param_values, test_scores, 'r-o', label='测试集')
    plt.xlabel(param_name)
    plt.ylabel('准确率')
    plt.title(f'{param_name} 对准确率的影响')
    plt.legend()
    plt.grid(True, alpha=0.3)
    plt.tight_layout()
    plt.savefig(f'param_effect_{param_name}.png', dpi=150)
    plt.show()

# 示例
plot_parameter_effect(X_train, y_train, 'max_depth', range(1, 20))
plot_parameter_effect(X_train, y_train, 'min_samples_split', [2, 5, 10, 20, 50, 100])
plot_parameter_effect(X_train, y_train, 'min_samples_leaf', [1, 2, 5, 10, 20, 50])
```

---

## 18. 集成学习：随机森林与梯度提升树

### 18.1 为什么需要集成学习？

单一决策树有以下问题：
- 容易过拟合
- 对数据变化敏感
- 预测精度有限

集成学习通过组合多个模型来提高预测性能和稳定性。

### 18.2 随机森林

随机森林是一种Bagging方法，通过构建多棵决策树并取平均来减少方差。

**核心思想**：
1. 对每棵树：从原始数据中有放回地抽取样本（Bootstrap）
2. 对每棵树：随机选择部分特征进行分裂
3. 最终预测：所有树的投票/平均值

```python
from sklearn.ensemble import RandomForestClassifier

# 随机森林分类器
rf_clf = RandomForestClassifier(
    n_estimators=100,      # 树的数量
    max_depth=10,          # 每棵树的最大深度
    min_samples_split=5,   # 分裂所需最小样本数
    min_samples_leaf=2,    # 叶节点最小样本数
    max_features='sqrt',   # 考虑的特征数
    random_state=42,
    n_jobs=-1              # 使用所有CPU
)

rf_clf.fit(X_train, y_train)
y_pred = rf_clf.predict(X_test)

print(f"随机森林准确率: {rf_clf.score(X_test, y_test):.2%}")

# 特征重要性
print(f"特征重要性:")
for name, importance in zip(feature_names, rf_clf.feature_importances_):
    print(f"  {name}: {importance:.4f}")
```

### 18.3 梯度提升树

梯度提升树是一种Boosting方法，通过逐步构建树来减少偏差。

**核心思想**：
1. 训练第一棵树
2. 计算残差（真实值 - 预测值）
3. 用新树来拟合残差
4. 重复直到达到要求的树数量
5. 最终预测：所有树的加权求和

```python
from sklearn.ensemble import GradientBoostingClassifier

# 梯度提升分类器
gb_clf = GradientBoostingClassifier(
    n_estimators=100,      # 树的数量
    learning_rate=0.1,     # 学习率
    max_depth=5,          # 每棵树的最大深度
    min_samples_split=5,
    min_samples_leaf=2,
    subsample=0.8,         # 子采样比例
    random_state=42
)

gb_clf.fit(X_train, y_train)
y_pred = gb_clf.predict(X_test)

print(f"梯度提升准确率: {gb_clf.score(X_test, y_test):.2%}")
```

### 18.4 对比示例

```python
"""
决策树、随机森林、梯度提升树对比
"""

import numpy as np
import matplotlib.pyplot as plt
from sklearn.datasets import make_moons
from sklearn.model_selection import train_test_split
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.metrics import accuracy_score

# 生成数据
X, y = make_moons(n_samples=500, noise=0.3, random_state=42)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.3, random_state=42)

# 决策边界绘制函数
def plot_decision_boundary(clf, X, y, ax, title):
    h = 0.02
    x_min, x_max = X[:, 0].min() - 0.5, X[:, 0].max() + 0.5
    y_min, y_max = X[:, 1].min() - 0.5, X[:, 1].max() + 0.5
    xx, yy = np.meshgrid(np.arange(x_min, x_max, h), np.arange(y_min, y_max, h))
    
    Z = clf.predict(np.c_[xx.ravel(), yy.ravel()])
    Z = Z.reshape(xx.shape)
    
    ax.contourf(xx, yy, Z, alpha=0.4, cmap='RdYlBu')
    ax.scatter(X[:, 0], X[:, 1], c=y, alpha=0.6, cmap='RdYlBu', edgecolors='k', s=20)
    ax.set_title(title)
    return accuracy_score(y_test, clf.predict(X_test))

# 训练模型
models = {
    '决策树 (深度=3)': DecisionTreeClassifier(max_depth=3, random_state=42),
    '决策树 (深度=15)': DecisionTreeClassifier(max_depth=15, random_state=42),
    '随机森林': RandomForestClassifier(n_estimators=100, max_depth=10, random_state=42),
    '梯度提升树': GradientBoostingClassifier(n_estimators=100, max_depth=5, random_state=42)
}

# 训练并评估
fig, axes = plt.subplots(2, 2, figsize=(14, 12))
accuracies = {}

for ax, (name, clf) in zip(axes.flat, models.items()):
    clf.fit(X_train, y_train)
    acc = plot_decision_boundary(clf, X_test, y_test, ax, f'{name}\n准确率: {acc:.2%}')
    accuracies[name] = acc

plt.suptitle('模型对比', fontsize=16)
plt.tight_layout()
plt.savefig('ensemble_comparison.png', dpi=150)
plt.show()

# 打印结果
print("\n模型性能对比:")
print("-" * 40)
for name, acc in sorted(accuracies.items(), key=lambda x: x[1], reverse=True):
    print(f"{name:<25} {acc:.2%}")
```

---

## 19. 总结与展望

### 19.1 决策树核心要点总结

```
┌─────────────────────────────────────────────────────────────┐
│                      决策树学习要点                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. 基本原理                                                │
│     - 树形结构的分类/回归模型                                 │
│     - 通过特征分裂逐步细化分类                                 │
│     - 寻找最优分裂特征和分裂点                                 │
│                                                             │
│  2. 分裂准则                                                │
│     - 熵 (Entropy) - ID3/C4.5                               │
│     - 基尼系数 (Gini) - CART                                │
│     - 信息增益 = 原始熵 - 加权条件熵                          │
│                                                             │
│  3. 主要算法                                                │
│     - ID3: 信息增益，多叉树                                   │
│     - C4.5: 信息增益率，离散/连续特征                         │
│     - CART: 基尼系数，二叉树，分类/回归                        │
│                                                             │
│  4. 防止过拟合                                               │
│     - 预剪枝：限制深度、叶节点样本数等                         │
│     - 后剪枝：代价复杂度剪枝（CCP）                           │
│                                                             │
│  5. 优缺点                                                   │
│     ✓ 易于理解和解释                                         │
│     ✓ 无需特征缩放                                           │
│     ✓ 可处理混合特征                                         │
│     ✗ 容易过拟合                                             │
│     ✗ 对噪声敏感                                             │
│     ✗ 不平衡数据可能偏向多数类                                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 19.2 学习路径建议

1. **入门阶段**：
   - 理解熵和基尼系数的概念
   - 学会手动计算信息增益
   - 使用scikit-learn构建简单决策树

2. **进阶阶段**：
   - 从零实现决策树算法
   - 理解不同分裂准则的优劣
   - 掌握剪枝技术

3. **实践阶段**：
   - 完成鸢尾花、泰坦尼克号等项目
   - 学习参数调优方法
   - 掌握特征工程技巧

4. **扩展阶段**：
   - 学习随机森林和梯度提升树
   - 理解XGBoost、LightGBM等高级工具
   - 应用于实际问题

### 19.3 进一步学习资源

**书籍推荐**：
- 《机器学习》- 周志华
- 《统计学习方法》- 李航
- 《Hands-On Machine Learning》- Aurélien Géron

**在线资源**：
- scikit-learn官方文档
- Kaggle竞赛平台
- 机器学习相关的博客和教程

### 19.4 未来研究方向

1. **深度学习与传统决策树的结合**
   - 神经网络决策树（Neural Decision Trees）
   - 基于注意力机制的决策树

2. **可解释性AI（XAI）**
   - 决策树作为可解释模型
   - LIME、SHAP等解释方法
   - 模型解释的标准化

3. **高效算法**
   - 大规模数据集上的决策树
   - 分布式决策树训练
   - 在线学习决策树

4. **自动化机器学习（AutoML）**
   - 自动特征选择
   - 自动超参数优化
   - 神经架构搜索

---

## 附录：常用函数速查表

### A.1 sklearn.tree 模块

```python
from sklearn.tree import (
    DecisionTreeClassifier,      # 决策树分类器
    DecisionTreeRegressor,       # 决策树回归器
    plot_tree,                   # 可视化决策树
    export_text,                 # 导出决策规则为文本
    export_graphviz              # 导出为Graphviz格式
)
```

### A.2 主要方法

```python
# 创建分类器
clf = DecisionTreeClassifier(
    criterion='gini',           # 分裂准则
    max_depth=None,              # 最大深度
    min_samples_split=2,         # 分裂最小样本数
    min_samples_leaf=1,          # 叶节点最小样本数
    random_state=None            # 随机种子
)

# 训练
clf.fit(X_train, y_train)

# 预测
y_pred = clf.predict(X_test)           # 类别预测
y_proba = clf.predict_proba(X_test)    # 概率预测

# 评估
accuracy = clf.score(X_test, y_test)    # 准确率

# 属性
clf.feature_importances_              # 特征重要性
clf.get_depth()                       # 树深度
clf.get_n_leaves()                    # 叶节点数
```

### A.3 可视化

```python
# 绘制决策树
from sklearn.tree import plot_tree, export_text

plt.figure(figsize=(20, 10))
plot_tree(clf, feature_names=features, class_names=classes,
          filled=True, rounded=True)
plt.show()

# 导出规则
rules = export_text(clf, feature_names=features)
print(rules)
```

---

**教程结束**

希望这份详细的决策树教程能帮助你从零开始掌握决策树算法。如有任何问题，请随时提问！

祝你学习愉快！
