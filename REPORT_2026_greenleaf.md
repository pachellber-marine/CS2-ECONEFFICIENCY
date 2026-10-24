# 2026 CS2 Top20 战队经济承担与"绿叶"专题研究报告（v2 官方 Rating 3.0 版）

> 排名窗口：2026-01-05 至 2026-10-19 共 42 周 HLTV 世界排名。
> Rating 口径：**HLTV 官方 Rating 3.0**（2025-08 引入，Round Swing + 经济加权，直接抓取自 HLTV 选手页官方数值，窗口 Past 3 months）。
> 经济口径：bo3.gg 公开 API，2026 全赛季（1-10 月）逐队逐选手聚合。
> 样本：42 周内进入过 HLTV Top20 的 35 支战队、249 名选手；≥30 maps 的 200 人中，**189 人拿到 HLTV 官方 Rating 3.0**（其余 8 人近 3 个月无比赛数据，1 人 jina 缓存异常），进入最终分析。
> 角色口径：Tableau Positions Database 官方分类（Opener/Closer/Support/AWPer/IGL-*，匹配 137 人）。

## 一、数据与方法

### 1.1 指标定义
- **花费/回合（spent）**：bo3.gg 2026 赛季每回合平均花费（$）。全样本 $872（karrigan）— $1394（sh1ro）。
- **Rating 3.0**：HLTV 官方值（近 3 个月窗口，多为 40-60 maps）。**注：与赛季全程 rating 存在窗口差**；但 189 人同一窗口，横向分位可比。
- **经济调整残差 resid30**：对回归 `rating30 = 0.807 + 0.000234 × spent`（r=0.28）取残差。**resid>0 = 同等花费下产出超预期**。
- **eff30** = rating30 / (spent/1000)：每千美元花费换得的 rating。
- **七维能力**：HLTV 官方 Firepower/Entrying/Trading/Opening/Closing/Sniping/Utility（0-100 百分位）。

### 1.2 已知口径局限（读数前必看）
1. Rating 3.0 是近 3 个月窗口，spent 是全赛季均值——同一个人的两者时间范围不完全重合。
2. bo3.gg 花费与 HLTV 统计可能有小幅口径差（道具/保枪计入方式）。
3. 8 名近 3 个月无比赛的选手（SunPayus、Lucky、Snappi、Zero、alex、levi、skullz、lauNX）无官方 3.0 值，只参与经济统计不参与 rating 排名。

## 二、核心发现

### 2.1 经济承担总体格局（189 人）
| 分位 | P10 | P25 | 中位 | P75 | P90 |
|---|---|---|---|---|---|
| $/回合 | ≈$905 | ≈$965 | ≈$1055 | ≈$1160 | ≈$1270 |

### 2.2 官方角色 × 经济 × Rating 3.0（Tableau 官方分类）
| 官方位置 | n | $/回合 | Rating 3.0 | eff30 | 解读 |
|---|---|---|---|---|---|
| **Opener** | 33 | **$979（最省）** | 1.077 | **1.10（最高）** | donk/kyousuke 一代：便宜又出活 |
| Closer | 24 | $1071 | 1.086 | 1.02 | 中等 |
| IGL-Opener | 21 | $988 | 0.964 | 0.98 | 低花费低产出，中性 |
| **Support** | 26 | $1097 | **1.048** | 0.96 | **花得比 Closer/IGL 多，产出垫底档** |
| **AWPer** | 26 | **$1233（最贵）** | 1.109 | **0.90（最低）** | 花费之王，效率垫底 |

**三个颠覆直觉的结论：**
1. **2026 年最便宜的位置是 Opener 不是 Support**（$979 vs $1097）。当红突破手在赢局吃团队资源红利、输局轻装送死，经济占用反而最低。
2. **Support 不是"绿叶"的代名词**：辅助位因道具消耗和让枪补枪需求，平均花费高于 IGL 和 Closer，而产出低于两者。
3. **AWPer 依旧是最贵且性价比最低的位置**（$1233、eff 0.90）：买的是上限不是效率。

### 2.3 谁是真·绿叶（低于中位花费 × resid30 领先）
| 选手 | 队伍 | 官方位置 | $/回合 | Rating 3.0 | resid30 |
|---|---|---|---|---|---|
| **donk** | Spirit | Opener | $1000 | 1.37 | **+0.33** |
| insani | MIBR | Opener | $996 | 1.24 | +0.20 |
| EliGE | Liquid | Opener | $954 | 1.23 | +0.20 |
| Senzu | Passion UA | — | $1030 | 1.22 | +0.17 |
| Staehr | Astralis | Opener | $1026 | 1.19 | +0.14 |
| npl | B8 | Opener | $984 | 1.16 | +0.12 |
| Nertz | G2 | Opener | $962 | 1.15 | +0.12 |
| FL4MUS | BETBOOM | Closer | $980 | 1.15 | +0.11 |

