// league_feed_v2.js — team-internal feeding networks, ENEMY & PICKUPS EXCLUDED (strict)
// For every team (by clan), same-round equal-amount gave->got matching INSIDE clan only.
// Output per player: intra got/gave, plus per-team matrix for top10.
const fs = require('fs');
const E = 'E:/cs2_econ_2026/';
const RENAME = { CEMEN_BAKIN: 'kyousuke', Nucleonz: 'flamie(sub)' };
const TOP10 = new Set(['Team Spirit', 'Spirit', 'Team Vitality', 'Vitality', 'FURIA', 'MOUZ', 'Aurora Gaming', 'Aurora', 'Falcons', 'Team Falcons', 'Legacy', 'G2 Esports', 'G2', 'BetBoom', 'BetBoom Team', 'BETBOOM', 'FUT Esports', 'FUT']);
// map clan -> canonical team name
const CANON = { 'Team Spirit': 'Spirit', Spirit: 'Spirit', 'Team Vitality': 'Vitality', Vitality: 'Vitality', FURIA: 'FURIA', MOUZ: 'MOUZ', 'Aurora Gaming': 'Aurora', Aurora: 'Aurora', Falcons: 'Falcons', 'Team Falcons': 'Falcons', Legacy: 'Legacy', 'G2 Esports': 'G2', G2: 'G2', BetBoom: 'BETBOOM', 'BetBoom Team': 'BETBOOM', BETBOOM: 'BETBOOM', 'FUT Esports': 'FUT', FUT: 'FUT' };
const intra = new Map(); // team -> nick -> {got, gave, R, gotN, gaveN}
const teamMatrix = new Map(); // team -> giver->receiver->val (top10 only)
for (const line of fs.readFileSync(E + 'rounds_all.jsonl', 'utf8').split('\n')) {
  if (!line.trim()) continue;
  let g; try { g = JSON.parse(line); } catch (e) { continue; }
  if (!g.rounds) continue;
  for (const r of g.rounds) {
    const byClan = {};
    for (const p of r.players) (byClan[p.clan] = byClan[p.clan] || []).push(p);
    for (const clan in byClan) {
      const ps = byClan[clan]; if (ps.length < 2 || ps.length > 5) continue;
      const team = CANON[clan];
      const key = team || clan;
      const givers = ps.filter(p => p.gave > 0), getters = ps.filter(p => p.got > 0);
      if (!intra.has(key)) intra.set(key, new Map());
      for (const p of ps) {
        const nk = RENAME[p.nick] || p.nick;
        const o = intra.get(key).get(nk) || (intra.get(key).set(nk, { got: 0, gave: 0, R: 0, gotN: 0, gaveN: 0 }), intra.get(key).get(nk));
        o.R++; o.got += p.got; o.gave += p.gave; if (p.got > 0) o.gotN++; if (p.gave > 0) o.gaveN++;
      }
      // strict intra-clan matching
      if (team && TOP10.has(clan)) {
        if (!teamMatrix.has(team)) teamMatrix.set(team, {});
        const M = teamMatrix.get(team);
        const used = new Set();
        for (const q of getters) {
          const qn = RENAME[q.nick] || q.nick;
          const giver = givers.find(p => p.nick !== q.nick && !used.has(p) && Math.abs(p.gave - q.got) <= 50);
          if (!giver) continue; // pickup or from enemy: EXCLUDED
          used.add(giver);
          const gn = RENAME[giver.nick] || giver.nick;
          M[gn] = M[gn] || {}; M[gn][qn] = (M[gn][qn] || 0) + q.got;
        }
      }
    }
  }
}
// per-player league table: intra got/r, gave/r, and got share of team
const rows = [];
for (const [team, nicks] of intra) {
  let teamGot = 0, teamGave = 0;
  for (const [, o] of nicks) { teamGot += o.got; teamGave += o.gave; }
  for (const [nick, o] of nicks) {
    if (o.R < 800) continue;
    rows.push({ team, nick, R: o.R, gotR: +(o.got / o.R).toFixed(1), gaveR: +(o.gave / o.R).toFixed(1), net: +((o.got - o.gave) / o.R).toFixed(1), gotShare: +(100 * o.got / Math.max(1, teamGot)).toFixed(1), gotFreq: +(100 * o.gotN / o.R).toFixed(1) });
  }
}
rows.sort((a, b) => b.gotR - a.gotR);
console.log('=== 全联盟队内投喂榜（纯队内等额匹配，敌方+拾取已剔除）TOP20 接收 ===');
for (const r of rows.slice(0, 20)) console.log(r.nick.padEnd(12), r.team.padEnd(11), 'got=$' + String(r.gotR).padStart(5) + '/r', 'gave=$' + String(r.gaveR).padStart(5) + '/r', 'net=$' + String(r.net).padStart(6), '队内got份额=' + r.gotShare + '%', '频次=' + r.gotFreq + '%');
console.log('\n=== TOP20 净输出（喂枪方）===');
[...rows].sort((a, b) => a.net - b.net).slice(0, 20).forEach(r => console.log(r.nick.padEnd(12), r.team.padEnd(11), 'net=$' + String(r.net).padStart(7), 'gave=$' + String(r.gaveR).padStart(5) + '/r', 'got=$' + String(r.gotR).padStart(5) + '/r'));
// top10 matrices
for (const t of ['Falcons', 'Spirit', 'Vitality']) {
  const M = teamMatrix.get(t); if (!M) continue;
  const nicks = [...new Set(Object.values(M).flatMap(o => Object.keys(o)).concat(Object.keys(M)))];
  console.log('\n=== ' + t + ' 队内纯投喂矩阵（$，敌方/拾取剔除）===');
  console.log('from\\to'.padEnd(12), ...nicks.map(c => c.slice(0, 9).padStart(10)));
  for (const gk of Object.keys(M).sort()) console.log(gk.padEnd(12), ...nicks.map(c => M[gk][c] ? String(M[gk][c]).padStart(10) : '·'.padStart(10)));
}
fs.writeFileSync(E + 'league_feed_intra.json', JSON.stringify({ rows: rows.slice(0, 200), matrices: Object.fromEntries([...teamMatrix].map(([k, v]) => [k, v])) }, null, 1));
console.log('\nsaved league_feed_intra.json');
