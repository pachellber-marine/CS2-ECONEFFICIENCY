// feed_matrix.js — Falcons internal AWP/weapon feeding matrix (who gave to whom, verified by same-round same-clan gave→got matching)
const fs = require('fs');
const E = 'E:/cs2_econ_2026/';
const FALCONS = new Set(['m0NESY', 'NiKo', 'TeSeS', 'karrigan', 'kyousuke', 'kyxsan']);
// NOTE: kyousuke left; Falcons 2026: m0NESY/NiKo/TeSeS/karrigan + kyousuke(earlier). clan check: any Falcons game.
const matrix = {}; // giver -> receiver -> {n, val}
const rob = {}; // receiver -> total got
for (const line of fs.readFileSync(E + 'rounds_all.jsonl', 'utf8').split('\n')) {
  if (!line.trim()) continue;
  let g; try { g = JSON.parse(line); } catch (e) { continue; }
  if (!g.rounds) continue;
  for (const r of g.rounds) {
    const byClan = {};
    for (const p of r.players) (byClan[p.clan] = byClan[p.clan] || []).push(p);
    for (const c in byClan) {
      const ps = byClan[c];
      if (!ps.some(p => FALCONS.has(p.nick))) continue; // Falcons game only
      const givers = ps.filter(p => p.gave > 0), getters = ps.filter(p => p.got > 0);
      for (const q of getters) {
        if (!FALCONS.has(q.nick)) continue;
        rob[q.nick] = (rob[q.nick] || 0) + q.got;
        // find giver(s) in same clan with gave>=q.got-50
        const cands = givers.filter(p => p.nick !== q.nick && Math.abs(p.gave - q.got) <= 50);
        const giver = cands[0];
        const gk = giver ? giver.nick : '捡敌人/不明';
        matrix[gk] = matrix[gk] || {};
        matrix[gk][q.nick] = matrix[gk][q.nick] || { n: 0, val: 0 };
        matrix[gk][q.nick].n++; matrix[gk][q.nick].val += q.got;
      }
    }
  }
}
console.log('=== Falcons 投喂矩阵（同回合等额 gave→got 匹配，$总额）===');
console.log('from\\to'.padEnd(16), 'm0NESY'.padStart(10), 'NiKo'.padStart(9), 'TeSeS'.padStart(9), 'karrigan'.padStart(9), 'kyousuke'.padStart(9));
for (const gk of Object.keys(matrix).sort()) {
  const row = matrix[gk];
  console.log(gk.padEnd(16), ...['m0NESY', 'NiKo', 'TeSeS', 'karrigan', 'kyousuke'].map(t => String(row[t] ? row[t].val : '·').padStart(9)));
}
console.log('\nreceiver totals (incl enemy pickups unmatched):');
for (const [k, v] of Object.entries(rob).sort((a, b) => b - a)) console.log(' ', k, '$' + v);
fs.writeFileSync(E + 'falcons_feed_matrix.json', JSON.stringify(matrix, null, 1));
