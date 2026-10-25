// Rebuild rounds_all: (1) drop non-official games (1win Private Club etc via tournament),
// (2) replace Steam nicknames with official bo3.gg nicknames by pid.
const fs = require('fs');
const path = 'E:/cs2_econ_2026/';
const canon = JSON.parse(fs.readFileSync(path + 'bo3_pid_canon_full.json', 'utf8'));
const mbt = require(path + 'matches_2026_byTeam.json');
const BAD_T = /in house|private|showmatch/i;
const badGames = new Set();
for (const t of mbt) for (const m of t.matches) if (BAD_T.test(m.tournament_slug || '')) for (const g of (m.for_game_ids || [])) badGames.add(g);
console.log('bad games:', badGames.size);
const lines = fs.readFileSync(path + 'rounds_all.jsonl', 'utf8').split('\n').filter(Boolean);
let kept = 0, dropped = 0, renamed = 0, out = [];
for (const l of lines) {
  let g; try { g = JSON.parse(l); } catch { continue; }
  if (badGames.has(g.game_id)) { dropped++; continue; }
  if (g.rounds) for (const r of g.rounds) for (const p of r.players) {
    const c = canon[p.pid];
    if (c && p.nick !== c) { p.nick_old = p.nick; p.nick = c; renamed++; }
  }
  out.push(JSON.stringify(g)); kept++;
}
fs.writeFileSync(path + 'rounds_all_clean.jsonl', out.join('\n'));
console.log('kept games:', kept, 'dropped:', dropped, 'players renamed:', renamed);
