// Final rebuild of rounds data: official player_id + official nickname, purged games
const fs = require('fs');
const path = 'E:/cs2_econ_2026/';
const bridge = require(path + 'steam_pid_bridge.json');
const lines = fs.readFileSync(path + 'rounds_all_clean.jsonl', 'utf8').split('\n').filter(Boolean);
const out = [];
let ren = 0;
for (const l of lines) {
  let g; try { g = JSON.parse(l); } catch { continue; }
  if (!g.rounds) continue;
  for (const r of g.rounds) for (const p of r.players) {
    const b = bridge[p.pid];
    if (b) {
      if (p.nick !== b.nickname) ren++;
      p.spid = p.pid;              // keep steam_profile_id for provenance
      p.pid = b.player_id;         // official bo3.gg player id
      p.nick = b.nickname;         // official nickname (NOT Steam name)
      p.team_id = b.team_id;
      delete p.nick_old;
    }
  }
  out.push(JSON.stringify(g));
}
fs.writeFileSync(path + 'rounds_all_final.jsonl', out.join('\n'));
console.log('games:', out.length, 'players renamed to official:', ren);
// sanity: Falcons five
const seen = new Map();
for (const l of out.slice(0, 500)) { const g = JSON.parse(l); for (const r of g.rounds) for (const p of r.players) if (!seen.has(p.pid)) seen.set(p.pid, p.nick); }
console.log('sample distinct pids in first 500 games:', seen.size);
