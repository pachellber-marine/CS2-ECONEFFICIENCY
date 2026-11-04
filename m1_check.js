// m1_check.js — verify M1: is the $16000 cap ever reached? Does giving scale with cash-on-hand (save)?
// save field = cash carried at round end when surviving (0 when dead) — verify, then:
//  1) distribution of save (how often >= 8000/10000/12000/15000)
//  2) within-player: m0NESY gave by save bucket
//  3) max save observed
const fs = require('fs');
const readline = require('readline');
const E = 'E:/cs2_econ_2026/';

async function main() {
  const rl = readline.createInterface({ input: fs.createReadStream(E + 'rounds_all_final.jsonl'), crlf: false });
  // league-wide save distribution
  const buckets = { alive: 0, '0-2k': 0, '2k-4k': 0, '4k-6k': 0, '6k-8k': 0, '8k-10k': 0, '10k-12k': 0, '12k-14k': 0, '14k-16k': 0, '16k+': 0 };
  let maxSave = 0, aliveN = 0, allN = 0;
  // per-player: m0NESY + league AWPers gave by save bucket
  const per = new Map(); // pid -> {nick, buckets: Map}
  const keys = ['<2k', '2-4k', '4-6k', '6-8k', '8k+'];
  const TARGETS = new Set(['25998', '18452', '23237']); // m0NESY, ZywOo, sh1ro
  for await (const ln of rl) {
    if (!ln.trim()) continue;
    let j; try { j = JSON.parse(ln); } catch { continue; }
    if (j.error || !j.rounds) continue;
    for (const r of j.rounds) for (const p of (r.players || [])) {
      const alive = (p.d || 0) === 0;
      allN++;
      if (!alive) continue;
      aliveN++;
      const s = p.save || 0;
      if (s > maxSave) maxSave = s;
      let b;
      if (s < 2000) b = '0-2k'; else if (s < 4000) b = '2k-4k'; else if (s < 6000) b = '4k-6k';
      else if (s < 8000) b = '6k-8k'; else if (s < 10000) b = '8k-10k'; else if (s < 12000) b = '10k-12k';
      else if (s < 14000) b = '12k-14k'; else if (s < 16000) b = '14k-16k'; else b = '16k+';
      buckets[b]++;
      const pid = String(p.pid);
      if (TARGETS.has(pid)) {
        let w = per.get(pid);
        if (!w) { w = { nick: p.nick, m: new Map(), n: 0 }; per.set(pid, w); }
        const k = s < 2000 ? '<2k' : s < 4000 ? '2-4k' : s < 6000 ? '4-6k' : s < 8000 ? '6-8k' : '8k+';
        const cur = w.m.get(k) || { n: 0, gave: 0 };
        cur.n++; cur.gave += p.gave || 0;
        w.m.set(k, cur);
        w.n++;
      }
    }
  }
  console.log('aliveRounds', aliveN, '/', allN);
  const names = { '25998': 'm0NESY', '18452': 'ZywOo', '23237': 'sh1ro' };
  for (const [pid, w] of per) {
    console.log(`\n${names[pid]} (alive rounds with save: ${w.n}) — gave $/r by end-of-round cash bucket:`);
    for (const k of keys) { const c = w.m.get(k); if (c) console.log(`  ${k}: n=${c.n}  gave=$${(c.gave / c.n).toFixed(1)}`); else console.log(`  ${k}: n=0`); }
  }
  console.log('\nleague save distribution (alive rounds):');
  for (const [k, v] of Object.entries(buckets)) console.log(`  ${k}: ${v} (${(100 * v / aliveN).toFixed(1)}%)`);
  console.log('max save observed:', maxSave);
}
main().catch(e => { console.error(e); process.exit(1); });
