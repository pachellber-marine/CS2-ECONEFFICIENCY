// ROUND-LEVEL ANALYSIS v2 (final): calibrated eco codes
const fs = require('fs');
const E = 'E:/cs2_econ_2026/';
const players = new Map(JSON.parse(fs.readFileSync(E + 'players_final_season30.json', 'utf8')).map(p => [p.nick, p]));
const low = s => s.toLowerCase().replace(/[^a-z0-9]/g, '');
const byLow = new Map([...players.keys()].map(k => [low(k), k]));

const agg = new Map();
const A = nick => { if (!agg.has(nick)) agg.set(nick, { R: 0, spent: 0, wval: 0, pval: 0, util: 0, add: 0, gave: 0, got: 0, k: 0, dmg: 0, fk: 0, fd: 0,
  ecoR: 0, ecoK: 0, ecoD: 0, lowR: 0, lowK: 0, lowD: 0, forceR: 0, forceK: 0, forceD: 0, fullR: 0, fullK: 0, fullD: 0, pistolR: 0, pistolK: 0, gaveGunR: 0, gotGunR: 0 }); return agg.get(nick); };

let games = 0, rounds = 0;
for (const line of fs.readFileSync(E + 'rounds_all.jsonl', 'utf8').split('\n')) {
  if (!line.trim()) continue;
  let g; try { g = JSON.parse(line); } catch (e) { continue; }
  if (!g.rounds) continue;
  games++; rounds += g.rounds.length;
  for (const r of g.rounds) {
    for (const p of r.players) {
      const key = low(p.nick || '');
      const nn = byLow.get(key); if (!nn) continue;
      const a = A(nn);
      a.R++; a.spent += p.spent; a.wval += p.wval; a.pval += p.pval; a.util += p.util; a.add += p.add;
      a.gave += p.gave; a.got += p.got; a.k += p.k; a.dmg += p.dmg; a.fk += p.fk; a.fd += p.fd;
      if (p.gave > 500) a.gaveGunR++;
      if (p.got > 500) a.gotGunR++;
      if (r.round === 1 || (p.eco === 2 && p.wval === 0 && p.eq < 3000 && false)) {}
      if (r.round === 1) { a.pistolR++; a.pistolK += p.k; }
      if (p.eco === -1) { a.ecoR++; a.ecoK += p.k; a.ecoD += p.dmg; }
      else if (p.eco === 0) { a.lowR++; a.lowK += p.k; a.lowD += p.dmg; }
      else if (p.eco === 1) { a.forceR++; a.forceK += p.k; a.forceD += p.dmg; }
      else { a.fullR++; a.fullK += p.k; a.fullD += p.dmg; }
    }
  }
}
console.log('games:', games, 'rounds:', rounds, 'players:', agg.size);
const out = [...agg.entries()].map(([nick, a]) => {
  const pr = players.get(nick);
  const per = x => x / a.R;
  return {
    nick, team: pr.mainTeam, role: pr.pos_role || '', spent: pr.spent, rating30: pr.r30_season, resid30: pr.resid30s,
    rounds: a.R,
    // econ structure
    ecoPct: +(100 * a.ecoR / a.R).toFixed(1), lowPct: +(100 * a.lowR / a.R).toFixed(1), forcePct: +(100 * a.forceR / a.R).toFixed(1), fullPct: +(100 * a.fullR / a.R).toFixed(1),
    // weapon split per round
    wval_r: Math.round(per(a.wval)), pval_r: Math.round(per(a.pval)), util_r: Math.round(per(a.util)), add_r: Math.round(per(a.add)),
    // drops (发枪)
    gave_r: Math.round(per(a.gave)), got_r: Math.round(per(a.got)),
    gave_net_r: Math.round(per(a.gave - a.got)), gaveGunPct: +(100 * a.gaveGunR / a.R).toFixed(1), gotGunPct: +(100 * a.gotGunR / a.R).toFixed(1),
    // output by econ
    kpr_eco: a.ecoR ? +(a.ecoK / a.ecoR).toFixed(3) : null, adr_eco: a.ecoR ? Math.round(a.ecoD / a.ecoR) : null,
    kpr_low: a.lowR ? +(a.lowK / a.lowR).toFixed(3) : null,
    kpr_force: a.forceR ? +(a.forceK / a.forceR).toFixed(3) : null, adr_force: a.forceR ? Math.round(a.forceD / a.forceR) : null,
    kpr_full: a.fullR ? +(a.fullK / a.fullR).toFixed(3) : null, adr_full: a.fullR ? Math.round(a.fullD / a.fullR) : null,
    kpr: +(a.k / a.R).toFixed(3), adr: Math.round(a.dmg / a.R), fkr: +(a.fk / a.R).toFixed(3), fdr: +(a.fd / a.R).toFixed(3),
    pistolKpr: a.pistolR ? +(a.pistolK / a.pistolR).toFixed(3) : null,
  };
});
out.sort((a, b) => b.rounds - a.rounds);
fs.writeFileSync(E + 'players_roundlevel.json', JSON.stringify(out, null, 1));
console.log('saved players_roundlevel.json,', out.length, 'players');

