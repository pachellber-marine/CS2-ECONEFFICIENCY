// Re-run key round-level analyses on rounds_all_final.jsonl (official ids, purged games)
// Output: comparison of key aggregates old vs new
const fs = require('fs');
const path = 'E:/cs2_econ_2026/';
const lines = fs.readFileSync(path + 'rounds_all_final.jsonl', 'utf8').split('\n').filter(Boolean);
const TIER = { '-1': 'eco', '0': 'low', '1': 'force', '2': 'full' };

// Falcons five (official player ids)
const FAL = { 17522: 'NiKo', 17524: 'karrigan', 23037: 'TeSeS', 25998: 'm0NESY', 51876: 'kyousuke' };

const agg = new Map(); // pid -> {nick, n, got, gave, save, util, tiers:{}}
const falcons = new Map(); // from -> to -> $
for (const l of lines) {
  let g; try { g = JSON.parse(l); } catch { continue; }
  if (!g.rounds) continue;
  for (const r of g.rounds) {
    // group players by side for intra-team transfer
    const bySide = {};
    for (const p of r.players) (bySide[p.side] = bySide[p.side] || []).push(p);
    for (const p of r.players) {
      let a = agg.get(p.pid);
      if (!a) { a = { nick: p.nick, n: 0, got: 0, gave: 0, save: 0, util: 0, tiers: {} }; agg.set(p.pid, a); }
      a.n++; a.got += p.got || 0; a.gave += p.gave || 0; a.save += p.save || 0; a.util += p.util || 0;
      const t = TIER[p.eco];
      if (t) { const s = a.tiers[t] = a.tiers[t] || { n: 0, k: 0 }; s.n++; s.k += p.k || 0; }
      // falcons feed matrix
      if (FAL[p.pid] && (p.got || 0) > 0) {
        // find givers on same side same round
        for (const q of (bySide[p.side] || [])) {
          if (q.pid !== p.pid && (q.gave || 0) > 0) {
            const gk = FAL[q.pid];
            if (gk) {
              const key = gk + '->' + FAL[p.pid];
              falcons.set(key, (falcons.get(key) || 0) + Math.min(q.gave, p.got));
            }
          }
        }
      }
    }
  }
}
const res = [];
for (const [pid, a] of agg) {
  const t = a.tiers;
  const r = { pid, nick: a.nick, n: a.n, got: +(a.got / a.n).toFixed(1), gave: +(a.gave / a.n).toFixed(1), util: +(a.util / a.n).toFixed(1) };
  if (t.eco && t.full && t.eco.n >= 150 && t.full.n >= 400) {
    r.kprEco = +(t.eco.k / t.eco.n).toFixed(3); r.kprFull = +(t.full.k / t.full.n).toFixed(3);
    r.rel = +(r.kprEco / r.kprFull).toFixed(3);
  }
  res.push(r);
}
fs.writeFileSync(path + 'roundlevel_final.json', JSON.stringify(res));
console.log('players:', res.length);
console.log('--- Falcons intra-team feed matrix (purged, official ids) ---');
const ent = [...falcons.entries()].sort((a, b) => b[1] - a[1]);
for (const [k, v] of ent) console.log(k + ': $' + Math.round(v).toLocaleString());
console.log('--- key players got/util (vs old Steam-name based) ---');
for (const nick of ['TeSeS', 'm0NESY', 'NiKo', 'karrigan', 'kyousuke', 'mezii', 'b1t', 'donk', 'ZywOo', 'sh1ro', 'apEX']) {
  const r = res.find(x => x.nick === nick);
  if (r) console.log(nick + ': got $' + r.got + '/r gave $' + r.gave + '/r util $' + r.util + '/r' + (r.rel ? ' kprEco ' + r.kprEco + ' kprFull ' + r.kprFull + ' rel ' + r.rel : ''));
}
