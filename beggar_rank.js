// beggar_rank.js — beggar-AWP ranking among real AWPers + support vs teammates distribution test
const fs = require('fs');
const E = 'E:/cs2_econ_2026/';
const v2 = JSON.parse(fs.readFileSync(E + 'awp_behavior_v2.json', 'utf8'));
// real AWPers = players whose role (from tableau/roundlevel) is AWPer — pull from players_final_season30
const P = new Map(require(E + 'players_final_season30.json').map(p => [p.nick, p]));
const rl = new Map(JSON.parse(fs.readFileSync(E + 'players_roundlevel.json', 'utf8')).map(r => [r.nick, r]));
const norm = s => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const roleOf = {};
for (const [n, r] of rl) roleOf[n] = r.role;

const awpers = v2.filter(r => /awper/i.test(roleOf[r.nick] || '') || ['SH1R0','m0NESY','ZywOo','torzsi','w0nderful','broky','Jame','ArtFr0st','molodoy1717','SunPayus','phzy','910-','try','nqzjre','saadzin_','gr1ks','meyern','afroo','s1zzi','Latt1kk','Martineez','r1nkle','slaxz-','hypexx-','c3m3t3ry44','NHJee-','s1mple','device','oSee','JBOEN','Maka','GL `eraa','zorte x LUKOIL','woxic','stavn','yxngstxr','mo0nxdd'].includes(r.nick));
console.log('=== 乞丐流狙击手榜（AWPer 内部，按 自保率×自购率-被喂率 综合独立性）===');
const scored = awpers.map(r => ({ ...r, indep: +(r.buy + r.keep + r.pickup - r.fed).toFixed(1) })).sort((a, b) => b.fed - a.fed);
console.log('nick'.padEnd(13), 'R'.padStart(5), '自购%'.padStart(6), '被喂%'.padStart(6), '自保%'.padStart(6), '捡枪%'.padStart(6), '独立指数'.padStart(7));
for (const r of scored.slice(0, 20)) console.log(r.nick.padEnd(13), String(r.R).padStart(5), String(r.buy).padStart(6), String(r.fed).padStart(6), String(r.keep).padStart(6), String(r.pickup).padStart(6), String(r.indep).padStart(7));
console.log('--- 最独立 TOP10 ---');
for (const r of [...scored].sort((a, b) => b.indep - a.indep).slice(0, 10)) console.log(r.nick.padEnd(13), '独立=' + r.indep, '自购' + r.buy + '%', '自保' + r.keep + '%', '被喂' + r.fed + '%');

// Support vs teammates: Mann-Whitney U on spent and got per round (aggregated from roundlevel already? need per-round) 
// Quick proxy: use players_roundlevel aggregates + report team-internal percentile instead. But user asked for distribution test.
// Do MW-U on per-round spent for support players vs their teammates using rounds_all.
const SUPPORT = new Set([...rl.entries()].filter(([n, r]) => /support|anchor/i.test(r.role || '')).map(([n]) => n));
const byTeam = {}; // team -> {sup:[], others:[]}
const spentData = new Map(); // nick -> array of per-round spent
const gotData = new Map();
for (const line of fs.readFileSync(E + 'rounds_all.jsonl', 'utf8').split('\n')) {
  if (!line.trim()) continue;
  let g; try { g = JSON.parse(line); } catch (e) { continue; }
  if (!g.rounds) continue;
  for (const r of g.rounds) for (const p of r.players) {
    const key = norm(p.nick);
    if (!spentData.has(key)) { spentData.set(key, []); gotData.set(key, []); }
    if (spentData.get(key).length < 3000) { spentData.get(key).push(p.spent); gotData.get(key).push(p.got); }
  }
}
// map support nick -> team via players_final_season30
const teamOf = new Map([...P.values()].map(p => [norm(p.nick), p.mainTeam]));
const mwu = (a, b) => { // Mann-Whitney U with normal approximation
  const n1 = a.length, n2 = b.length;
  const all = [...a.map(v => [v, 0]), ...b.map(v => [v, 1])].sort((x, y) => x[0] - y[0]);
  let r1 = 0, i = 0;
  while (i < all.length) {
    let j = i; while (j < all.length && all[j][0] === all[i][0]) j++;
    const avgRank = (i + j + 1) / 2;
    for (let k = i; k < j; k++) if (all[k][1] === 0) r1 += avgRank;
    i = j;
  }
  const U = r1 - n1 * (n1 + 1) / 2;
  const mu = n1 * n2 / 2, sig = Math.sqrt(n1 * n2 * (n1 + n2 + 1) / 12);
  const z = (U - mu) / sig;
  const p = 2 * (1 - normCdf(Math.abs(z)));
  return { z: +z.toFixed(2), p: p.toExponential(1) };
};
function normCdf(x) { return 0.5 * (1 + erf(x / Math.SQRT2)); }
function erf(x) { const s = x < 0 ? -1 : 1; x = Math.abs(x); const t = 1 / (1 + 0.3275911 * x); const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return s * y; }

console.log('\n=== Support/Anchor 选手 vs 队友 花费分布检验（Mann-Whitney U, 每回合 spent，采样≤3000）===');
console.log('nick'.padEnd(12), 'team'.padEnd(12), 'spentZ'.padStart(8), 'spentP'.padStart(10), 'gotZ'.padStart(7), 'gotP'.padStart(10), 'medSpent'.padStart(9), '队友med');
const results = [];
for (const n of SUPPORT) {
  const team = teamOf.get(norm(n)); if (!team) continue;
  const mine = spentData.get(norm(n)) || [], myg = gotData.get(norm(n)) || [];
  if (mine.length < 800) continue;
  const mates = [], matesG = [];
  for (const [nick2, t2] of teamOf) if (t2 === team && nick2 !== norm(n)) { mates.push(...(spentData.get(nick2) || []).slice(0, 2000)); matesG.push(...(gotData.get(nick2) || []).slice(0, 2000)); }
  if (mates.length < 800) continue;
  const r1 = mwu(mine, mates), r2 = mwu(myg, matesG);
  const med = a => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
  results.push({ n, team, r1, r2, ms: med(mine), mm: med(mates), mg: med(myg), mmg: med(matesG) });
}
results.sort((a, b) => a.r1.z - b.r1.z);
for (const r of results) console.log(r.n.padEnd(12), r.team.padEnd(12), String(r.r1.z).padStart(8), String(r.r1.p).padStart(10), String(r.r2.z).padStart(7), String(r.r2.p).padStart(10), String(r.ms).padStart(9), String(r.mm).padStart(6));
fs.writeFileSync(E + 'support_vs_team_mwu.json', JSON.stringify(results.map(r => ({ nick: r.n, team: r.team, spentZ: r.r1.z, spentP: r.r1.p, gotZ: r.r2.z, gotP: r.r2.p, medSpent: r.ms, medMates: r.mm, medGot: r.mg, medMatesGot: r.mmg })), null, 1));
