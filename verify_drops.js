// CRITICAL: verify drops semantics — is "gave" intentional throw or death-drop artifact?
const fs = require('fs');
const E = 'E:/cs2_econ_2026/';

// hypothesis test: P(gave>1000 | died) vs P(gave>1000 | alive)
let diedWithGave = 0, diedN = 0, aliveWithGave = 0, aliveN = 0;
let gaveOnDeathVal = 0, gaveOnAliveVal = 0;
// for AWPer-like: check m0NESY & ZywOo specifically
const focus = {};
let n = 0;
for (const line of fs.readFileSync(E + 'rounds_all.jsonl', 'utf8').split('\n')) {
  if (!line.trim()) continue;
  let g; try { g = JSON.parse(line); } catch (e) { continue; }
  if (!g.rounds) continue;
  if (++n > 1200) break; // sample
  for (const r of g.rounds) for (const p of r.players) {
    if (p.eq < 2000) continue; // only rounds with real guns
    if (p.d === 1) { diedN++; if (p.gave > 500) { diedWithGave++; gaveOnDeathVal += p.gave; } }
    else { aliveN++; if (p.gave > 500) { aliveWithGave++; gaveOnAliveVal += p.gave; } }
    if (['m0NESY', 'ZywOo', 'karrigan', 'TeSeS', 'donk'].includes(p.nick)) {
      if (!focus[p.nick]) focus[p.nick] = { diedGave: 0, diedN: 0, aliveGave: 0, aliveN: 0, gotAlive: 0, gotDeath: 0 };
      const f = focus[p.nick];
      if (p.d === 1) { f.diedN++; if (p.gave > 500) f.diedGave++; f.gotDeath += p.got; }
      else { f.aliveN++; if (p.gave > 500) f.aliveGave++; f.gotAlive += p.got; }
    }
  }
}
console.log('=== drops semantics test (rounds with eq>=2000) ===');
console.log('DIED  : ' + (100 * diedWithGave / diedN).toFixed(1) + '% gave>$500, avg gave when gave: $' + Math.round(gaveOnDeathVal / diedWithGave) + '  (n=' + diedN + ')');
console.log('ALIVE : ' + (100 * aliveWithGave / aliveN).toFixed(1) + '% gave>$500, avg gave when gave: $' + Math.round(gaveOnAliveVal / aliveWithGave) + '  (n=' + aliveN + ')');
for (const k in focus) { const f = focus[k]; console.log(k.padEnd(10), 'died: ' + (100 * f.diedGave / Math.max(1, f.diedN)).toFixed(1) + '% rounds gave (n=' + f.diedN + ')', 'alive: ' + (100 * f.aliveGave / Math.max(1, f.aliveN)).toFixed(1) + '% (n=' + f.aliveN + ')', 'got alive=$' + Math.round(f.gotAlive / Math.max(1, f.aliveN)) + '/r got died=$' + Math.round(f.gotDeath / Math.max(1, f.diedN)) + '/r'); }
