// feed_matrix_v2.js — Falcons internal feeding matrix, both sides filtered, CEMEN_BAKIN=kyousuke, Nucleonz excluded (sub)
const fs = require('fs');
const E = 'E:/cs2_econ_2026/';
const CLANS = new Set(['Falcons', 'Team Falcons']);
const RENAME = { CEMEN_BAKIN: 'kyousuke' };
const CORE = new Set(['m0NESY', 'NiKo', 'TeSeS', 'karrigan', 'kyousuke']); // 2026 Falcons core (kyxsan left in Apr, tracked separately)
const matrix = {}; // giverNick -> receiverNick -> {n,val}
const gotTotal = {}, gaveTotal = {};
let flGames = 0, rows = 0, crossClanGot = 0;
for (const line of fs.readFileSync(E + 'rounds_all.jsonl', 'utf8').split('\n')) {
  if (!line.trim()) continue;
  let g; try { g = JSON.parse(line); } catch (e) { continue; }
  if (!g.rounds) continue;
  for (const r of g.rounds) {
    const byClan = {};
    for (const p of r.players) (byClan[p.clan] = byClan[p.clan] || []).push(p);
    if (!CLANS.has(Object.keys(byClan).find(c => CLANS.has(c)) || '')) continue;
    flGames++;
    const fal = (byClan['Falcons'] || []).concat(byClan['Team Falcons'] || []);
    for (const p of fal) { const nk = RENAME[p.nick] || p.nick; gotTotal[nk] = (gotTotal[nk] || 0) + p.got; gaveTotal[nk] = (gaveTotal[nk] || 0) + p.gave; rows++; }
    for (const q of fal.filter(p => p.got > 0)) {
      const qn = RENAME[q.nick] || q.nick;
      // giver must be a same-clan Falcons player
      const giver = fal.find(p => p.nick !== q.nick && p.gave > 0 && Math.abs(p.gave - q.got) <= 50);
      if (!giver) { crossClanGot += q.got; continue; }
      const gn = RENAME[giver.nick] || giver.nick;
      matrix[gn] = matrix[gn] || {};
      matrix[gn][qn] = matrix[gn][qn] || { n: 0, val: 0 };
      matrix[gn][qn].n++; matrix[gn][qn].val += q.got;
    }
  }
}
const cols = ['m0NESY', 'NiKo', 'TeSeS', 'karrigan', 'kyousuke'];
console.log('Falcons rows:', rows, 'games(played-rounds):', flGames);
console.log('=== 修正版 Falcons 投喂矩阵（giver/receiver 双过滤，$）===');
console.log('from\\to'.padEnd(12), ...cols.map(c => c.padStart(10)));
for (const gk of Object.keys(matrix).sort()) {
  console.log(gk.padEnd(12), ...cols.map(c => matrix[gk][c] ? String(matrix[gk][c].val).padStart(10) : '·'.padStart(10)));
}
console.log('\n=== 每人收/给/净额（含未匹配=战场拾取）===');
for (const nk of cols) console.log(nk.padEnd(10), 'got=$' + String(gotTotal[nk] || 0).padStart(8), 'gave=$' + String(gaveTotal[nk] || 0).padStart(8), 'net=$' + String((gotTotal[nk] || 0) - (gaveTotal[nk] || 0)).padStart(8));
console.log('unmatched got (pickups): $' + crossClanGot);
fs.writeFileSync(E + 'falcons_feed_matrix_v2.json', JSON.stringify({ matrix, gotTotal, gaveTotal, crossClanGot }, null, 1));
