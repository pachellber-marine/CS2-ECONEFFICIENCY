// FINAL v3: strict official rating3.0 (block-scoped parse), 189 players
const fs = require('fs');
const players = JSON.parse(fs.readFileSync('E:/cs2_econ_2026/players_with_positions.json', 'utf8'));
const r30 = new Map(JSON.parse(fs.readFileSync('E:/cs2_econ_2026/hltv_ratings_30_clean.json', 'utf8')).map(o => [o.nick, o]));
const merged = players.filter(p => r30.has(p.nick)).map(p => {
  const r = r30.get(p.nick);
  return {...p, rating30: r.rating30, dims: r.dims || {}, hltv_window: r.window || '(Past 3 months)'};
});
console.log('merged:', merged.length);
const pct = (arr, v) => arr.filter(x => x <= v).length / arr.length * 100;
const sp = merged.map(p => p.spent).sort((a, b) => a - b);
const rts = merged.map(p => p.rating30).sort((a, b) => a - b);
const n = merged.length;
const mx = merged.reduce((s, p) => s + p.spent, 0) / n, my = merged.reduce((s, p) => s + p.rating30, 0) / n;
let num = 0, den = 0, sxy = 0, sy = 0;
for (const p of merged) { num += (p.spent - mx) * (p.rating30 - my); den += (p.spent - mx) ** 2; sxy = num; sy += (p.rating30 - my) ** 2; }
const b = num / den, a = my - b * mx;
console.log('regression: rating30 =', a.toFixed(4), '+', (b * 1e5).toFixed(3) + 'e-5*spent, r=' + (sxy / Math.sqrt(den * sy)).toFixed(3));
for (const p of merged) {
  p.pred = a + b * p.spent;
  p.resid30 = p.rating30 - p.pred;
  p.p_spent30 = pct(sp, p.spent);
  p.p_rating30 = pct(rts, p.rating30);
  p.eff30 = p.rating30 / (p.spent / 1000);
}
const rs = merged.map(p => p.resid30).sort((x, y) => x - y);
const es = merged.map(p => p.eff30).sort((x, y) => x - y);
const agg = {};
for (const p of merged.filter(x => x.pos_role)) {
  const k = p.pos_role.replace(/\s*\(alias.*\)/, '');
  if (!agg[k]) agg[k] = {n: 0, spent: 0, r30: 0, eff30: 0};
  agg[k].n++; agg[k].spent += p.spent; agg[k].r30 += p.rating30; agg[k].eff30 += p.eff30;
}
console.log('\n=== position x official r3.0 ===');
for (const k in agg) console.log(k.padEnd(14), 'n=' + String(agg[k].n).padStart(3), '$' + (agg[k].spent / agg[k].n).toFixed(0), 'r3.0=' + (agg[k].r30 / agg[k].n).toFixed(3), 'eff=' + (agg[k].eff30 / agg[k].n).toFixed(2));
const top = (k, m, asc) => merged.slice().sort((x, y) => asc ? x[k] - y[k] : y[k] - x[k]).slice(0, m);
console.log('\n=== resid30 TOP12 ===');
top('resid30', 12).forEach(p => console.log(p.nick.padEnd(12), p.mainTeam.padEnd(12), 'r3.0=' + p.rating30.toFixed(2), '$' + Math.round(p.spent), 'resid=' + p.resid30.toFixed(3)));
console.log('\n=== resid30 BOTTOM8 ===');
top('resid30', 8, true).forEach(p => console.log(p.nick.padEnd(12), p.mainTeam.padEnd(12), 'r3.0=' + p.rating30.toFixed(2), '$' + Math.round(p.spent), 'resid=' + p.resid30.toFixed(3)));
const med = sp[Math.floor(sp.length / 2)];
console.log('\n=== GREENLEAVES: below-median spend x top resid30 ===');
merged.filter(p => p.spent < med).sort((x, y) => y.resid30 - x.resid30).slice(0, 12).forEach(p => console.log(p.nick.padEnd(12), p.mainTeam.padEnd(12), '$' + Math.round(p.spent), 'r3.0=' + p.rating30.toFixed(2), 'resid=' + p.resid30.toFixed(3), p.pos_role || ''));
console.log('\n=== TeSeS ===');
const T = merged.find(p => p.nick === 'TeSeS');
console.log('r3.0=' + T.rating30, '(' + T.p_rating30.toFixed(1) + 'th pct)', 'spent=$' + Math.round(T.spent), '(' + T.p_spent30.toFixed(1) + 'th pct)', 'resid=' + T.resid30.toFixed(3) + '(' + pct(rs, T.resid30).toFixed(1) + 'th)', 'eff=' + T.eff30.toFixed(3) + '(' + pct(es, T.eff30).toFixed(1) + 'th)');
console.log('dims:', JSON.stringify(T.dims));
// top10-teams-only percentile for TeSeS
const T10 = ['Vitality','Falcons','MOUZ','Spirit','NAVI','G2','The MongolZ','Aurora','FURIA','FaZe'];
const t10p = merged.filter(p => T10.some(t => p.mainTeam.includes(t) || t.includes(p.mainTeam)));
const sp10 = t10p.map(p => p.spent).sort((a,b)=>a-b), rt10 = t10p.map(p => p.rating30).sort((a,b)=>a-b);
console.log('top10 subsample n=' + t10p.length, 'spent pct:', pct(sp10, T.spent).toFixed(1), 'rating pct:', pct(rt10, T.rating30).toFixed(1));
fs.writeFileSync('E:/cs2_econ_2026/players_final_r30.json', JSON.stringify(merged, null, 1));
console.log('saved players_final_r30.json');
