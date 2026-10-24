// eq_decomp.js — verify eq composition: does eq = wval+pval+util+add? where does armor sit?
const fs = require('fs');
const E = 'E:/cs2_econ_2026/';
let n = 0, eqMatch = 0, eqDiff = new Map(); // diff -> count
let samples = [];
const sumVs = { wval: 0, pval: 0, util: 0, add: 0, eq: 0, save: 0, spent: 0 };
for (const line of fs.readFileSync(E + 'rounds_all.jsonl', 'utf8').split('\n')) {
  if (!line.trim()) continue;
  let g; try { g = JSON.parse(line); } catch (e) { continue; }
  if (!g.rounds) continue;
  for (const r of g.rounds) for (const p of r.players) {
    n++;
    const s = p.wval + p.pval + p.util + p.add;
    sumVs.wval += p.wval; sumVs.pval += p.pval; sumVs.util += p.util; sumVs.add += p.add; sumVs.eq += p.eq; sumVs.save += p.save; sumVs.spent += p.spent;
    const d = p.eq - s;
    eqDiff.set(d, (eqDiff.get(d) || 0) + 1);
    if (d === 0) eqMatch++;
    if (samples.length < 8 && p.wval === 4750) samples.push({ eq: p.eq, wval: p.wval, pval: p.pval, util: p.util, add: p.add, diff: d });
  }
  if (n > 400000) break;
}
console.log('rows:', n, 'eq==sum(wval+pval+util+add):', eqMatch, '(' + (100 * eqMatch / n).toFixed(1) + '%)');
console.log('diff histogram top12:');
[...eqDiff.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).forEach(([d, c]) => console.log('  diff=' + d, 'count=' + c));
console.log('column sums: wval=' + sumVs.wval, 'pval=' + sumVs.pval, 'util=' + sumVs.util, 'add=' + sumVs.add, 'eq=' + sumVs.eq);
console.log('avg per round: eq=' + (sumVs.eq / n).toFixed(0), 'wval=' + (sumVs.wval / n).toFixed(0), 'pval=' + (sumVs.pval / n).toFixed(0), 'util=' + (sumVs.util / n).toFixed(0), 'add=' + (sumVs.add / n).toFixed(0));
console.log('AWP-holder samples:', JSON.stringify(samples, null, 1));
