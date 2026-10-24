// 11.4 full table: 196 players x 6 layers, markdown; mark missing strata as n/a
const fs = require('fs');
const path = 'E:/cs2_econ_2026/';
const L = require(path + 'players_layers.json');
const order = ['ALL', 'BIG', 'ALL_T20', 'ALL_T5', 'BIG_T20', 'BIG_T5'];
const label = { ALL: '全量', BIG: '大赛', ALL_T20: '全量vsT20', ALL_T5: '全量vsT5', BIG_T20: '大赛vsT20', BIG_T5: '大赛vsT5' };
// sort by ALL rating desc
L.sort((a, b) => (b.strata.ALL.r30 || 0) - (a.strata.ALL.r30 || 0));
let md = '| # | 选手 | 队伍 | 全量 | 大赛 | 全量vsT20 | 全量vsT5 | 大赛vsT20 | 大赛vsT5 |\n|---|---|---|---|---|---|---|---|---|\n';
L.forEach((p, i) => {
  const cells = order.map(s => {
    const x = p.strata[s];
    if (!x || !x.r30) return '—';
    return x.r30.toFixed(3) + ` (${x.maps})`;
  });
  md += `| ${i + 1} | ${p.nick} | ${p.main} | ${cells.join(' | ')} |\n`;
});
fs.writeFileSync(path + 'layers_table_full.md', md);
console.log('rows:', L.length, 'chars:', md.length);
// also the drop table for >=60 T5 maps
const drops = L.filter(p => p.strata.ALL_T5 && p.strata.ALL_T5.maps >= 60 && p.strata.ALL.r30)
  .map(p => ({ nick: p.nick, main: p.main, all: p.strata.ALL.r30, t5: p.strata.ALL_T5.r30, drop: (p.strata.ALL.r30 - p.strata.ALL_T5.r30) / p.strata.ALL.r30 * 100 }))
  .sort((a, b) => a.drop - b.drop);
fs.writeFileSync(path + 'layers_drop_table.md',
  '| # | 选手 | 队伍 | 全量 | 全量vsT5 | 跌幅% |\n|---|---|---|---|---|---|\n' +
  drops.map((p, i) => `| ${i + 1} | ${p.nick} | ${p.main} | ${p.all.toFixed(3)} | ${p.t5.toFixed(3)} | ${p.drop.toFixed(1)}% |`).join('\n'));
console.log('drop rows:', drops.length);
