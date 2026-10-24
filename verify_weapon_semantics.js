// verify_weapon_semantics.js — NO GUESSING: empirically test field semantics in rounds_all.jsonl
const fs = require('fs');
const E = 'E:/cs2_econ_2026/';

let nRound = 0, nDeath = 0, aliveW = { c: 0, nz: 0 }, deadW = { c: 0, nz: 0 };
const wvalHist = {};                       // wval value histogram
let gaveEqGot = 0, gaveNeGot = 0;          // per-round sum(gave) vs sum(got)
let crossClan = 0, intraClan = 0, gotNoGiver = 0, gaveNoGetter = 0, nGotEv = 0, nGaveEv = 0;
let saveThenW = 0, saveThenWtot = 0;       // survived with save>0 next round wval?
const primResid = {};                      // eq-util-add-pval histogram when wval==4750 (death+dropped AWP?)
let w4750alive = 0, w4750dead = 0;

for (const line of fs.readFileSync(E + 'rounds_all.jsonl', 'utf8').split('\n')) {
  if (!line.trim()) continue;
  let g; try { g = JSON.parse(line); } catch (e) { continue; }
  if (!g.rounds) continue;
  for (const r of g.rounds) {
    nRound++;
    const byClan = {};
    let sg = 0, st = 0;
    for (const p of r.players) {
      (byClan[p.clan] = byClan[p.clan] || []).push(p);
      if (p.wval) wvalHist[p.wval] = (wvalHist[p.wval] || 0) + 1;
      if (p.d === 1) { nDeath++; deadW.c++; if (p.wval) deadW.nz++; }
      else { aliveW.c++; if (p.wval) aliveW.nz++; }
      if (p.wval === 4750) { p.d === 1 ? w4750dead++ : w4750alive++; const resid = p.eq - p.util - p.add - p.pval - p.wval; primResid[resid] = (primResid[resid] || 0) + 1; }
    }
    for (const c in byClan) for (const p of byClan[c]) { sg += p.gave; st += p.got; }
    if (Math.abs(sg - st) < 1) gaveEqGot++; else gaveNeGot++;
    // transfer matching within clan
    for (const c in byClan) {
      const givers = byClan[c].filter(p => p.gave > 0), getters = byClan[c].filter(p => p.got > 0);
      nGaveEv += givers.length; nGotEv += getters.length;
      // greedy match by value within $50
      const gv = givers.map(p => p.gave), used = new Set();
      for (const q of getters) {
        let m = false;
        for (let i = 0; i < gv.length; i++) if (!used.has(i) && Math.abs(gv[i] - q.got) <= 50) { used.add(i); m = true; break; }
        if (m) intraClan++; else gotNoGiver++;
      }
      crossClan += getters.filter(q => true).length - [...used].length ? 0 : 0; // skip
    }
    // cross-clan: got players whose value matches a giver in OPPOSING clan
    for (const c in byClan) {
      const getters = byClan[c].filter(p => p.got > 0);
      const otherGivers = [];
      for (const c2 in byClan) if (c2 !== c) for (const p of byClan[c2]) if (p.gave > 0) otherGivers.push(p.gave);
      for (const q of getters) {
        let mIntra = false;
        for (const p of byClan[c]) if (p !== q && p.gave > 0 && Math.abs(p.gave - q.got) <= 50) { mIntra = true; break; }
        if (mIntra) intraClan++;
        else if (otherGivers.some(v => Math.abs(v - q.got) <= 50)) crossClan++;
        else gotNoGiver++;
      }
    }
  }
}
console.log('rounds:', nRound, 'players:', nRound * 10, 'deaths:', nDeath);
console.log('wval nonzero: alive', aliveW.nz, '/', aliveW.c, ' dead', deadW.nz, '/', deadW.c);
console.log('wval==4750: alive', w4750alive, ' dead', w4750dead);
console.log('top wval values:', Object.entries(wvalHist).sort((a, b) => b[1] - a[1]).slice(0, 12));
console.log('primResid (eq-util-add-pval-wval) when wval=4750:', Object.entries(primResid).sort((a, b) => b[1] - a[1]).slice(0, 6));
console.log('round sum(gave)==sum(got):', gaveEqGot, ' vs !=:', gaveNeGot);
console.log('got events: intra-clan matched', intraClan, ' cross-clan matched', crossClan, ' no-giver', gotNoGiver);