// ===== headline analyses =====
const sig = out.filter(p => p.rounds >= 500);
console.log('\n=== A. 发枪榜 (net drops given per round, >=500 rounds) ===');
sig.slice().sort((a, b) => b.gave_net_r - a.gave_net_r).slice(0, 10).forEach(p =>
  console.log(p.nick.padEnd(12), p.team.padEnd(14), 'net+' + String(p.gave_net_r).padStart(4), 'gave=' + String(p.gave_r).padStart(4), 'got=' + String(p.got_r).padStart(4), (p.gaveGunPct + '%回合金枪主'), p.role));

console.log('\n=== A2. 吃枪榜 (net received) ===');
sig.slice().sort((a, b) => a.gave_net_r - b.gave_net_r).slice(0, 10).forEach(p =>
  console.log(p.nick.padEnd(12), p.team.padEnd(14), 'net+' + String(p.gave_net_r).padStart(4), 'got=' + String(p.got_r).padStart(4), p.role));

console.log('\n=== B. 同经济等级产出 (KPR by eco level, role means) ===');
const byRole = {};
for (const p of sig) { const k = (p.role || '?').split('(')[0].trim(); if (!byRole[k]) byRole[k] = { n: 0, eco: 0, low: 0, force: 0, full: 0, ecoPct: 0, wval: 0, util: 0, gave: 0, got: 0, spent: 0 }; byRole[k].n++; byRole[k].eco += p.kpr_eco || 0; byRole[k].low += p.kpr_low || 0; byRole[k].force += p.kpr_force || 0; byRole[k].full += p.kpr_full || 0; byRole[k].ecoPct += p.ecoPct; byRole[k].wval += p.wval_r; byRole[k].util += p.util_r; byRole[k].gave += p.gave_r; byRole[k].got += p.got_r; byRole[k].spent += p.spent; }
for (const k in byRole) { const b = byRole[k], n = b.n; if (n < 3) continue; console.log(k.padEnd(14), 'n=' + String(n).padStart(3), 'ecoKPR=' + (b.eco / n).toFixed(3), 'forceKPR=' + (b.force / n).toFixed(3), 'fullKPR=' + (b.full / n).toFixed(3), 'eco%=' + (b.ecoPct / n).toFixed(1), 'wval_r=$' + Math.round(b.wval / n), 'util_r=$' + Math.round(b.util / n), 'gave_r=$' + Math.round(b.gave / n), 'got_r=$' + Math.round(b.got / n)); }

console.log('\n=== C. 道具/武器承担 per role ===');
// included above

console.log('\n=== D. TeSeS 回合级画像 ===');
const T = out.find(p => p.nick === 'TeSeS');
console.log(JSON.stringify(T, null, 1));
const fal = sig.filter(p => p.team === 'Falcons');
console.log('\nFalcons round-level:');
for (const p of fal) console.log(' ', p.nick.padEnd(10), 'eco%=' + p.ecoPct, 'gave_r=$' + p.gave_r, 'got_r=$' + p.got_r, 'net=' + p.gave_net_r, 'wval_r=$' + p.wval_r, 'util_r=$' + p.util_r, 'ecoKPR=' + p.kpr_eco, 'fullKPR=' + p.kpr_full);
