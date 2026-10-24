// fetch all round-level players_stats for all 3610 games of 2026 top20 scope
// output: rounds_all.jsonl {game_id, map, round, rows:[...]}
const fs = require('fs');
const OUT = 'E:/cs2_econ_2026/rounds_all.jsonl';
const GAMEIDS = 'E:/cs2_econ_2026/game_ids_2026.json';
const H = { 'User-Agent': 'Mozilla/5.0' };

(async () => {
  // build game id list
  let ids;
  if (fs.existsSync(GAMEIDS)) {
    ids = JSON.parse(fs.readFileSync(GAMEIDS, 'utf8'));
  } else {
    const set = new Set();
    for (const line of fs.readFileSync('E:/cs2_econ_2026/games_player_stats.jsonl', 'utf8').split('\n')) {
      if (!line.trim()) continue;
      try { set.add(JSON.parse(line).game_id); } catch (e) {}
    }
    ids = [...set];
    fs.writeFileSync(GAMEIDS, JSON.stringify(ids));
  }
  console.log('total games:', ids.length);
  // resume: done set from output
  const done = new Set();
  if (fs.existsSync(OUT)) {
    for (const line of fs.readFileSync(OUT, 'utf8').split('\n')) {
      if (line.trim()) { try { done.add(JSON.parse(line).game_id); } catch (e) {} }
    }
  }
  console.log('already done:', done.size);
  const todo = ids.filter(id => !done.has(id));
  console.log('todo:', todo.length);

  const stream = fs.createWriteStream(OUT, { flags: 'a' });
  let cursor = 0, okCount = done.size, errCount = 0;
  const CONC = 15;
  const t0 = Date.now();

  async function fetchJson(url) {
    for (let a = 0; a < 5; a++) {
      try {
        const r = await fetch(url, { headers: H });
        if (r.status === 429) { await new Promise(s => setTimeout(s, 5000 * (a + 1))); continue; }
        if (r.status === 404) return null;
        if (!r.ok) { await new Promise(s => setTimeout(s, 1000)); continue; }
        return await r.json();
      } catch (e) { await new Promise(s => setTimeout(s, 800)); }
    }
    throw new Error('fail ' + url);
  }

  async function processGame(id) {
    const meta = await fetchJson('https://api.bo3.gg/api/v1/games/' + id);
    if (!meta || !Array.isArray(meta.game_rounds)) { stream.write(JSON.stringify({ game_id: id, empty: true }) + '\n'); return; }
    const map = meta.map_name;
    const roundIds = meta.game_rounds.map(r => ({ rn: r.round_number, rid: r.id }));
    const rows = await Promise.all(roundIds.map(({ rn, rid }) =>
      fetchJson(`https://api.bo3.gg/api/v1/games/${id}/rounds/${rn}/players_stats`).then(rs => ({ rn, rs }))
    ));
    const out = { game_id: id, map, rounds: [] };
    for (const { rn, rs } of rows) {
      if (Array.isArray(rs)) out.rounds.push({ round: rn, players: rs.map(p => ({
        pid: p.steam_profile_id, nick: p.steam_profile && p.steam_profile.nickname ? p.steam_profile.nickname : (p.steam_profile ? p.steam_profile.slug : p.clan_name),
        clan: p.clan_name, side: p.team_side, win: p.win,
        spent: p.money_spent, eq: p.total_equipment_value, wval: p.weapons_value, pval: p.pistols_value,
        util: p.utility_value, add: p.additional_value, save: p.money_save,
        gave: p.drops_gave_value, got: p.drops_got_value,
        eco: p.economy_level, eeco: p.enemy_economy_level,
        k: p.kills, d: p.death, fk: p.first_kills, fd: p.first_death, dmg: p.damage,
        fa: p.flash_assists, shots: p.shots, hits: p.hits,
      })) });
    }
    stream.write(JSON.stringify(out) + '\n');
    okCount++;
  }

  async function worker() {
    while (cursor < todo.length) {
      const i = cursor++;
      try { await processGame(todo[i]); } catch (e) { errCount++; stream.write(JSON.stringify({ game_id: todo[i], error: 1 }) + '\n'); }
      if ((i + 1) % 100 === 0) {
        const el = (Date.now() - t0) / 1000;
        console.log(`progress ${i + 1}/${todo.length} ok=${okCount} err=${errCount} ${(el / (i + 1)).toFixed(2)}s/game eta=${((el / (i + 1)) * (todo.length - i - 1) / 60).toFixed(0)}min`);
      }
    }
  }
  await Promise.all(Array.from({ length: CONC }, worker));
  stream.end();
  console.log('DONE ok=' + okCount, 'err=' + errCount);
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
