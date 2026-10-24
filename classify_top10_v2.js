// classify_top10_v2.js — green leaf per user definition: eats little (spent AND got below team), contributes much
const fs = require('fs');
const E = 'E:/cs2_econ_2026/';
const P = require(E + 'players_final_season30.json');
const RL = new Map(JSON.parse(fs.readFileSync(E + 'players_roundlevel.json', 'utf8')).map(r => [r.nick, r]));
const TOP10 = ['Spirit', 'Vitality', 'FURIA', 'MOUZ', 'Aurora', 'Falcons', 'Legacy', 'G2', 'BETBOOM', 'FUT'];
const norm = s => (s || '').toLowerCase();
const supType = r => /support|anchor|igl/.test(norm(r));

const all = P.filter(p => p.rounds >= 500 && RL.has(p.nick));
const out = [];
for (const team of TOP10) {
  const roster = all.filter(p => p.mainTeam === team);
  if (!roster.length) continue;
  const sv = [...roster.map(x => x.spent)].sort((a, b) => a - b);
  const medS = sv[Math.floor((sv.length - 1) / 2)]; // lower-median
  const medR = [...roster.map(x => x.r30_season)].sort((a, b) => a - b)[Math.floor(roster.length / 2)];
  const medGot = [...roster.map(x => (RL.get(x.nick) || {}).got_r ?? 999)].sort((a, b) => a - b)[Math.floor(roster.length / 2)];
  for (const p of roster) {
    const rl = RL.get(p.nick);
    const isSup = supType(rl.role);
    let label, why = '';
    if (p.r30_season >= 1.15 && p.spent >= medS) { label = 'star'; why = 'high rating, high spend'; }
    else if (p.r30_season >= 1.15 && p.spent < medS) { label = 'efficient_star'; why = 'star output at below-median cost - NOT greenleaf'; }
    else if (isSup) {
      const eatsLittle = p.spent < medS && rl.got_r <= medGot;
      const contrib = rl.util_r >= 150 || (rl.kpr_low && rl.kpr_low >= 0.45) || p.r30_season >= medR - 0.05;
      if (eatsLittle && contrib) { label = 'greenleaf_pure'; why = `got$${Math.round(rl.got_r)}/spent$${Math.round(p.spent)} both below team median, util$${Math.round(rl.util_r)}/r`; }
      else if (p.spent < medS && contrib) { label = 'greenleaf_quasi'; why = 'cheap but heavily fed by team'; }
      else { label = 'utility'; why = 'support role but expensive or under-contributing'; }
    }
    else if (p.r30_season < medR - 0.08) { label = 'underwater'; why = 'below team median rating by 0.08+'; }
    else { label = 'rotation'; }
    out.push({ team, nick: p.nick, role: rl.role, spent: Math.round(p.spent), r30: +p.r30_season.toFixed(3), got: Math.round(rl.got_r), gave: Math.round(rl.gave_r), util: Math.round(rl.util_r), kprLow: rl.kpr_low, label, why });
  }
}
const zh = { star: '明星位', efficient_star: '高效明星', greenleaf_pure: '绿叶(纯)', greenleaf_quasi: '准绿叶(被投喂)', utility: '工具人', underwater: '水位', rotation: '轮转' };
for (const team of TOP10) {
  const rows = out.filter(r => r.team === team).sort((a, b) => b.r30 - a.r30);
  if (!rows.length) continue;
  console.log('\n## ' + team);
  rows.forEach(r => console.log(' ', r.nick.padEnd(12), r.role.padEnd(10), '$' + String(r.spent).padStart(4), 'r30=' + r.r30, 'got=$' + String(r.got).padStart(3), 'gave=$' + String(r.gave).padStart(3), 'util=$' + r.util, '→', zh[r.label], '|', r.why));
}
fs.writeFileSync(E + 'top10_classification.json', JSON.stringify(out, null, 1));
const counts = {}; out.forEach(r => counts[r.label] = (counts[r.label] || 0) + 1);
console.log('\nlabels:', JSON.stringify(counts), 'players:', out.length);
