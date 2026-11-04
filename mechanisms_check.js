// mechanisms_check.js — respond to m02932:
// Q1 口径: does gave/got include death-drops & floor-pickups, or only active transfers?
// Q2 机制检验: why is m0NESY the biggest giver & karrigan/TeSeS receivers?
const fs = require('fs');
const readline = require('readline');
const E = 'E:/cs2_econ_2026/';

const FALCONS = new Set(['23037', '17522', '17524', '25998', '51876']); // official pids
const NAMES = { '23037': 'TeSeS', '17522': 'NiKo', '17524': 'karrigan', '25998': 'm0NESY', '51876': 'kyousuke' };

async function main() {
  const rl = readline.createInterface({ input: fs.createReadStream(E + 'rounds_all_final.jsonl'), crlf: false });

  // --- E1: gave amount histogram (whole league) ---
  const gaveHist = new Map();
  // --- E2: giver alive vs dead: gave amounts (Falcons five) ---
  const gAlive = new Map(), gDead = new Map();
  // --- E3 pickup test: receiver got vs friendly deaths in round (Falcons five) ---
  const gotNoDeaths = { n: 0, sum: 0 }, gotWithDeaths = { n: 0, sum: 0 }, gotWipe = { n: 0, sum: 0 };
  // --- E7 wallet-pressure: per player (league, >=500 rounds): save-based surplus vs gave ---
  const wallet = new Map(); // pid -> {nick, rounds, gave, got, save, spent, k, alive}
  // --- karrigan util spending (Falcons) ---
  const util5 = new Map();

  let games = 0;
  for await (const ln of rl) {
    if (!ln.trim()) continue;
    let j; try { j = JSON.parse(ln); } catch { continue; }
    if (j.error || !j.rounds) continue; games++;
    for (const r of j.rounds) {
      const ps = r.players || [];
      for (const p of ps) {
        const pid = String(p.pid);
        const gave = p.gave || 0, got = p.got || 0, save = p.save || 0;
        const alive = (p.d || 0) === 0;
        // E1 histogram (bucket to 10)
        if (gave > 0) {
          const b = Math.round(gave / 10) * 10;
          gaveHist.set(b, (gaveHist.get(b) || 0) + 1);
        }
        // E2 Falcons
        if (FALCONS.has(pid)) {
          const m = alive ? gAlive : gDead;
          if (!m.has(pid)) m.set(pid, { n: 0, sum: 0 });
          if (gave > 0) { m.get(pid).n++; m.get(pid).sum += gave; }
          const u = util5.get(pid) || { rounds: 0, util: 0, spent: 0, save: 0, got: 0, gave: 0, k: 0, d: 0 };
          u.rounds++; u.util += p.util || 0; u.spent += p.spent || 0; u.save += save; u.got += got; u.gave += gave; u.k += p.k || 0; u.d += p.d || 0;
          util5.set(pid, u);
          // E3 pickup test for this receiver
          const friendlyDeaths = ps.filter(q => q.clan && /falcons/i.test(q.clan) && (q.d || 0) > 0).length;
          const enemyDeaths = ps.filter(q => q.clan && !/falcons/i.test(q.clan) && (q.d || 0) > 0).length;
          const key = enemyDeaths >= 4 ? gotWipe : (friendlyDeaths === 0 ? gotNoDeaths : gotWithDeaths);
          key.n++; key.sum += got;
        }
        // E7 wallet (league)
        let w = wallet.get(pid);
        if (!w) { w = { nick: p.nick, rounds: 0, gave: 0, got: 0, save: 0, spent: 0, k: 0, aliveR: 0 }; wallet.set(pid, w); }
        w.rounds++; w.gave += gave; w.got += got; w.save += save; w.spent += p.spent || 0; w.k += p.k || 0; if (alive) w.aliveR++;
      }
    }
  }
  console.log('games', games);

  // E1: top modes
  const top = [...gaveHist.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15);
  console.log('\nE1 gave amount modes (bucket$10 -> count):', top.map(([v, c]) => `$${v}:${c}`).join('  '));

  // E2 alive vs dead gave
  console.log('\nE2 Falcons gave by giver vitality:');
  for (const pid of FALCONS) {
    const a = gAlive.get(pid) || { n: 0, sum: 0 }, d = gDead.get(pid) || { n: 0, sum: 0 };
    console.log(`  ${NAMES[pid]}: aliveR-gave ${a.n} avg $${a.n ? Math.round(a.sum / a.n) : 0} | deadR-gave ${d.n} avg $${d.n ? Math.round(d.sum / d.n) : 0}`);
  }

  // E3 pickup test
  const avg = o => o.n ? Math.round(o.sum / o.n) : 0;
  console.log(`\nE3 pickup test (Falcons receivers): got avg when friendlyDeaths=0: $${avg(gotNoDeaths)} (n=${gotNoDeaths.n}) | 1-3 deaths: $${avg(gotWithDeaths)} (n=${gotWithDeaths.n}) | enemyWipe(>=4): $${avg(gotWipe)} (n=${gotWipe.n})`);

  // E7 wallet pressure: surplus = save + killMoney(300k, awp n/a) - spent; correlate with gave
  const rows = [];
  for (const [pid, w] of wallet) {
    if (w.rounds < 500) continue;
    const killMoney = w.k * 270; // blended kill reward approx
    const surplus = (w.save + killMoney - w.spent) / w.rounds;
    rows.push({ nick: w.nick, rounds: w.rounds, surplus: Math.round(surplus), gaveR: +(w.gave / w.rounds).toFixed(1), gotR: +(w.got / w.rounds).toFixed(1), aliveRate: +(w.aliveR / w.rounds).toFixed(3) });
  }
  // correlation surplus vs gaveR
  const n = rows.length;
  const mean = f => rows.reduce((s, r) => s + f(r), 0) / n;
  const mS = mean(r => r.surplus), mG = mean(r => r.gaveR);
  let cov = 0, vS = 0, vG = 0;
  for (const r of rows) { const a = r.surplus - mS, b = r.gaveR - mG; cov += a * b; vS += a * a; vG += b * b; }
  const corr = cov / Math.sqrt(vS * vG);
  console.log(`\nE7 wallet-surplus vs gave/round: n=${n} corr=${corr.toFixed(3)}`);
  // falcons five rows
  console.log('Falcons five (surplus $/r | gave $/r | got $/r | aliveRate):');
  for (const pid of FALCONS) { const r = rows.find(x => x.nick === NAMES[pid]); if (r) console.log(`  ${r.nick}: $${r.surplus} | ${r.gaveR} | ${r.gotR} | ${r.aliveRate}`); }
  // top10 surplus and top10 gave
  const byS = [...rows].sort((a, b) => b.surplus - a.surplus).slice(0, 8).map(r => `${r.nick} $${r.surplus}`).join(', ');
  const byG = [...rows].sort((a, b) => b.gaveR - a.gaveR).slice(0, 8).map(r => `${r.nick} $${r.gaveR}`).join(', ');
  console.log('top8 surplus:', byS);
  console.log('top8 gave:', byG);

  // karrigan util vs others
  console.log('\nkarrigan util/spent (Falcons five, $/round):');
  for (const [pid, u] of util5) console.log(`  ${NAMES[pid]}: util $${(u.util / u.rounds).toFixed(1)} spent $${(u.spent / u.rounds).toFixed(0)} save $${(u.save / u.rounds).toFixed(0)} aliveRate ${(1 - u.d / u.rounds).toFixed(3)}`);
}
main().catch(e => { console.error(e); process.exit(1); });
