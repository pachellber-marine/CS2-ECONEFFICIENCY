// MAIN DOWNLOAD: per-team player season aggregates from bo3.gg stats_list
const fs = require('fs');
const path = require('path');
const {matched} = JSON.parse(fs.readFileSync(path.join(__dirname, 'team_id_map.json'), 'utf8'));
const out = [];
async function main() {
  let i = 0;
  for (const [hltvName, t] of Object.entries(matched)) {
    i++;
    const u = new URLSearchParams();
    u.set('filter[game_begin_at][gt]', '2026-01-01');
    u.set('filter[team_id][eq]', String(t.id));
    u.set('page[limit]', '300');
    u.set('page[offset]', '0');
    u.set('min_games_count', '1');
    let ok = false, tries = 0;
    while (!ok && tries < 4) {
      tries++;
      try {
        const r = await fetch('https://api.bo3.gg/api/v1/players/stats_list?' + u.toString(), {headers: {'user-agent': 'Mozilla/5.0'}});
        if (r.status === 429) { await new Promise(s => setTimeout(s, 5000)); continue; }
        const j = await r.json();
        const rows = j.results || [];
        console.log(`${i}/34 ${hltvName} (bo3#${t.id}) -> ${rows.length} players, total=${j.total ? j.total.count : '?'}`);
        for (const row of rows) {
          out.push({hltv_team: hltvName, bo3_team: {id: t.id, slug: t.slug, name: t.name},
            player: {id: row.player.id, nickname: row.player.nickname, slug: row.player.slug, role: row.player.role},
            games_count: row.games_count, rounds_count: row.rounds_count,
            avg_spent: row.avg_spent, avg_saved: row.avg_saved, avg_total_equipment_value: row.avg_total_equipment_value,
            avg_kill_cost: row.avg_kill_cost, avg_hundred_damage_cost: row.avg_hundred_damage_cost,
            avg_kills: row.avg_kills, avg_death: row.avg_death, avg_damage: row.avg_damage,
            avg_kd_rate: row.avg_kd_rate, avg_first_kills: row.avg_first_kills, avg_first_death: row.avg_first_death,
            avg_trade_kills: row.avg_trade_kills, avg_trade_death: row.avg_trade_death,
            avg_player_rating: row.avg_player_rating, avg_kast: row.avg_kast, avg_assists: row.avg_assists,
            avg_multikills: row.avg_multikills, avg_flash_assists: row.avg_flash_assists,
            clutches_vs_1: row.clutches_vs_1, multikills_vs_2: row.multikills_vs_2,
            multikills_vs_3: row.multikills_vs_3, multikills_vs_4: row.multikills_vs_4,
            rounds_winrate: row.rounds_winrate});
        }
        ok = true;
      } catch (e) { console.log('retry', hltvName, e.message); await new Promise(s => setTimeout(s, 3000)); }
    }
    if (!ok) console.log('FAILED', hltvName);
    await new Promise(s => setTimeout(s, 700));
  }
  fs.writeFileSync(path.join(__dirname, 'stats_list_2026_byTeam.json'), JSON.stringify(out, null, 1));
  const players = new Set(out.map(r => r.player.nickname));
  console.log('DONE rows:', out.length, 'unique players:', players.size);
}
main();
