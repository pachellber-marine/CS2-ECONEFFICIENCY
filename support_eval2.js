// support_eval2.js — 五指标 Support 考核（修正字段名）
const fs = require('fs');
const E = 'E:/cs2_econ_2026/';
const low = s => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

const pf = JSON.parse(fs.readFileSync(E + 'players_final_season30.json', 'utf8'));
const rl = JSON.parse(fs.readFileSync(E + 'players_roundlevel.json', 'utf8'));
const rlMap = new Map(rl.map(x => [low(x.nick), x]));
const feed = JSON.parse(fs.readFileSync(E + 'league_feed_intra.json', 'utf8'));
const fp = feed.rows || [];
const feedMap = new Map();
for (const x of fp) { if (!feedMap.has(low(x.nick))) feedMap.set(low(x.nick), x); }
console.log('feed rows:', fp.length, 'sample:', JSON.stringify(fp[0]).slice(0, 220));

const tcsv = fs.readFileSync(E + 'tableau_positions_raw.csv', 'utf8').split(/\r?\n/);
const tRole = new Map();
for (const line of tcsv.slice(1)) { const c = line.split(','); if (c.length > 8) { const name = (c[1] || '').trim(); const role = (c[2] || '').trim(); if (name && !tRole.has(low(name))) tRole.set(low(name), role); } }

// Q1 with per-round data
const grp = {};
for (const p of pf) {
  const r = (tRole.get(low(p.nick)) || p.role || '?');
  const g = r.includes('AWPer') ? 'AWPer' : r.includes('Support') ? 'Support' : r.includes('IGL') ? 'IGL' : r.includes('Opener') ? 'Opener' : r.includes('Closer') ? 'Closer' : '?';
  (grp[g] = grp[g] || []).push(p);
}
console.log('\n=== Q1: 各位置 回合级 util/r 与 纯队内 got/r（≥500回合）===');
for (const [g, arr] of Object.entries(grp)) {
  const vals = { util: [], got: [], net: [], gunpct: [] };
  for (const p of arr) { const r = rlMap.get(low(p.nick)); if (r && r.rounds > 500) { vals.util.push(r.util_r); vals.got.push(r.got_r); vals.net.push(r.gave_net_r); vals.gunpct.push(r.gaveGunPct || 0); } }
  const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN;
  console.log(g.padEnd(8), 'n=' + String(vals.util.length).padStart(3), 'util/r=$' + avg(vals.util).toFixed(0).padStart(4), 'all-got/r=$' + avg(vals.got).toFixed(0).padStart(4), 'net/r=$' + (avg(vals.net) >= 0 ? '+' : '') + avg(vals.net).toFixed(0).padStart(5), 'gaveGun%=' + avg(vals.gunpct).toFixed(1));
}

// Build support cohort: official Support role
const cohort = pf.filter(p => (tRole.get(low(p.nick)) || '').toLowerCase().includes('support'));
console.log('\ncohort:', cohort.length);

// five metrics per player
const rows = [];
for (const p of cohort) {
  const r = rlMap.get(low(p.nick));
  const f = feedMap.get(low(p.nick));
  // team context
  const mates = pf.filter(q => q.mainTeam === p.mainTeam);
  const teamSpent = mates.map(q => q.spent).sort((a, b) => a - b);
  const medS = teamSpent[Math.floor(teamSpent.length / 2)];
  const relSpent = p.spent / medS;                        // M2: 花费相对队内中位 (<1 = 便宜)
  const matesR = mates.filter(q => q.nick !== p.nick).map(q => q.r30_season).sort((a, b) => a - b);
  const medR = matesR[Math.floor(matesR.length / 2)];
  const utilR = r ? r.util_r : NaN;                        // M4a
  const gotIntra = f ? (f.got_r ?? f.intra_got_r) : (r ? r.got_r : NaN); // M1
  const ecoK = r ? r.ecoKPR : (r ? r.eco_kpr : NaN);       // M5a
  const lowK = r ? r.lowKPR : (r ? r.low_kpr : NaN);       // M5b
  const fullK = r ? r.fullKPR : (r ? r.full_kpr : NaN);
  rows.push({ nick: p.nick, team: p.mainTeam, rounds: r ? r.rounds : p.rounds,
    r30: p.r30_season, resid: p.resid30s,
    relSpent: +relSpent.toFixed(3), gotIntra: gotIntra != null ? +gotIntra.toFixed(0) : null,
    utilR: utilR != null ? +utilR.toFixed(0) : null,
    ecoKPR: ecoK != null ? +ecoK.toFixed(3) : null, lowKPR: lowK != null ? +lowK.toFixed(3) : null, fullKPR: fullK != null ? +fullK.toFixed(3) : null });
}
console.log('\nfields avail in roundlevel:', Object.keys(rl[0]).join(','));
console.log('\n=== Support 五指标总表（官方 Support 25 人）===');
console.log('nick'.padEnd(11), 'team'.padEnd(13), 'r30  ', 'resid ', 'relS ', 'got$/r', 'util/r', 'ecoKPR', 'lowKPR', 'fullKPR');
for (const x of rows.sort((a, b) => b.r30 - a.r30))
  console.log(x.nick.padEnd(11), String(x.team).padEnd(13), String(x.r30).padEnd(5), (x.resid >= 0 ? '+' : '') + x.resid.toFixed(3).padEnd(6), String(x.relSpent).padEnd(5), String(x.gotIntra).padEnd(6), String(x.utilR).padEnd(7), String(x.ecoKPR).padEnd(7), String(x.lowKPR).padEnd(7), String(x.fullKPR).padEnd(7));
fs.writeFileSync(E + 'support_cohort.json', JSON.stringify(rows, null, 1));
