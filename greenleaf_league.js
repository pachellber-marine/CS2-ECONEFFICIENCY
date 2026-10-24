const fs = require('fs');
const E = 'E:/cs2_econ_2026/';
const RL = JSON.parse(fs.readFileSync(E + 'players_roundlevel.json', 'utf8'));
const P = new Map(require(E + 'players_final_season30.json').map(p => [p.nick, p]));
// league-wide medians
const gs = RL.map(r => r.got_r).sort((a,b)=>a-b); const mGot = gs[Math.floor(gs.length/2)];
const ss = RL.map(r => r.spent).sort((a,b)=>a-b); const mSpent = ss[Math.floor(ss.length/2)];
console.log('league median got=$'+mGot.toFixed(0), 'spent=$'+mSpent.toFixed(0), 'n='+RL.length);
const rows = [];
for (const r of RL) {
  const p = P.get(r.nick); if (!p) continue;
  const eatsLittle = r.got_r < mGot && r.spent < mSpent;
  const contrib = r.util_r >= 160 && (p.r30_season >= 1.05 || r.kpr_low >= 0.45);
  if (eatsLittle && contrib) rows.push({nick:r.nick, team:r.team, role:r.role, spent:Math.round(r.spent), got:Math.round(r.got_r), gave:Math.round(r.gave_r), util:Math.round(r.util_r), kprLow:r.kpr_low, r30:+p.r30_season.toFixed(3), resil:null});
}
rows.sort((a,b)=> (b.util+b.r30*100) - (a.util+a.r30*100));
console.log('\n真绿叶榜(全联盟双低于中位+util>=160+产出达标):');
rows.forEach(r=>console.log(' ', r.nick.padEnd(12), r.team.padEnd(13), r.role.padEnd(10), '$'+String(r.spent).padStart(4), 'got=$'+String(r.got).padStart(3), 'gave=$'+String(r.gave).padStart(3), 'util=$'+r.util, 'kprLow='+r.kprLow, 'r30='+r.r30));
console.log('total:', rows.length);
