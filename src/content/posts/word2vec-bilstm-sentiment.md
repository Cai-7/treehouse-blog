---
title: 用 Word2Vec 和双向 LSTM 判断外卖评论的好坏
date: 2026-08-17
item: board
topic: ml
tags: [NLP, Word2Vec, LSTM, 情感分析, PyTorch]
summary: 一条从分词到预测的完整小管线：jieba 分词，自己训词向量，双向 LSTM 加两种池化，最后看错例。
---

想看看自己训的词向量放进一个真实的小任务里是什么样子，我写了这个外卖评论的情感二分类：输入一条中文评论，判断它是好评还是差评。

整条管线拆成六个脚本，每个只做一件事：

| 文件 | 做什么 |
| --- | --- |
| `preprocess.py` | 读评论、jieba 分词、建词表、把句子编码成定长索引 |
| `train_w2v.py` | 在分好的词上训 Word2Vec，拼出 Embedding 矩阵 |
| `dataset.py` | 分层划分训练集和测试集，包成 DataLoader |
| `model.py` | 双向 LSTM 分类器 |
| `train.py` | 训练，按测试准确率保存最好的模型 |
| `evaluate.py` / `predict.py` | 算指标、看错例；命令行里输一句话就给出判断 |

代码在 [GitHub：Cai-7/word2vec-rnn](https://github.com/Cai-7/word2vec-rnn)。

## 数据和预处理

数据是外卖评论数据集 `waimai_10k.csv`，每行一条评论和一个 0/1 标签。

中文没有空格，第一步是分词。我用 jieba 的精确模式，切完去掉纯空白的词：

```python
words = list(jieba.cut(review.strip(), cut_all=False))
words = [w.strip() for w in words if w.strip()]
```

建词表时留了两个特殊位置：`<PAD>=0` 用来补齐，`<UNK>=1` 收所有没见过的词。出现次数少于 2 的词不进词表，一律算 `<UNK>`。这样词表不会被只出现一次的错别字和生僻词撑大。

每句话截断或补齐到 50 个词。外卖评论一般不长，50 个词能装下大部分内容。

预处理同时产出两份东西：一份是空格分开的分词文本，给 Word2Vec 训练用；一份是编码好的索引序列和标签，给分类器用。

## 自己训词向量

用 gensim 在分好词的评论上训 Skip-gram：

```python
model = Word2Vec(
    sentences=sentences,
    vector_size=100,   # 词向量 100 维
    window=5,
    min_count=2,
    sg=1,              # 1 = Skip-gram，0 = CBOW
    epochs=10,
    seed=42,
)
```

这里用的是 Skip-gram。在 [Word2Vec 复现](/posts/nlp-reproduction)里，Skip-gram 的语义类比明显强于 CBOW；而评论里决定情感的，往往正是“好吃”“难吃”“送得慢”这种带语义的词。

训完后按自己的词表拼一个 Embedding 矩阵，用来初始化分类器的嵌入层：

- `<PAD>` 保持全 0；
- `<UNK>` 和词表里有、但 Word2Vec 没学到的词，用小的随机向量初始化；
- 其余的词直接拷贝 Word2Vec 的向量。

脚本最后会打印和“好吃”最相近的 5 个词，算是一个最快的直观检查：词向量要是学歪了，这里一眼就能看出来。

## 模型：双向 LSTM 加两种池化

```python
class TextRNN(nn.Module):
    def forward(self, x):
        x = self.embedding(x)                    # (batch, 50, 100)
        out, _ = self.lstm(x)                    # (batch, 50, 256)，双向各 128
        mean_pool = torch.mean(out, dim=1)
        max_pool, _ = torch.max(out, dim=1)
        x = torch.cat([mean_pool, max_pool], 1)  # (batch, 512)
        return self.fc(self.dropout(x))
```

几个选择：

- **双向**：一句评论的情感常常要看前后文，“不难吃”和“难吃”只差一个“不”。
- **不只取最后一个时间步**：句子被补齐到 50 个词，最后几步很可能全是 `<PAD>`，只拿最后的隐状态会丢信息。所以对所有时间步同时做平均池化和最大池化，再拼起来。平均池化看整体语气，最大池化抓住最强烈的那个词。
- **嵌入层默认可以微调**：`FREEZE_EMBEDDING` 是一个开关。冻住，就只用 Word2Vec 学到的语义；放开，就让分类任务再把向量往“好评/差评”的方向推一推。

## 训练和评估

- 训练集和测试集按 8:2 **分层**划分（`stratify=labels`），保证两边好评差评的比例一样；
- 交叉熵损失，Adam，学习率 1e-3，batch 64，训 10 个 epoch；
- 每个 epoch 结束都在测试集上算一次准确率，比之前好就存下 `best_model.pth`。

`evaluate.py` 除了准确率，还会算精确率、召回率、F1 和分类报告，再随机抽 5 条**预测错的评论**，把索引还原成词打印出来。看错例比看一个总分有用得多：能看出模型是被反讽骗了，还是被一个没见过的词卡住了。

`predict.py` 是一个命令行小工具：输入一句评论，打印分词结果、判断和置信度。

## 回头看

- 预处理脚本的注释里还写着“用于 CNN 训练”。这个项目一开始打算用 TextCNN，后来换成了 RNN，注释没跟着改。
- 现在是用测试集挑最好的模型，严格说应该再分出一份验证集，测试集只在最后用一次。
- 冻结与微调嵌入层的对比、Skip-gram 与 CBOW 的对比，都值得补一组实验。
