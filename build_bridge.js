// Build steam_profile_id -> {player_id, official nickname} from games_player_stats.jsonl
const fs = require('fs');
const path = 'E:/cs2_econ_2026/';
const lines = fs.readFileSync(path + 'games_player_stats.jsonl', 'utf8').split('\n').filter(Boolean);
const map = {};
for (const l of lines) {
  let g; try { g = JSON.parse(l); } catch { continue; }
  for (const r of (g.rows || [])) {
    const sp = r.steam_profile;
    if (sp && sp.player_id && sp.id != null) {
      const pid = sp.player, off = sp.player;
      map[sp.id] = { player_id: sp.player_id, nickname: (off && off.nickname) || sp.nickname, slug: off && off.slug, team_id: off && off.team_id };
    }
  }
}
fs.writeFileSync(path + 'steam_pid_bridge.json', JSON.stringify(map));
console.log('bridge size:', Object.keys(map).length);
// verify keys
for (const k of ['207', '196', '25', '1039', '51876', '17663']) console.log(k, JSON.stringify(map[k]));
// coverage of rounds pids
const rlines = fs.readFileSync(path + 'rounds_all_clean.jsonl', 'utf8').split('\n').filter(Boolean);
const pids = new Set();
for (const l of rlines) { try { const g = JSON.parse(l); if (!g.rounds) continue; for (const r of g.rounds) for (const p of r.players) pids.add(p.pid); } catch { } }
let cov = 0; for (const p of pids) if (map[p]) cov++;
console.log('rounds pids:', pids.size, 'covered:', cov, '(' + (cov / pids.size * 100).toFixed(1) + '%)');
