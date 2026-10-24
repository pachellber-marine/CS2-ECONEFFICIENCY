// ANALYSIS: green-leaf (绿叶) index from 2026 ever-top20 player aggregates
const fs = require('fs');
const path = require('path');
const rows = JSON.parse(fs.readFileSync(path.join(__dirname, 'stats_list_2026_byTeam.json'), 'utf8'));

// merge multi-team players by nickname (weight by rounds)
const byNick = new Map();
for (const r of rows) {
  const k = r.player.nickname;
  if (!byNick.has(k)) byNick.set(k, []);
  byNick.get(k).push(r);
}
const players = [];
for (const [nick, list] of byNick) {
  const totalRounds = list.reduce((s, r) => s + r.rounds_count, 0);
  const wsum = (f) => list.reduce((s, r) => s + (r[f] || 0) * r.rounds_count, 0) / totalRounds;
  players.push({
    nick,
    teams: list.map(r => r.hltv_team).join('+'),
    mainTeam: list.sort((a, b) => b.rounds_count - a.rounds_count)[0].hltv_team,
    maps: list.reduce((s, r) => s + r.games_count, 0),
    rounds: totalRounds,
    spent: wsum('avg_spent'),
    saved: wsum('avg_saved'),
    equip: wsum('avg_total_equipment_value'),
    killCost: wsum('avg_kill_cost'),
    dmgCost: wsum('avg_hundred_damage_cost'),
    kills: wsum('avg_kills'),
    deaths: wsum('avg_death'),
    rating: wsum('avg_player_rating'),
    fk: wsum('avg_first_kills'),
    fd: wsum('avg_first_death'),
    kast: wsum('avg_kast'),
    dmg: wsum('avg_damage'),
    assists: wsum('avg_assists'),
    multikills: wsum('avg_multikills'),
  });
}
// filter: meaningful sample (>=30 maps)
const sample = players.filter(p => p.maps >= 30);
console.log('players total:', players.length, 'with >=30 maps:', sample.length);

const pct = (arr, v) => {
  const a = [...arr].sort((x, y) => x - y);
  let lo = 0; while (lo < a.length && a[lo] < v) lo++;
  return (lo / a.length * 100);
};
const spentArr = sample.map(p => p.spent);
const ratingArr = sample.map(p => p.rating);
const costEff = sample.map(p => p.killCost);

// econ-efficiency: rating per 1000$ spent
for (const p of sample) p.eff = p.rating / (p.spent / 1000);
const effArr = sample.map(p => p.eff);

const show = (p) => ({
  nick: p.nick, team: p.mainTeam, maps: p.maps,
  spent: +p.spent.toFixed(0), rating: +p.rating.toFixed(2),
  eff: +p.eff.toFixed(2), killCost: +p.killCost.toFixed(0),
  fk: +p.fk.toFixed(3), fd: +p.fd.toFixed(3), fk_m: +(p.fk - p.fd).toFixed(3),
  spentPct: +pct(spentArr, p.spent).toFixed(1),
  effPct: +pct(effArr, p.eff).toFixed(1),
});

const teses = sample.find(p => p.nick === 'TeSeS');
console.log('\n=== TeSeS ===');
console.log(JSON.stringify(show(teses), null, 1));

console.log('\n=== top10 spenders ===');
[...sample].sort((a, b) => b.spent - a.spent).slice(0, 10).forEach(p => console.log(JSON.stringify(show(p))));
console.log('\n=== top10 lowest spend (>=30 maps) ===');
[...sample].sort((a, b) => a.spent - b.spent).slice(0, 10).forEach(p => console.log(JSON.stringify(show(p))));
console.log('\n=== top10 efficiency (rating per 1k spent) ===');
[...sample].sort((a, b) => b.eff - a.eff).slice(0, 10).forEach(p => console.log(JSON.stringify(show(p))));
console.log('\n=== bottom5 efficiency ===');
[...sample].sort((a, b) => a.eff - b.eff).slice(0, 5).forEach(p => console.log(JSON.stringify(show(p))));

fs.writeFileSync(path.join(__dirname, 'players_merged.json'), JSON.stringify(players, null, 1));
