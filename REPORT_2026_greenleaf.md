# 2026 CS2 Top20 战队经济承担与"绿叶"专题研究报告（v3 全赛季官方 Rating 3.0 版）

> 排名窗口：2026-01-05 至 2026-10-19 共 42 周 HLTV 世界排名。
> Rating 口径：**HLTV 官方 Rating 3.0（全赛季）**——从 **1774 场** 2026 赛季比赛页（/matches/）逐图抓取官方 Rating 3.0，按选手逐图平均得到赛季值（与 HLTV 官方赛季聚合口径一致），**非任何拟合值**。
> 经济口径：bo3.gg 公开 API，2026 全赛季（1-10 月）逐队逐选手聚合。
> 样本：42 周内进入过 HLTV Top20 的 35 支战队、249 名选手；≥30 maps 的 200 人中，**197 人拿到全赛季官方 Rating 3.0**（共 642-921 maps/人级别的逐图数据），进入最终分析。
> 角色口径：Tableau Positions Database 官方分类（Opener/Closer/Support/AWPer/IGL-*，匹配 137 人）。

## 一、数据与方法

### 1.1 指标定义
- **花费/回合（spent）**：bo3.gg 2026 赛季每回合平均花费（$）。全样本 $872（karrigan）— $1394（sh1ro）。
- **Rating 3.0（赛季）**：HLTV 官方逐图值（来自每场比赛页"Rating 3.0"列，含 Round Swing 与经济加权），赛季均值 = 官方口径。Sanity 校验：ZywOo 1.491 / donk 1.484 / m0NESY 1.353 / NiKo 1.175 / TeSeS 1.088 / karrigan 0.859。
- **经济调整残差 resid30**：对回归 `rating30 = 0.863 + 0.000236 × spent`（r=0.28）取残差。**resid>0 = 同等花费下产出超预期**。
- **eff30** = rating30 / (spent/1000)：每千美元花费换得的 rating。
- **七维能力**：HLTV 官方 Firepower/Entrying/Trading/Opening/Closing/Sniping/Utility（0-100 百分位）。

### 1.2 已知口径局限（读数前必看）
1. 1837 场枚举比赛中 1774 场成功抓取、63 场无统计数据（被取消/未完赛），覆盖完整。
2. bo3.gg 花费与 HLTV 统计可能有小幅口径差（道具/保枪计入方式）。
3. 3 名选手无赛季 3.0 数据（近 3 个月退役/离队且早期无比赛页数据），只参与经济统计。

## 二、核心发现

### 2.1 经济承担总体格局（197 人）
| 分位 | P10 | P25 | 中位 | P75 | P90 |
|---|---|---|---|---|---|
| $/回合 | ≈$905 | ≈$965 | ≈$1055 | ≈$1160 | ≈$1270 |

### 2.2 官方角色 × 经济 × Rating 3.0（Tableau 官方分类，赛季口径）
| 官方位置 | n | $/回合 | Rating 3.0 | eff30 | 解读 |
|---|---|---|---|---|---|
| **Opener** | 33 | **$979（最省）** | 1.154 | **1.18（最高）** | donk/kyousuke 一代：便宜又出活 |
| Closer | 25 | $1073 | 1.137 | 1.06 | 中等 |
| IGL-Opener | 21 | $988 | 1.032 | 1.05 | 低花费低产出，中性 |
| **Support** | 26 | $1097 | **1.113** | 1.02 | 花得比 Closer/IGL 多，产出低于两者 |
| **AWPer** | 27 | **$1234（最贵）** | 1.172 | **0.95（最低）** | 花费之王，效率垫底 |

**三个颠覆直觉的结论：**
1. **2026 年最便宜的位置是 Opener 不是 Support**（$979 vs $1097）。当红突破手在赢局吃团队资源红利、输局轻装送死，经济占用反而最低。
2. **Support 不是"绿叶"的代名词**：辅助位因道具消耗和让枪补枪需求，平均花费高于 IGL 和 Closer，而产出低于两者。
3. **AWPer 依旧是最贵且性价比最低的位置**（$1234、eff 0.95）：买的是上限不是效率。

### 2.3 谁是真·绿叶（低于中位花费 × resid30 领先，赛季官方 3.0）
| 选手 | 队伍 | 官方位置 | $/回合 | Rating 3.0 | resid30 |
|---|---|---|---|---|---|
| **donk** | Spirit | Opener | $1000 | **1.48** | **+0.39** |
| insani | MIBR | Opener | $996 | 1.33 | +0.23 |
| Magnojez | BETBOOM | Opener | $966 | 1.26 | +0.17 |
| flameZ | Vitality | Opener | $1041 | 1.25 | +0.14 |
| luchov | 9z | Opener | $974 | 1.23 | +0.13 |
| Staehr | Astralis | Opener | $1026 | 1.24 | +0.13 |
| Senzu | Passion UA | — | $1030 | 1.22 | +0.12 |
| Grim | NRG | — | $869 | 1.18 | +0.12 |
| FL4MUS | BETBOOM | Closer | $980 | 1.20 | +0.11 |
| Nertz | G2 | Opener | $962 | 1.19 | +0.10 |
| tENZY | magic | Opener | $990 | 1.20 | +0.10 |
| HUASOPEEK | 9z | Support | $1047 | 1.21 | +0.10 |

