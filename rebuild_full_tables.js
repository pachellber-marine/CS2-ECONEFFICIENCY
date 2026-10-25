// Rebuild TEXAS_JEE_FULL_TABLES.md: swap tables 2/3/4 for official versions (official nick, roster-filtered), keep tables 1/5/6 as-is
const fs = require('fs');
const E = 'E:/cs2_econ_2026/';
const old = fs.readFileSync(E + 'TEXAS_JEE_FULL_TABLES.md', 'utf8').split('\n');

function seg(startMarker, endMarker) {
  const s = old.findIndex(l => l.includes(startMarker));
  let e = old.findIndex((l, i) => i > s && l.includes(endMarker));
  if (e === -1) e = old.length;
  return { s, e };
}
const head = old.slice(0, seg('### 表2', '### 表3').e); // includes tables 1 + intro
const t456 = old.slice(seg('### 表5', '### 表6').s); // tables 5,6 to EOF

const T2 = JSON.parse(fs.readFileSync(E + 'players_ecokpr_official.json', 'utf8'));
const T3 = JSON.parse(fs.readFileSync(E + 'players_marginal_official.json', 'utf8'));
const T4 = JSON.parse(fs.readFileSync(E + 'players_layers_official.json', 'utf8'));

function fmt(v, d = 3) { return v === null || v === undefined ? '—' : (typeof v === 'number' ? v.toFixed(d) : v); }

let out = [];
out.push('### 表2 穷局产出（KPR eco vs full，官方名，ever-top20 白名单内，n=' + T2.length + '）');
out.push('');
out.push('口径：eco 档=(-1|0)，full=2；阈值 ecoR≥150 & fullR≥400；rel=KPR(eco)/KPR(full)，z=双比例差检验（负=穷局塌方）；按 z 升序（塌得最少在前）。数据源 rounds_all_final.jsonl（官方 player_id），名单=stats_list_2026_byTeam.json 35 队 249 人。');
out.push('');
out.push('| # | 选手 | 战队 | 回合 | eco回合 | full回合 | KPR_eco | KPR_full | rel | z |');
out.push('|---|------|------|------|---------|----------|---------|----------|-----|---|');
[...T2].sort((a, b) => a.z - b.z).forEach((r, i) => {
  out.push(`| ${i + 1} | ${r.nick} | ${r.team} | ${r.rounds} | ${r.ecoR} | ${r.fullR} | ${r.kprEco.toFixed(3)} | ${r.kprFull.toFixed(3)} | ${r.rel.toFixed(3)} | ${r.z.toFixed(2)} |`);
});
out.push('');

out.push('### 表3 边际弹性（官方名，ever-top20 白名单内，n=' + T3.length + '）');
out.push('');
out.push('口径：ΔKPR/Δ$ 用硬 eco(-1) vs full(2) 离散差分，阈值硬eco≥150 & full≥400；marginalKPD=每千美元装备换得的 KPR 增量×1000；elasticity=边际×中位花费/中位KPR（低=经济不敏感）；olsSlope=回合级 OLS 斜率×1000（n≥200）。按 elasticity 升序（最经济免疫在前）。');
out.push('');
out.push('| # | 选手 | 战队 | KPR_eco(硬) | KPR_full | $eco | $full | marginalKPD | elasticity | olsSlope |');
out.push('|---|------|------|-------------|----------|------|-------|-------------|------------|----------|');
T3.forEach((r, i) => {
  out.push(`| ${i + 1} | ${r.nick} | ${r.team} | ${r.kprEco.toFixed(3)} | ${r.kprFull.toFixed(3)} | ${r.spendEco} | ${r.spendFull} | ${r.marginalKPD.toFixed(2)} | ${r.elasticity.toFixed(3)} | ${r.olsSlope === null ? '—' : r.olsSlope.toFixed(2)} |`);
});
out.push('');

out.push('### 表4 HLTV Rating 3.0 六层敏感性（官方名，n=' + T4.length + '，ALL≥15 maps）');
out.push('');
out.push('口径：BIG=HLTV 大赛（Major/IEM/BLAST/EPL/EWC/PGL/FISSURE 等，剔预选）；T20/T5=对手在当周 HLTV 榜 top20/top5；BIG_T20≈ALL_T20 数字相同是层定义重叠（大赛场次几乎都在 top20 对手内）。按 ALL 降序。数据=逐图官方 3.0 平均。');
out.push('');
out.push('| # | 选手 | 战队 | 角色 | ALL(m) | BIG(m) | ALL_T20(m) | ALL_T5(m) |');
out.push('|---|------|------|------|--------|--------|------------|-----------|');
T4.forEach((r, i) => {
  const f = x => (x && x.r != null) ? `${x.r.toFixed(3)} (${x.m})` : '—';
  out.push(`| ${i + 1} | ${r.nick} | ${r.team} | ${r.role || '—'} | ${f(r.ALL)} | ${f(r.BIG)} | ${f(r.ALL_T20)} | ${f(r.ALL_T5)} |`);
});
out.push('');

fs.writeFileSync(E + 'TEXAS_JEE_FULL_TABLES.md', head.join('\n') + '\n' + out.join('\n') + '\n' + t456.join('\n'));
console.log('written. head lines:', head.length, 'new tables lines:', out.length, 'tail lines:', t456.length);
// quick TeSeS/jee line checks
console.log('TeSeS T3:', T3.find(r => /teses/i.test(r.nick)));
console.log('Jee T3:', T3.find(r => /jee/i.test(r.nick)));
