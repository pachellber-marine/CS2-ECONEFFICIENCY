// Low-econ overperformance index: who punches above weight when poor
const fs = require('fs');
const E = 'E:/cs2_econ_2026/';
const tier = new Map(JSON.parse(fs.readFileSync(E + 'players_tierlevel.json', 'utf8')));
const players = new Map(JSON.parse(fs.readFileSync(E + 'players_final_season30.json', 'utf8')).map(p => [p.nick, p]));

// position baseline KPR by tier (from role means)
const roleBase = {};
for (const [nick, a] of tier) {
  const pr = players.get(nick); if (!pr || pr.rounds < 500) continue;
  const k = (pr.pos_role || '?').split('(')[0].trim();
  roleBase[k] = roleBase[k] || { eco: [0, 0], low: [0, 0], full: [0, 0], force: [0, 0] };
  for (const t of ['eco', 'low', 'force', 'full']) { roleBase[k][t][0] += a[t].k / Math.max(1, a[t].R); roleBase[k][t][1]++; }
}
for (const k in roleBase) for (const t in roleBase[k]) roleBase[k][t] = roleBase[k][t][0] / roleBase[k][t][1];

const rows = [];
for (const [nick, a] of tier) {
  const pr = players.get(nick); if (!pr || pr.rounds < 500 || !pr.pos_role) continue;
  const k = (pr.pos_role || '?').split('(')[0].trim();
  if (!roleBase[k]) continue;
  const kprEco = a.eco.k / Math.max(1, a.eco.R), kprLow = a.low.k / Math.max(1, a.low.R), kprFull = a.full.k / Math.max(1, a.full.R);
  if (a.eco.R < 150 || a.low.R < 100) continue;
  // resilience = own poor KPR vs own full KPR, relative to position baseline same ratio
  const ownRatio = (kprEco + kprLow) / Math.max(0.1, 2 * kprFull);
  const baseRatio = (roleBase[k].eco + roleBase[k].low) / Math.max(0.1, 2 * roleBase[k].full);
  rows.push({ nick, team: pr.mainTeam, role: k, spent: Math.round(pr.spent), rating30: pr.r30_season,
    kprEco: +kprEco.toFixed(3), kprLow: +kprLow.toFixed(3), kprFull: +kprFull.toFixed(3),
    ecoRel: +(kprEco / roleBase[k].eco).toFixed(2), lowRel: +(kprLow / roleBase[k].low).toFixed(2),
    resilience: +(ownRatio / baseRatio).toFixed(2), ecoR: a.eco.R });
}
rows.sort((a, b) => b.resilience - a.resilience);
console.log('=== 穷局抗压榜（resilience>1 = 穷局比自己满枪局相对跌幅小于同位置平均）===');
for (const r of rows.slice(0, 18)) console.log(r.nick.padEnd(12), r.team.padEnd(13), r.role.padEnd(12), 'resil=' + r.resilience, 'ecoKPR=' + r.kprEco, 'lowKPR=' + r.kprLow, 'fullKPR=' + r.kprFull, 'ecoRel=' + r.ecoRel, 'spent=$' + r.spent, 'r30=' + r.rating30);
console.log('... 最差 8 人:');
for (const r of rows.slice(-8)) console.log(r.nick.padEnd(12), r.team.padEnd(13), r.role.padEnd(12), 'resil=' + r.resilience, 'ecoKPR=' + r.kprEco, 'fullKPR=' + r.kprFull, 'spent=$' + r.spent);
const T = rows.find(r => r.nick === 'TeSeS');
console.log('\nTeSeS:', T ? JSON.stringify(T) : 'n/a');
// green leaf lens: cheap + resilient + decent rating
const gl = rows.filter(r => r.spent < 1050 && r.resilience >= 1 && r.rating30 >= 1.05).sort((a, b) => b.rating30 - a.rating30);
console.log('\n=== 低花+抗压+有产出 的真绿叶（spent<$1050, resil>=1, r30>=1.05）===');
for (const r of gl.slice(0, 12)) console.log(r.nick.padEnd(12), r.team.padEnd(13), r.role.padEnd(12), 'spent=$' + r.spent, 'r30=' + r.rating30, 'resil=' + r.resilience, 'ecoKPR=' + r.kprEco);
fs.writeFileSync(E + 'players_resilience.json', JSON.stringify(rows, null, 1));
console.log('\nsaved players_resilience.json,', rows.length, 'players');
