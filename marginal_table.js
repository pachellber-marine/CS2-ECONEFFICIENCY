// v2: clean Steam-name aliases, dedupe by canonical nick (merge averages), full table
const fs = require('fs');
const path = 'E:/cs2_econ_2026/';
const m = require(path + 'players_marginal.json');
const P = require(path + 'players_with_positions.json');
const norm = s => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

// Steam-name -> canonical nick (bo3.gg player true nick)
const ALIAS = {
  cemen_bakin: 'kyousuke', nucleonz: 'flamie', night_kl1m: 'kl1m',
  jimppahat: 'Jimpphat', exqbftauson: 'Tauson', exqbfstaerhh: 'Staehr',
  iboarssiuhy: 'siuhy', r5thundercraig: 'ThunderCraig', mo0nxdd: 'Mo0N',
  selecanoway: 'noway', gafolocerttotelecom: 'Gafolo', nlg_s1n: 's1n',
  moseyuh: 'Moseyuh', zero: 'Zero', doc: 'doc', dem0n: 'dem0n',
};
const canon = nick => {
  const n = norm(nick).replace(/[★⑳㉑♡:)†]+/g, '');
  return ALIAS[n] || nick.replace(/[★⑳㉑♡:)†]+/g, '').trim();
};
const roleOf = new Map();
for (const p of P) roleOf.set(norm(p.nick), p.pos_role || p.role);

// merge by canonical nick
const groups = new Map();
for (const r of m) {
  const c = canon(r.nick);
  if (!groups.has(c)) groups.set(c, []);
  groups.get(c).push(r);
}
const rows = [];
for (const [c, arr] of groups) {
  const w = arr.length;
  rows.push({
    nick: c, team: arr[0].team,
    role: roleOf.get(norm(c)) || roleOf.get(norm(arr[0].nick)) || '?',
    elasticity: arr.reduce((s, r) => s + r.elasticity, 0) / w,
    margKPD: arr.reduce((s, r) => s + r.marginalKPD, 0) / w,
    kprEco: arr.reduce((s, r) => s + r.kprEco, 0) / w,
    kprFull: arr.reduce((s, r) => s + r.kprFull, 0) / w,
    merged: w > 1 ? arr.map(x => x.nick).join('+') : '',
  });
}
rows.sort((a, b) => b.elasticity - a.elasticity);
rows.forEach((r, i) => r.rankE = i + 1);
fs.writeFileSync(path + 'players_marginal_full.csv',
  'rankE,nick,team,role,elasticity,margK_per_1k,kprEco,kprFull,merged\n' +
  rows.map(r => [r.rankE, r.nick, r.team, r.role, r.elasticity.toFixed(3), (r.margKPD * 1000).toFixed(1), r.kprEco.toFixed(3), r.kprFull.toFixed(3), r.merged].join(',')).join('\n'));
console.log('deduped rows:', rows.length);
const tses = rows.find(r => norm(r.nick) === norm('TeSeS'));
console.log('TeSeS rank:', tses.rankE, '/', rows.length, 'ela=', tses.elasticity.toFixed(3));
// role means among rows with role
const byRole = {};
for (const r of rows) { (byRole[r.role] = byRole[r.role] || []).push(r); }
console.log('--- role means (all, n>=5) ---');
for (const [role, arr] of Object.entries(byRole)) {
  if (arr.length < 5) continue;
  const ela = arr.reduce((s, r) => s + r.elasticity, 0) / arr.length;
  const marg = arr.reduce((s, r) => s + r.marginalKPD, 0) / arr.length * 1000;
  console.log(role.padEnd(12), 'n=' + String(arr.length).padStart(3), 'ela=' + ela.toFixed(3), 'margK/k$=' + marg.toFixed(2));
}
