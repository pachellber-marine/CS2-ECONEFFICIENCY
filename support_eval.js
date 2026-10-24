// support_eval.js — Support 岗位五指标考核
// Q1: Support 真的吃得更少吗? (全位置对比)
// Q2: Top20 各队 Support 五维排名, 谁最好谁最差
const fs = require('fs');
const E = 'E:/cs2_econ_2026/';
const low = s => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

const pf = JSON.parse(fs.readFileSync(E + 'players_final_season30.json', 'utf8'));
const rl = JSON.parse(fs.readFileSync(E + 'players_roundlevel.json', 'utf8'));   // per-round: util,gave,got,ecoKPR etc
const rlMap = new Map(rl.map(x => [low(x.nick), x]));
const feed = JSON.parse(fs.readFileSync(E + 'league_feed_intra.json', 'utf8')); // intra-team feeding
const feedMap = new Map((feed.players || feed).map ? (feed.players || feed).map(x => [low(x.nick), x]) : []);

// tableau official role
const tcsv = fs.readFileSync(E + 'tableau_positions_raw.csv', 'utf8').split(/\r?\n/);
const tRole = new Map();
for (const line of tcsv.slice(1)) {
  const c = line.split(',');
  if (c.length > 8) { const name = (c[1] || '').trim(); const role = (c[2] || '').trim(); if (name && !tRole.has(low(name))) tRole.set(low(name), role); }
}

// who are support-labeled (official Tableau role contains Support)
const supports = pf.filter(x => (tRole.get(low(x.nick)) || '').toLowerCase().includes('support') || (x.role || '').toLowerCase().includes('support'));
console.log('official-labeled support in our 197:', supports.length, '->', supports.map(s => s.nick).join(', '));

// also fallback: role_known/support_idx heuristic? keep official only + known support names from Top20 teams without label
// Check first: does support eat less? Compare group means across ALL positions (197)
const grp = {};
for (const p of pf) {
  const r = (tRole.get(low(p.nick)) || p.role || '?');
  const g = r.includes('AWPer') ? 'AWPer' : r.includes('Support') ? 'Support' : r.includes('IGL') ? 'IGL' : r.includes('Opener') ? 'Opener' : r.includes('Closer') ? 'Closer' : '?';
  (grp[g] = grp[g] || []).push(p);
}
console.log('\n=== Q1: Support 吃得更少吗? (位置均值对比, 197人) ===');
for (const [g, arr] of Object.entries(grp)) {
  const n = arr.length; if (n < 3) continue;
  const m = k => arr.reduce((s, x) => s + (x[k] || 0), 0) / n;
  console.log(g.padEnd(8), 'n=' + String(n).padStart(3), 'spent=$' + m('spent').toFixed(0).padStart(5), 'r30=' + m('r30_season').toFixed(3), 'resid=' + (m('resid30s') >= 0 ? '+' : '') + m('resid30s').toFixed(3), 'ast/r=' + (m('assists') / (m('rounds') || 1) * 1000 / 1000).toFixed(3));
}
// util & got per round from roundlevel
console.log('\n=== Q1b: util/r 与 纯队内 got/r (回合计) ===');
for (const [g, arr] of Object.entries(grp)) {
  let u = [], gt = [], n = 0;
  for (const p of arr) { const r = rlMap.get(low(p.nick)); if (r && r.rounds > 500) { u.push(r.util / r.rounds); gt.push((feedMap.get(low(p.nick)) || {}).got_r); n++; } }
  if (n >= 3) console.log(g.padEnd(8), 'n=' + String(n).padStart(3), 'util/r=$' + (u.reduce((a, b) => a + b, 0) / n).toFixed(0).padStart(4), 'intra-got/r=$' + (gt.filter(v => v != null).reduce((a, b) => a + b, 0) / Math.max(1, gt.filter(v => v != null).length)).toFixed(0));
}
console.log('\nfeed json keys:', Object.keys(feed).slice(0, 8).join(','), Array.isArray(feed) ? 'ARRAY len ' + feed.length : '');
const fsamp = (feed.players || feed)[0]; if (fsamp) console.log('feed row sample:', JSON.stringify(fsamp).slice(0, 200));
const rsamp = rl[0]; console.log('roundlevel sample:', JSON.stringify(rsamp).slice(0, 300));
