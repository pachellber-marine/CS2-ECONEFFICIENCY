// Income decomposition: self-saved (save) vs system (kill+round bonus) vs teammate drops (got)
// Plus role-relative classification for top-10 teams
const fs = require('fs');
const E = 'E:/cs2_econ_2026/';
const players = new Map(JSON.parse(fs.readFileSync(E + 'players_final_season30.json', 'utf8')).map(p => [p.nick, p]));
const low = s => s.toLowerCase().replace(/[^a-z0-9]/g, '');
const byLow = new Map([...players.keys()].map(k => [low(k), k]));

const A = new Map();
const acc = nick => { if (!A.has(nick)) A.set(nick, { R: 0, save: 0, got: 0, gave: 0, spent: 0, k: 0, sys: 0, saveFull: 0, RFull: 0, diedR: 0 }); return A.get(nick); };

// team-level loss-bonus needs win sequence per game per side; track in first pass per game
let games = 0;
for (const line of fs.readFileSync(E + 'rounds_all.jsonl', 'utf8').split('\n')) {
  if (!line.trim()) continue;
  let g; try { g = JSON.parse(line); } catch (e) { continue; }
  if (!g.rounds) continue;
  games++;
  // compute per-round round bonus by clan+side with loss streak
  const streak = {};
  for (const r of g.rounds) {
    // team round results
    const teams = {};
    for (const p of r.players) { const key = p.clan; if (!teams[key]) teams[key] = { side: p.side, win: p.win }; }
    for (const key in teams) {
      const stKey = key + teams[key].side;
      const won = teams[key].win === 1;
      if (won) streak[stKey] = 0; else streak[stKey] = (streak[stKey] || 0) + 1;
      teams[key].bonus = won ? 3250 : Math.min(3400, 1400 + 500 * ((streak[stKey] || 1) - 1));
    }
    for (const p of r.players) {
      const nn = byLow.get(low(p.nick || '')); if (!nn) continue;
      const a = acc(nn);
      a.R++;
      a.save += p.save; a.got += p.got; a.gave += p.gave; a.spent += p.spent; a.k += p.k;
      if (p.d === 1) a.diedR++;
      if (p.eco === 2) { a.saveFull += p.save; a.RFull++; }
      // kill reward: $300 avg; AWPers kill with AWP often ($100). rough correction by role later.
      const kr = p.k * 300;
      const t = Object.values(teams).find(t => t.side === p.side);
      a.sys += kr + (t ? t.bonus : 0);
    }
  }
}
console.log('games:', games);

const rows = [];
for (const [nick, a] of A) {
  const pr = players.get(nick); if (!pr || pr.rounds < 500) continue;
  const isAWPer = (pr.pos_role || '').includes('AWPer');
  const sysAdj = a.sys - (isAWPer ? a.k * 300 * 0.6 : 0); // AWP kill $100 vs $300
  rows.push({ nick, team: pr.mainTeam, role: (pr.pos_role || '?').split('(')[0].trim(), spent: Math.round(pr.spent),
    save: Math.round(a.save / a.R), got: Math.round(a.got / a.R), sys: Math.round(sysAdj / a.R),
    saveFull: Math.round(a.saveFull / Math.max(1, a.RFull)), saveRate: +(a.save > 0 ? 100 * (a.R - a.diedR) / a.R : 0).toFixed(0),
    r30: pr.r30_season, rounds: a.R });
}
rows.sort((a, b) => b.save - a.save);
console.log('\n=== 收入三分拆（$/回合）：save=自己保下的 | got=队友喂的 | sys=击杀奖励+回合奖金(估算) ===');
console.log('TOP15 自己保下最多:');
for (const r of rows.slice(0, 15)) console.log(r.nick.padEnd(12), r.team.padEnd(13), r.role.padEnd(12), 'save=$' + String(r.save).padStart(4), 'got=$' + String(r.got).padStart(3), 'sys=$' + String(r.sys).padStart(4), 'saveFull=$' + String(r.saveFull).padStart(4), 'r30=' + r.r30);
console.log('\nTOP15 队友喂最多 (got):');
[...rows].sort((a, b) => b.got - a.got).slice(0, 15).forEach(r => console.log(r.nick.padEnd(12), r.team.padEnd(13), r.role.padEnd(12), 'got=$' + String(r.got).padStart(3), 'save=$' + String(r.save).padStart(4), 'sys=$' + String(r.sys).padStart(4), 'r30=' + r.r30));
const show = ['m0NESY', 'ZywOo', 'donk', 'TeSeS', 'karrigan', 'NiKo', 'kyousuke', 'kyxsan', 'apEX', 'mezii'];
console.log('\n焦点选手:');
for (const nk of show) { const r = rows.find(x => x.nick === nk); if (r) console.log(r.nick.padEnd(12), 'save=$' + String(r.save).padStart(4), 'got=$' + String(r.got).padStart(3), 'sys=$' + String(r.sys).padStart(4), 'saveFull=$' + String(r.saveFull).padStart(4), 'spent=$' + r.spent, 'r30=' + r.r30); }
fs.writeFileSync(E + 'players_income_decomp.json', JSON.stringify(rows, null, 1));
console.log('\nsaved players_income_decomp.json', rows.length);
