// Rebuild players_final_season30 with clean season r30 (purged matches), recompute resid/eff/percentiles
const fs = require('fs');
const path = 'E:/cs2_econ_2026/';
const p30 = require(path + 'players_final_season30.json');
const clean = require(path + 'season_r30_clean.json');
const byPid = new Map(clean.map(r => [String(r.pid), r]));
// merge: update r30_season, s_maps from clean; keep spent etc from p30
for (const p of p30) {
  const c = byPid.get(String(p.pid));
  if (c) { p.r30_season_clean = c.r30; p.s_maps_clean = c.maps; }
}
// recompute regression on those with clean r30 (>=30 maps) using spent
const elig = p30.filter(p => p.r30_season_clean != null && p.s_maps_clean >= 30 && p.spent > 0);
const n = elig.length;
let sx = 0, sy = 0, sxx = 0, sxy = 0;
for (const p of elig) { sx += p.spent; sy += p.r30_season_clean; sxx += p.spent * p.spent; sxy += p.spent * p.r30_season_clean; }
const b = (n * sxy - sx * sy) / (n * sxx - sx * sx), a = (sy - b * sx) / n;
console.log('regression r30 = ' + a.toFixed(3) + ' + ' + b.toFixed(6) + ' * spent   (n=' + n + ', spent=' + (sx / n).toFixed(0) + ', r30=' + (sy / n).toFixed(3) + ')');
for (const p of elig) {
  p.pred_clean = a + b * p.spent;
  p.resid_clean = +(p.r30_season_clean - p.pred_clean).toFixed(3);
  p.eff_clean = +(p.r30_season_clean / (p.spent / 1000)).toFixed(3);
}
// percentiles on resid_clean
const sorted = [...elig].sort((x, y) => x.resid_clean - y.resid_clean);
sorted.forEach((p, i) => { p.p_resid_clean = +((i + 1) / sorted.length * 100).toFixed(1); });
// spent percentile (same as before, recompute on elig)
const s2 = [...elig].sort((x, y) => x.spent - y.spent);
s2.forEach((p, i) => { p.p_spent_clean = +((i + 1) / s2.length * 100).toFixed(1); });
fs.writeFileSync(path + 'players_final_season30_clean.json', JSON.stringify(p30));
// key players + previously-affected names
const keys = ['TeSeS', 'NiKo', 'karrigan', 'kyousuke', 'm0NESY', 'donk', 'ZywOo', 'sh1ro', 'REZ', 'sjuush', 'Tauson', 'HUASOPEEK', 'kyxsan', 'mezii', 'b1t', 'HeavyGod', 'xKacpersky', 'kl1m', 'FL4MUS', 'Staehr'];
console.log('--- clean-season key rows ---');
for (const k of keys) {
  const p = p30.find(x => x.nick === k);
  if (p && p.resid_clean != null) console.log(k.padEnd(10), 'r30=' + p.r30_season_clean, 'spent=' + p.spent, 'resid=' + p.resid_clean + ' (' + p.p_resid_clean + 'th)', 'eff=' + p.eff_clean, 'spentPct=' + p.p_spent_clean);
  else if (p) console.log(k.padEnd(10), 'r30_season(old)=' + p.r30_season, '(no clean maps or <30)');
}
// biggest movers: old resid vs new
const movers = elig.filter(p => p.resid30s != null).map(p => ({ nick: p.nick, d: +(p.resid_clean - p.resid30s).toFixed(3), old: p.resid30s, nw: p.resid_clean })).sort((x, y) => Math.abs(y.d) - Math.abs(x.d));
console.log('--- top movers (resid old->clean) ---');
movers.slice(0, 12).forEach(m => console.log(m.nick.padEnd(12), m.old, '->', m.nw, '(d=' + m.d + ')'));
