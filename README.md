# CS2-ECONEFFICIENCY

> **The Green Leaf Index — Who pays the least and delivers the most in CS2's elite?**
> A full-season econometric study of every player who touched the HLTV Top 20 in 2026.

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Data](https://img.shields.io/badge/Rating-HLTV%20Official%203.0-blue)](https://www.hltv.org)

## TL;DR

- **Every player** who appeared in the HLTV Top 20 (or VRS Top 20) at any point in 2026 (42 weekly snapshots, Jan 5 – Oct 19): **35 teams, 249 players**.
- **Economy data**: per-round average spending from the bo3.gg public API (full 2026 season, per-team queries).
- **Performance data**: **official HLTV Rating 3.0** — scraped per-map from match pages (Round Swing, KAST, ADR included). No imputation, no fitted proxies.
- **Role data**: the Tableau Positions Database (Opener / Closer / Support / AWPer / IGL).

### Headline findings

1. **The Opener is 2026's best value position** — cheapest ($979/round) *and* most efficient (eff 1.10). The donk generation breaks the stereotype that entry fraggers burn money.
2. **Support is NOT the budget role** — Support players spend *more* than Closers and IGLs ($1097/round) while delivering less. The "green leaf" isn't who you think it is.
3. **AWPers remain the most expensive (1233/round) and least cost-efficient (eff 0.90)** — you buy a ceiling, not a bargain.
4. **8 of the top-10 "low-spend, high-output" green-leaf seats are Openers** (donk leads with resid +0.33).

### Case study: TeSeS

$1147/round (76.7th percentile — expensive), official Rating 3.0 = 1.04, with the profile Opening 15 / Closing 84 / Trading 75 / Utility 76 / Firepower 36. A textbook Support/Anchor: **a fair-priced functional green leaf, not a cheap one**.

## Metric definitions

| Metric | Formula | Meaning |
|---|---|---|
| `spent` | avg $ per round (bo3.gg) | economic footprint |
| `rating30` | official HLTV 3.0, per-map average | output |
| `resid` | residual of `rating30 ~ spent` regression | same-money over/under-performance |
| `eff` | `rating30 / (spent/1000)` | rating per $1000 spent |

## Repository layout

```
REPORT_2026_greenleaf.md     # the full study (Chinese)
fetch_weeks.js               # HLTV weekly Top-20 snapshots -> ever-top20 team set
fetch_stats_2026.js          # bo3.gg season economy per team/player
fetch_matches_r30.js         # 1837 HLTV match pages -> per-map official Rating 3.0
agg_r30.js                   # per-player season aggregation (pid-joined)
final_analysis_v3.js         # regression, residuals, percentiles, role splits
players_final_r30.json       # final merged dataset (189 players)
match_r30.jsonl              # per-match, per-map raw scrape (sample)
hltv_team_ids.json           # HLTV team id map
match_ids.json               # the 1837-match universe
```

## Data pipeline

1. **Ranking universe** — scrape HLTV weekly rankings for 42 weeks; union all Top-20 teams.
2. **Economy** — bo3.gg `/players/stats_list` per team, filtered to the 2026 season.
3. **Official Rating 3.0** — every HLTV match page (r.jina.ai HTML bridge, 429 backoff + Cloudflare guard), parse per-map stat tables (`stats-content` divs), join players by HLTV pid.
4. **Roles** — Tableau Positions Database CSV, fuzzy-joined on nicknames.

## Caveats

- bo3.gg rating scale (~10) was used only for economy; all ratings in the final tables are **official HLTV 3.0**.
- Rating 3.0's Round Swing model is proprietary — we scrape values, we do not reproduce them.
- IGL residuals are structurally depressed (leadership value doesn't score ratings).

## License

MIT — data belongs to HLTV / bo3.gg / Tableau authors; use responsibly and respect their terms.
