// awp_behavior_v2.js — verified AWP economy metrics, all money-flow based, zero guessing
// Verified facts:
//   wval=4750 == carrying AWP (11853 occurrences; histogram at weapon prices) — BUT wval has stale-value bug after death
//   spent 4750-4850 == AWP purchase (9349 buyers, 100% die with wval 4750)
//   got>=4700 == received ~AWP value from teammate (97% intra-clan matched)
//   save>0 only when alive; save = banked money (not weapon value)
// Strategy per player per game:
//   state = hasAwp? Start false. Each round:
//     if spent in [4750,4850] or spent in [5750,7000] (AWP+armor/util combos) → self-buy event, state=true
//     elif got>=4700 → fed event, state=true
//     elif state && alive && save>=4700 → keep (self-preserve) — banked the AWP value
//     elif state && died → state=false (dropped/lost)
//     elif wval==4750 → state=true (pickup, enemy drop or stale) → classify 'pickup'
const fs = require('fs');
const E = 'E:/cs2_econ_2026/';
const S = new Map();
const acc = n => { if (!S.has(n)) S.set(n, { R: 0, buy: 0, fed: 0, keep: 0, pickup: 0, lost: 0, buysAfterDeath: 0, deathsBeforeBuy: [] }); return S.get(n); };

for (const line of fs.readFileSync(E + 'rounds_all.jsonl', 'utf8').split('\n')) {
  if (!line.trim()) continue;
  let g; try { g = JSON.parse(line); } catch (e) { continue; }
  if (!g.rounds) continue;
  const st = {}; // nick -> {has:bool, sinceDeath:int}
  for (const r of g.rounds) {
    const clanMap = {};
    for (const p of r.players) (clanMap[p.clan] = clanMap[p.clan] || []).push(p);
    for (const p of r.players) {
      const a = acc(p.nick);
      a.R++;
      const s = st[p.nick] = st[p.nick] || { has: false, sd: 99 };
      const isBuy = (p.spent >= 4750 && p.spent <= 4850) || (p.spent >= 5750 && p.spent <= 7000 && p.got < 4700);
      const alive = p.d === 0;
      if (isBuy) {
        a.buy++;
        if (s.sd === 1 || s.sd === 2) a.buysAfterDeath++;
        s.has = true;
      } else if (p.got >= 4700) { a.fed++; s.has = true; }
      else if (s.has && alive && p.save >= 4000) { a.keep++; }
      else if (s.has && !alive) { a.lost++; s.has = false; }
      else if (!s.has && p.wval === 4750) { a.pickup++; s.has = true; }
      if (alive) { if (s.sd < 99) s.sd++; } else s.sd = 0;
    }
  }
}
const rows = [...S.entries()].map(([n, a]) => ({
  nick: n, R: a.R,
  buy: +(100 * a.buy / a.R).toFixed(1), fed: +(100 * a.fed / a.R).toFixed(1),
  keep: +(100 * a.keep / a.R).toFixed(1), pickup: +(100 * a.pickup / a.R).toFixed(1), lost: +(100 * a.lost / a.R).toFixed(1),
  fastRebuy: a.buy ? Math.round(100 * a.buysAfterDeath / a.buy) : 0
})).filter(r => r.R >= 2000).sort((a, b) => b.fed - a.fed);
console.log('nick'.padEnd(13), 'R'.padStart(5), '自购%'.padStart(6), '被喂%'.padStart(6), '自保%'.padStart(6), '捡枪%'.padStart(6), '丢失%'.padStart(6), '死后速购%'.padStart(8));
for (const r of rows) console.log(r.nick.padEnd(13), String(r.R).padStart(5), String(r.buy).padStart(6), String(r.fed).padStart(6), String(r.keep).padStart(6), String(r.pickup).padStart(6), String(r.lost).padStart(6), String(r.fastRebuy).padStart(8));
fs.writeFileSync(E + 'awp_behavior_v2.json', JSON.stringify(rows, null, 1));
console.log('rows:', rows.length);
