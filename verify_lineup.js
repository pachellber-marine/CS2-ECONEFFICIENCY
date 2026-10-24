// verify_lineup.js — 1) what does clan actually contain on Falcons games; 2) who actually played for Falcons in 2026 (by month)
const fs = require('fs');
const E = 'E:/cs2_econ_2026/';
const WANTED = new Set(['Falcons', 'Team Falcons', 'falcons']);
const seen = new Map(); // clan -> count (rows in games where a Falcons player appeared)
const monthNick = {}; // month -> Set(nick) for players whose clan is Falcons
const clansPerNick = {};
for (const line of fs.readFileSync(E + 'rounds_all.jsonl', 'utf8').split('\n')) {
  if (!line.trim()) continue;
  let g; try { g = JSON.parse(line); } catch (e) { continue; }
  if (!g.rounds) continue;
  // month from game id order won't work; use g fields? check if g has date... skip date, use game index via match_ids? simpler: not needed for clan check
  let hasFal = false;
  for (const r of g.rounds) for (const p of r.players) if (WANTED.has(p.clan)) hasFal = true;
  if (!hasFal) continue;
  for (const r of g.rounds) for (const p of r.players) {
    seen.set(p.clan, (seen.get(p.clan) || 0) + 1);
    if (WANTED.has(p.clan)) {
      (monthNick['all'] = monthNick['all'] || new Set()).add(p.nick);
      clansPerNick[p.nick] = clansPerNick[p.nick] || new Set();
      clansPerNick[p.nick].add(p.clan);
    }
  }
}
console.log('=== clans appearing in games that contain a Falcons-labeled player (row counts, top 25) ===');
[...seen.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25).forEach(([c, n]) => console.log(' ', c.padEnd(22), n));
console.log('\n=== players ever labeled clan=Falcons/Team Falcons ===');
console.log([...monthNick['all']].join(', '));
console.log('\n=== multiple-clan players (label inconsistency) ===');
for (const [nick, cs] of Object.entries(clansPerNick)) if (cs.size > 1) console.log(' ', nick, [...cs].join(' | '));