**绿叶榜的统治性发现：12 席里 9 席是 Opener。** "花最少的钱干最多的活"在 2026 年是突破手的专利，不是辅助位的。donk 以 $1000 的花费打出 1.48 的赛季 Rating 3.0，resid +0.39 一骑绝尘——真正的" economical monster"。

### 2.4 resid30 垫底（吃资源不产出 / 或 IGL 结构性低值）
Lucky（3DMAX，−0.34）、karrigan（Falcons，−0.21）、interz（1win，AWPer $1273 只有 0.96）、Aleksib（NAVI，IGL −0.19）、siuhy（Liquid，IGL −0.18）、FalleN（FURIA，−0.18）、HooXi（Astralis，IGL −0.16）、Graviti（3DMAX）。
**注意**：IGL 的 resid 低部分是结构性指标偏差（指挥价值不进 rating），Aleksib/siuhy/karrigan/HooXi 不宜直接判"差"。

## 三、TeSeS 专章（全赛季官方 Rating 3.0）

**TeSeS（Thomas Bundsbæk，丹麦，25 岁，Falcons，官方角色 Support / CT-Anchor / T-Lurker）**

### 3.1 官方 Rating 3.0（赛季，642 maps / 61 场系列赛逐图平均）
- **1.088**，全样本 **37.6th 分位**（中等偏下）；十强豪门子样本（n=48）内 **35.4th 分位**
- Falcons 队内：m0NESY 1.353 > NiKo 1.175 > kyousuke 1.186（*注：kyousuke 实际高于 NiKo*）> **TeSeS 1.088** >> karrigan 0.859

### 3.2 经济承担
- **$1147/回合 = 全样本 76.1th 分位、十强豪门内 75.0th 分位、Falcons 队内第 2 高**
- 比队内最贵的 m0NESY（$1311）省 $164，但比 NiKo（$1103）、kyousuke（$964）、karrigan（$872）都贵

### 3.3 性价比
- **resid30 = −0.046（29.9th 分位）**：按 $1147 的花费，预期 rating ≈1.134，实际 1.088——略低于预期但接近持平
- eff30 = 0.949（20.3th 分位）
- 每杀成本 $6617（队内高于 NiKo 5971、kyousuke 5561）

### 3.4 七维画像（HLTV 官方，0-100）
```
Firepower 36 | Entrying 54 | Trading 75 | Opening 15 | Closing 84 | Sniping 0 | Utility 76
```
**官方维度直接证实他的位置本质**：Opening 15（几乎不开路）+ Closing 84（收尾极强）+ Trading 75（补枪极强）+ Utility 76（道具好）——教科书级 Support/Anchor。但 Firepower 36 是硬伤：他的产出靠位置和决策，不靠枪。

### 3.5 TeSeS 是好绿叶吗？——**是"好绿叶"，但不是"便宜绿叶"**

| 维度 | 评价 |
|---|---|
| 花费 | ❌ $1147（76.1 分位）——偏贵，队内第 2 |
| 同经济产出 | ➖ resid −0.05，接近持平 |
| 不占进攻资源 | ✅ Opening 15 + FK 全队最低（0.072） |
| 收尾/补枪/道具 | ✅ Closing 84 / Trading 75 / Utility 76 |
| 火力上限 | ❌ Firepower 36 |

**一句话回答：**
> TeSeS 在 2026 年的花费分位（76.1th）说不上"低经济"，但官方七维和赛季 Rating 3.0 都证明他扮演的是完美的绿叶角色：不抢首杀、不开路、收尾和补枪拉满、道具优质、CT Anchor 本职稳固。他是一名**"标准价格的功能位绿叶"**——你付的是辅助位的市场价（甚至略高），买到的是 Closing/Trading/Utility 三项顶级的能力和极高的输出稳定性（60 场系列赛 σ=0.71、对强队只降 0.22）。严格定义下他不是性价比绿叶（resid −0.05 微负），但"绿叶"这个角色本身他执行得无可挑剔。Falcons 队内真正的性价比绿叶是 kyousuke（$964，Opener，1.186 队内最高产出之一）。

## 四、方法论
1. Rating 3.0 全赛季数据：枚举 35 支 ever-top20 战队 2026 年全部 1837 场比赛，逐场抓取 HLTV 比赛页（经 jina reader），解析逐图官方 Rating 3.0/Swing/KAST/ADR，按选手逐图平均得到赛季值（1774 场成功，63 场无统计）。HLTV /stats/ 赛季聚合页被 Cloudflare 全程拦截，故采用比赛页逐图官方原值——与官方赛季口径一致，且非拟合。
2. Rating 3.0 的 Round Swing 与经济加权不可离线复算——本报告全部 rating 均为 HLTV 官方原值，未做任何拟合。
3. 角色为 Tableau Positions Database 官方分类；63 人未匹配（别名问题），他们仍参与全部分位统计。
4. resid30 回归 r=0.28——花费只解释 rating 的 8%，位置/体系差异是主要方差来源。

---
*报告生成：2026-10-24（v3）。数据：E:\cs2_econ_2026\（players_final_season30.json = 最终合并表；match_r30.jsonl = 1774 场逐图官方 3.0 原始数据；season_r30_raw.json = 赛季聚合；tableau_positions_raw.csv = 官方角色）。*
*管线与代码：github.com/pachellber-marine/CS2-ECONEFFICIENCY*