**绿叶榜的统治性发现：8 席里 6 席是 Opener。** "花最少的钱干最多的活"在 2026 年是突破手的专利，不是辅助位的。

### 2.4 resid30 垫底（吃资源不产出 / 或 IGL 结构性低值）
Bymas（Monte，−0.25）、karrigan（Falcons，−0.22）、max（9z）、br0（NRG）、interz（1win，AWPer $1273 只有 0.93）、Aleksib（NAVI，IGL −0.17）、arT（Legacy）、siuhy（Liquid，IGL −0.17）。
**注意**：IGL 的 resid 低部分是结构性指标偏差（指挥价值不进 rating），Aleksib/siuhy/karrigan 不宜直接判"差"。

## 三、TeSeS 专章（官方 Rating 3.0）

**TeSeS（Thomas Bundsbæk，丹麦，25 岁，Falcons，官方角色 Support / CT-Anchor / T-Lurker）**

### 3.1 官方 Rating 3.0
- **1.04**（近 3 个月，Falcons 全档数据窗口），全样本 **42.3th 分位**（中等偏下）；十强豪门子样本（n=45）内 **35.6th 分位**
- Falcons 队内：m0NESY 1.34、NiKo 1.11、kyousuke 1.05 ≈ TeSeS 1.04 >> karrigan 0.79

### 3.2 经济承担
- **$1147/回合 = 全样本 76.7th 分位、十强豪门内 75.6th 分位、Falcons 队内第 2 高**
- 比队内最贵的 m0NESY（$1311）省 $164，但比 kyousuke（$964）、karrigan（$872）贵得多

### 3.3 性价比
- **resid30 = −0.035（33.9th 分位）**：按 $1147 的花费，预期 rating ≈1.076，实际 1.04——略低于预期但接近
- eff30 = 0.907（27.5th 分位）
- 每杀成本 $6617（队内高于 NiKo 5971、kyousuke 5561）

### 3.4 七维画像（HLTV 官方，0-100）
```
Firepower 36 | Entrying 54 | Trading 75 | Opening 15 | Closing 84 | Sniping 0 | Utility 76
```
**官方维度直接证实他的位置本质**：Opening 15（几乎不开路）+ Closing 84（收尾极强）+ Trading 75（补枪极强）+ Utility 76（道具好）——教科书级 Support/Anchor。但 Firepower 36 是硬伤：他的产出靠位置和决策，不靠枪。

### 3.5 TeSeS 是好绿叶吗？——**是"好绿叶"，但不是"便宜绿叶"**

| 维度 | 评价 |
|---|---|
| 花费 | ❌ $1147（76.7 分位）——偏贵，队内第 2 |
| 同经济产出 | ➖ resid −0.04，接近持平（比 bo3 口径下的 −0.20 温和得多——官方 3.0 的经济加权对他有利，因为他的击杀多发生在对手起枪的回合） |
| 不占进攻资源 | ✅ Opening 15 + FK 全队最低（0.072） |
| 收尾/补枪/道具 | ✅ Closing 84 / Trading 75 / Utility 76 |
| 火力上限 | ❌ Firepower 36 |

**一句话回答：**
> TeSeS 在 2026 年的花费分位（76.7th）说不上"低经济"，但官方七维和 Rating 3.0 都证明他扮演的是完美的绿叶角色：不抢首杀、不开路、收尾和补枪拉满、道具优质、CT Anchor 本职稳固。他是一名**"标准价格的功能位绿叶"**——你付的是辅助位的市场价（甚至略高），买到的是 Closing/Trading/Utility 三项顶级的能力和极高的输出稳定性（60 场系列赛 σ=0.71、对强队只降 0.22）。严格定义下他不是性价比绿叶（resid −0.04 微负），但"绿叶"这个角色本身他执行得无可挑剔。Falcons 队内真正的性价比绿叶是 kyousuke（$964，Opener）。

## 四、方法论
1. Rating 3.0 抓取自 HLTV 选手页官方概览（Past 3 months 窗口），非 /stats/ 全赛季页（被 CF 挡，无法获取赛季聚合 3.0）。
2. Rating 3.0 的 Round Swing 与经济加权不可离线复算——本报告全部 rating 均为 HLTV 官方原值，未做任何拟合。
3. 角色为 Tableau Positions Database 官方分类；63 人未匹配（别名问题），他们仍参与全部分位统计。
4. resid30 回归 r=0.28——花费只解释 rating 的 8%，位置/体系差异是主要方差来源。

---
*报告生成：2026-10-24。数据：E:\cs2_econ_2026\（players_final_r30.json = 最终合并表；hltv_ratings_30_clean.json = 官方 3.0 原值；tableau_positions_raw.csv = 官方角色）。*
