// support_eval3.js — 修正字段 join：kpr_eco/kpr_low/kpr_full, feed gotR/net/gotShare
const fs = require('fs');
const E = 'E:/cs2_econ_2026/';
const low = s => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const pf = JSON.parse(fs.readFileSync(E + 'players_final_season30.json', 'utf8'));
const rl = JSON.parse(fs.readFileSync(E + 'players_roundlevel.json', 'utf8'));
const rlMap = new Map(rl.map(x => [low(x.nick), x]));
const feed = JSON.parse(fs.readFileSync(E + 'league_feed_intra.json', 'utf8'));
const feedMap = new Map((feed.rows || []).map(x => [low(x.nick), x]));
const tcsv = fs.readFileSync(E + 'tableau_positions_raw.csv', 'utf8').split(/\r?\n/);
const tRole = new Map();
for (const line of tcsv.slice(1)) { const c = line.split(','); if (c.length > 8) { const name = (c[1] || '').trim(); const role = (c[2] || '').trim(); if (name && !tRole.has(low(name))) tRole.set(low(name), role); } }
const cohort = pf.filter(p => (tRole.get(low(p.nick)) || '').toLowerCase().includes('support'));

const rows = [];
for (const p of cohort) {
  const r = rlMap.get(low(p.nick));
  const f = feedMap.get(low(p.nick));
  const mates = pf.filter(q => q.mainTeam === p.mainTeam);
  const ts = mates.map(q => q.spent).sort((a, b) => a - b);
  const medS = ts[Math.floor(ts.length / 2)];
  const matesR = mates.filter(q => q.nick !== p.nick).map(q => q.r30_season).sort((a, b) => a - b);
  const medR = matesR[Math.floor(matesR.length / 2)];
  const x = { nick: p.nick, team: p.mainTeam, rounds: r ? r.rounds : p.rounds, r30: p.r30_season, resid: p.resid30s,
    // M1 吃枪强度（纯队内）: gotR 绝对值 + gotShare 队内份额 + gotFreq 频次
    gotR: f ? +f.gotR.toFixed(0) : (r ? +r.got_r.toFixed(0) : null),
    gotShare: f ? f.gotShare : null, gotFreq: f ? f.gotFreq : null,
    // M2 花费相对队内中位
    relSpent: +(p.spent / medS).toFixed(3),
    // M3 产出
    // M4 功能性: util/r
    utilR: r ? +r.util_r.toFixed(0) : null,
    // M5 穷局产出
    ecoKPR: r ? +r.kpr_eco.toFixed(3) : null, lowKPR: r ? +r.kpr_low.toFixed(3) : null, fullKPR: r ? +r.kpr_full.toFixed(3) : null,
    fkr: r ? +r.fkr.toFixed(3) : null, dr: r ? +r.fdr.toFixed(3) : null, pistolKpr: r ? +r.pistolKpr.toFixed(3) : null,
    medR: +medR.toFixed(3) };
  x.relOut = +(x.r30 / medR).toFixed(3); // 产出/队友中位
  rows.push(x);
}
console.log('=== Support 五指标总表 v2（官方 Support', rows.length, '人）===');
console.log('nick'.padEnd(11), 'team'.padEnd(9), 'R   ', 'r30  ', 'resid ', 'relS ', 'gotR', 'shr%', 'util', 'ecoK ', 'lowK ', 'fullK', 'relOut');
for (const x of rows.sort((a, b) => b.r30 - a.r30))
  console.log(x.nick.padEnd(11), String(x.team).slice(0, 8).padEnd(9), String(x.rounds).padStart(4), String(x.r30).padEnd(5), (x.resid >= 0 ? '+' : '') + x.resid.toFixed(3).padEnd(6), String(x.relSpent).padEnd(5), String(x.gotR).padEnd(4), String(x.gotShare != null ? x.gotShare.toFixed(0) : '·').padEnd(4), String(x.utilR).padEnd(5), String(x.ecoKPR).padEnd(5), String(x.lowKPR).padEnd(5), String(x.fullKPR).padEnd(5), String(x.relOut));
fs.writeFileSync(E + 'support_cohort.json', JSON.stringify(rows, null, 1));

// composite score: 每个指标在 cohort 内做分位，加总
// M1 吃枪少: 低 gotR 好; M2 便宜: 低 relSpent 好; M3 产出: 高 resid 好; M4 功能: 高 utilR 好; M5 穷局: 高 ecoKPR/lowKPR 相对 fullKPR 好
const pct = (arr, v, asc) => { const s = arr.filter(x => x != null).slice().sort((a, b) => asc ? a - b : b - a); const i = s.indexOf(v); return i < 0 ? null : 1 - i / s.length; };
const scored = rows.map(x => {
  const m1 = pct(rows.map(r => r.gotR), x.gotR, true);      // 低好
  const m2 = pct(rows.map(r => r.relSpent), x.relSpent, true);
  const m3 = pct(rows.map(r => r.resid), x.resid, false);
  const m4 = pct(rows.map(r => r.utilR), x.utilR, false);
  const ecoRel = x.ecoKPR != null ? x.ecoKPR / x.fullKPR : null;
  const m5 = ecoRel != null ? pct(rows.map(r => r.ecoKPR != null ? r.ecoKPR / r.fullKPR : null), ecoRel, false) : null;
  const parts = [m1, m2, m3, m4, m5].filter(v => v != null);
  return { ...x, ecoRel: ecoRel != null ? +ecoRel.toFixed(2) : null, m1, m2, m3, m4, m5, score: parts.length ? +(parts.reduce((a, b) => a + b, 0) / parts.length).toFixed(2) : null };
});
console.log('\n=== 综合分（5指标均值分位，1= cohort 最优）===');
for (const x of scored.sort((a, b) => b.score - a.score))
  console.log(x.nick.padEnd(11), String(x.team).slice(0, 8).padEnd(9), 'score=' + String(x.score).padEnd(5), 'M1吃枪=' + (x.m1 ?? '·'), 'M2省钱=' + (x.m2 ?? '·'), 'M3产出=' + (x.m3 ?? '·'), 'M4功能=' + (x.m4 ?? '·'), 'M5穷局=' + (x.m5 ?? '·'), 'ecoRel=' + x.ecoRel);
fs.writeFileSync(E + 'support_scored.json', JSON.stringify(scored, null, 1));
