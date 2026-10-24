// Marginal analysis: dRating/dSpent (slope) + elasticity, per player and per role
// Approach: per player, OLS slope of rating30 (per-map) on map-level avg spent proxy.
// We don't have per-map spent in match_r30 (map-level rating only). Use ROUND-level data:
// per round player: spent (cash) and a round-level "output" — kills/dmg normalized per round.
// Better: per-player-per-economy-tier KPR (already have players_tierlevel.json) gives
// discrete derivative: (KPR_full - KPR_eco) / ($full - $eco) = marginal kills per dollar.
// Elasticity: (ΔKPR/KPR_mid) / (Δspent/spent_mid).
// We also fit continuous OLS per player on rounds_all: dmg ~ spent (round-level rows).
const fs = require('fs');
const path = 'E:/cs2_econ_2026/';
const lines = fs.readFileSync(path + 'rounds_all.jsonl', 'utf8').split('\n');
const TIER = { '-1': 'eco', '0': 'low', '1': 'force', '2': 'full' };
const agg = new Map(); // pid -> {tiers:{eco:{n,k,spent},...}, xs:[], ys:[]}
let bad = 0;
for (const ln of lines) {
  if (!ln) continue;
  let g; try { g = JSON.parse(ln); } catch { bad++; continue; }
  if (!g.rounds) continue;
  for (const r of g.rounds) for (const p of r.players) {
    const t = TIER[p.eco];
    if (t === undefined) continue;
    let a = agg.get(p.pid);
    if (!a) { a = { nick: p.nick, clan: p.clan, tiers: {}, pts: [] }; agg.set(p.pid, a); }
    let s = a.tiers[t];
    if (!s) s = a.tiers[t] = { n: 0, k: 0, spent: 0, dmg: 0 };
    s.n++; s.k += p.k || 0; s.spent += p.spent || 0; s.dmg += p.dmg || 0;
    if (a.pts.length < 3000) a.pts.push([p.spent || 0, (p.k || 0) + (p.dmg || 0) / 100]); // proxy output
  }
}
console.log('players in round data:', agg.size, 'bad lines:', bad);

function ols(pts) {
  const n = pts.length; if (n < 200) return null;
  let sx = 0, sy = 0, sxx = 0, sxy = 0;
  for (const [x, y] of pts) { sx += x; sy += y; sxx += x * x; sxy += x * y; }
  const cov = sxy / n - (sx / n) * (sy / n), varx = sxx / n - (sx / n) ** 2;
  if (varx <= 0) return null;
  const b = cov / varx, a = sy / n - b * (sx / n);
  return { slope: b, intercept: a, n };
}

const out = [];
for (const [pid, a] of agg) {
  const T = a.tiers;
  const eco = T.eco, full = T.full;
  if (!eco || !full || eco.n < 150 || full.n < 400) continue;
  const kprE = eco.k / eco.n, kprF = full.k / full.n;
  const spE = eco.spent / eco.n, spF = full.spent / full.n;
  const dSp = spF - spE, dK = kprF - kprE;
  if (dSp <= 0) continue;
  const marginal = dK / dSp; // kills per extra $
  const elasticity = marginal * ((spE + spF) / 2) / ((kprE + kprF) / 2);
  const fit = ols(a.pts);
  out.push({ pid, nick: a.nick, team: a.clan, kprEco: +kprE.toFixed(3), kprFull: +kprF.toFixed(3), spendEco: Math.round(spE), spendFull: Math.round(spF), marginalKPD: +marginal.toFixed(6), elasticity: +elasticity.toFixed(3), olsSlope: fit ? +fit.slope.toFixed(7) : null });
}
out.sort((x, y) => y.elasticity - x.elasticity);
fs.writeFileSync(path + 'players_marginal.json', JSON.stringify(out, null, 1));
console.log('players with marginal stats:', out.length);
console.log('--- TOP elasticity (每多花$1换更多产出, 相对弹性) ---');
out.slice(0, 15).forEach((r, i) => console.log((i + 1) + '. ' + r.nick + ' (' + r.team + ') ela=' + r.elasticity + ' margK/$=' + (r.marginalKPD * 1000).toFixed(2) + '/k$'));
console.log('--- BOTTOM elasticity ---');
out.slice(-15).reverse().forEach((r, i) => console.log((i + 1) + '. ' + r.nick + ' (' + r.team + ') ela=' + r.elasticity + ' margK/$=' + (r.marginalKPD * 1000).toFixed(2) + '/k$'));
