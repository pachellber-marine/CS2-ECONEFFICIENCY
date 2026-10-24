// Generate full 6-layer stratification table for all 196 players + CSV export
const fs = require('fs');
const L = require('E:/cs2_econ_2026/players_layers.json');
const P = require('E:/cs2_econ_2026/players_final_season30.json');

const byPid = new Map(P.map(p => [String(p.pid), p]));
const arr = Array.isArray(L) ? L : Object.values(L);

const S = ['ALL','BIG','ALL_T20','ALL_T5','BIG_T20','BIG_T5'];
const cell = (s) => {
  if (!s || !s.maps) return { m: 0, r: null, sw: null };
  return { m: s.maps, r: s.r30, sw: s.swing };
};

const rows = arr.map(x => {
  const p = byPid.get(String(x.pid)) || {};
  const st = {};
  for (const k of S) st[k] = cell(x.strata && x.strata[k]);
  return {
    pid: x.pid, nick: x.nick, team: x.main || p.mainTeam || '',
    role: p.pos_role || p.role || '',
    ...Object.fromEntries(S.map(k => [k, st[k]])),
  };
});
rows.sort((a, b) => (b.ALL.r || 0) - (a.ALL.r || 0));

// CSV
const hdr = 'nick,team,role,' + S.flatMap(k => [`${k}_maps`, `${k}_r30`, `${k}_swing`]).join(',') + '\n';
const csv = hdr + rows.map(r =>
  [r.nick, r.team, r.role, ...S.flatMap(k => [r[k].m, r[k].r ?? '', r[k].sw == null ? '' : r[k].sw.toFixed(3)]).join(',')
  ].join(',')
).join('\n');
fs.writeFileSync('E:/cs2_econ_2026/players_layers_full.csv', csv, 'utf8');
fs.writeFileSync('E:/cs2_econ_2026/players_layers_full.json', JSON.stringify(rows, null, 1), 'utf8');

// Markdown summary for report: full table for everyone with ALL>=100 maps, compact
const md = [];
md.push('| 选手 | 队 | 角色 | ALL n | ALL | 大赛 n | 大赛 | 全vsT20 n | 全vsT20 | 全vsT5 n | 全vsT5 | 大赛T20 n | 大赛T20 | 大赛T5 n | 大赛T5 |');
md.push('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
for (const r of rows) {
  if (!r.ALL.r || r.ALL.m < 50) continue;
  const f = (c, d = 3) => c.r == null ? '–' : c.r.toFixed(d);
  md.push(`| ${r.nick} | ${r.team} | ${r.role} | ${r.ALL.m} | ${f(r.ALL)} | ${r.BIG.m} | ${f(r.BIG)} | ${r.ALL_T20.m} | ${f(r.ALL_T20)} | ${r.ALL_T5.m} | ${f(r.ALL_T5)} | ${r.BIG_T20.m} | ${f(r.BIG_T20)} | ${r.BIG_T5.m} | ${f(r.BIG_T5)} |`);
}
fs.writeFileSync('E:/cs2_econ_2026/layers_table.md', md.join('\n'), 'utf8');
console.log('rows:', rows.length, '| md lines:', md.length - 2);
console.log(md.slice(0, 18).join('\n'));
