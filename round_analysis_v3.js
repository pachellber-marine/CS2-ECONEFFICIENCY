// V5: user-requested deep dive
// 1) gave/got matrix by econ tier (who gives/receives in eco vs full)
// 2) Falcons per-series gun economy evolution
// 3) low-econ overperformance index (green leaves who punch up when poor)
const fs = require('fs');
const E = 'E:/cs2_econ_2026/';
const players = new Map(JSON.parse(fs.readFileSync(E + 'players_final_season30.json', 'utf8')).map(p => [p.nick, p]));
const low = s => s.toLowerCase().replace(/[^a-z0-9]/g, '');
const byLow = new Map([...players.keys()].map(k => [low(k), k]));

// per player per econ tier
const agg = new Map();
const A = nick => { if (!agg.has(nick)) agg.set(nick, {
  eco: {R:0,gave:0,got:0,k:0,dmg:0,eq:0,spent:0,wval:0,util:0},
  low: {R:0,gave:0,got:0,k:0,dmg:0,eq:0,spent:0,wval:0,util:0},
  force: {R:0,gave:0,got:0,k:0,dmg:0,eq:0,spent:0,wval:0,util:0},
  full: {R:0,gave:0,got:0,k:0,dmg:0,eq:0,spent:0,wval:0,util:0},
  pistol: {R:0,k:0,dmg:0}}); return agg.get(nick); };
const tierName = p => p.eco === -1 ? 'eco' : p.eco === 0 ? 'low' : p.eco === 1 ? 'force' : 'full';

// series mapping: game_id -> {match_key} from matches_2026_byTeam.json (for_game_ids)
const game2series = new Map();
const matchesByTeam = JSON.parse(fs.readFileSync(E + 'matches_2026_byTeam.json', 'utf8'));
for (const t of matchesByTeam) for (const m of (t.matches || [])) for (const gid of (m.for_game_ids || [])) game2series.set(String(gid), { team: t.team, date: m.match_start_date, enemy: m.enemy_team_name, mid: m.match_id });

// falcons series-level gun econ
const falSeries = new Map(); // mid -> {date, enemy, gaveBy:{}, gotBy:{}, rounds}
let games = 0;
for (const line of fs.readFileSync(E + 'rounds_all.jsonl', 'utf8').split('\n')) {
  if (!line.trim()) continue;
  let g; try { g = JSON.parse(line); } catch (e) { continue; }
  if (!g.rounds) continue;
  games++;
  const ser = game2series.get(String(g.game_id));
  for (const r of g.rounds) for (const p of r.players) {
    const nn = byLow.get(low(p.nick || '')); if (!nn) continue;
    const pr = players.get(nn); const a = A(nn);
    const t = r.round === 1 ? 'pistol' : tierName(p);
    const b = a[t] || a.full;
    if (t !== 'pistol') { b.R++; b.gave += p.gave; b.got += p.got; b.k += p.k; b.dmg += p.dmg; b.eq += p.eq; b.spent += p.spent; b.wval += p.wval; b.util += p.util; }
    else { b.R++; b.k += p.k; b.dmg += p.dmg; }
    // falcons series tracking
    if (pr.mainTeam === 'Falcons' && ser && ser.team === 'Falcons') {
      if (!falSeries.has(ser.mid)) falSeries.set(ser.mid, { date: ser.date, enemy: ser.enemy, byNick: {} });
      const fsr = falSeries.get(ser.mid);
      if (!fsr.byNick[nn]) fsr.byNick[nn] = { gave: 0, got: 0, R: 0, spent: 0 };
      const fb = fsr.byNick[nn];
      fb.gave += p.gave; fb.got += p.got; fb.R++; fb.spent += p.spent;
    }
  }
}
console.log('games processed:', games);

// ==== 1) gave/got by tier, role means ====
console.log('\n=== 1) 发枪/受枪 x 经济档（位置均值, $/回合, 只看该档位回合） ===');
const roleAgg = {};
for (const [nick, a] of agg) {
  const pr = players.get(nick); if (!pr || pr.rounds < 500) continue;
  const k = (pr.pos_role || '?').split('(')[0].trim();
  if (!roleAgg[k]) roleAgg[k] = { n: 0 };
  const r = roleAgg[k]; r.n++;
  for (const t of ['eco', 'low', 'force', 'full']) {
    r[t] = r[t] || { gave: 0, got: 0, R: 0, kprN: 0, kpr: 0 };
    r[t].gave += a[t].gave / Math.max(1, a[t].R); r[t].got += a[t].got / Math.max(1, a[t].R);
    r[t].kpr += a[t].k / Math.max(1, a[t].R); r[t].R += a[t].R;
  }
}
for (const k in roleAgg) { const r = roleAgg[k]; if (r.n < 3) continue;
  console.log(k.padEnd(14), 'n=' + String(r.n).padStart(3));
  for (const t of ['eco', 'low', 'force', 'full']) console.log('   ' + t.padEnd(6), 'gave=$' + Math.round(r[t].gave / r.n).toString().padStart(4), 'got=$' + Math.round(r[t].got / r.n).toString().padStart(4), 'net=' + (Math.round((r[t].gave - r[t].got) / r.n) >= 0 ? '+' : '') + Math.round((r[t].gave - r[t].got) / r.n), 'KPR=' + (r[t].kpr / r.n).toFixed(3), '(rounds ' + Math.round(r[t].R / r.n) + ')');
}

// ==== 2) Falcons per-series ====
console.log('\n=== 2) Falcons 逐系列赛净发枪矩阵（net = gave-got, $/回合） ===');
const sers = [...falSeries.entries()].map(([mid, s]) => ({ mid, ...s, rounds: Math.max(...Object.values(s.byNick).map(x => x.R)) })).sort((a, b) => a.date.localeCompare(b.date));
console.log('series count:', sers.length);
// transpose: for each series print key players net
const keyNicks = ['m0NESY', 'NiKo', 'TeSeS', 'kyousuke', 'karrigan'];
for (const s of sers.slice(-25)) {
  const cells = keyNicks.map(nk => { const b = s.byNick[nk]; if (!b) return nk[0] + ':--'; return nk.slice(0, 3) + ':' + (Math.round((b.gave - b.got) / b.R) >= 0 ? '+' : '') + Math.round((b.gave - b.got) / b.R); });
  console.log(s.date.slice(5, 10), (s.enemy || '').slice(0, 12).padEnd(13), cells.join('  '));
}
// aggregate per player across series: series-by-series variance of TeSeS net
console.log('\nTeSeS 逐系列赛 net（近 15 场）:');
const teSers = sers.filter(s => s.byNick['TeSeS']).slice(-15);
for (const s of teSers) { const b = s.byNick['TeSeS']; console.log('  ', s.date.slice(5, 10), (s.enemy || '').slice(0, 14).padEnd(15), 'net=' + Math.round((b.gave - b.got) / b.R), 'got_r=$' + Math.round(b.got / b.R), 'spent_r=$' + Math.round(b.spent / b.R)); }

fs.writeFileSync(E + 'falcons_series_gunecon.json', JSON.stringify(sers, null, 1));
fs.writeFileSync(E + 'players_tierlevel.json', JSON.stringify([...agg.entries()], null, 1));
console.log('saved.');
