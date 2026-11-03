// Falcons intra-team gun flow BY ECONOMY TIER (and T/CT for full)
// eco=-1, low=0, force=1, full=2. Give = same-round same-team equal-amount gave->got pairing (enemy excluded).
const fs = require('fs');
const readline = require('readline');
const E = 'E:/cs2_econ_2026/';
const FIVE = { '23037': 'TeSeS', '17522': 'NiKo', '17524': 'karrigan', '25998': 'm0NESY', '51876': 'kyousuke' };
const TIERS = { '-1': 'eco', '0': 'low', '1': 'force', '2': 'full' };

async function main() {
  const rl = readline.createInterface({ input: fs.createReadStream(E + 'rounds_all_final.jsonl'), crlf: false });
  // tier -> {rounds, per:{pid:{rounds,gave,got}}, pair:{"g>r":$}}
  const T = {};
  for (const k of Object.keys(TIERS)) T[k] = { rounds: 0, per: new Map(), pair: new Map() };
  // full tier T/CT split
  const S = { T: { rounds: 0, per: new Map(), pair: new Map() }, CT: { rounds: 0, per: new Map(), pair: new Map() } };
  let games = 0;
  for await (const ln of rl) {
    if (!ln.trim()) continue;
    let g; try { g = JSON.parse(ln); } catch { continue; }
    if (!g.rounds || g.error) continue;
    games++;
    for (const r of g.rounds) {
      const fal = (r.players || []).filter(p => (p.clan === 'Falcons' || p.clan === 'Team Falcons') && p.pid !== undefined && FIVE[String(p.pid)]);
      if (!fal.length) continue;
      const eco = String(fal[0].eco);
      const tgt = T[eco]; if (!tgt) continue;
      tgt.rounds++;
      const doPair = (bucket, side) => {
        bucket.rounds++;
        for (const p of fal) {
          const pid = String(p.pid);
          let a = bucket.per.get(pid); if (!a) { a = { rounds: 0, gave: 0, got: 0 }; bucket.per.set(pid, a); }
          a.rounds++;
        }
        const gives = [], gots = [];
        for (const p of fal) {
          if ((p.gave || 0) > 0) gives.push({ pid: String(p.pid), rem: p.gave });
          if ((p.got || 0) > 0) gots.push({ pid: String(p.pid), rem: p.got });
        }
        let gi = 0, ri = 0;
        while (gi < gives.length && ri < gots.length) {
          const gv = gives[gi], rv = gots[ri];
          const take = Math.min(gv.rem, rv.rem);
          if (gv.pid !== rv.pid) {
            const key = gv.pid + '>' + rv.pid;
            bucket.pair.set(key, (bucket.pair.get(key) || 0) + take);
            bucket.per.get(gv.pid).gave += take;
            bucket.per.get(rv.pid).got += take;
          }
          gv.rem -= take; rv.rem -= take;
          if (gv.rem <= 0) gi++; if (rv.rem <= 0) ri++;
        }
      };
      doPair(tgt);
      if (eco === '2') {
        const side = fal[0].side === 'CT' ? 'CT' : 'T'; // falcons side this round
        doPair(S[side], side);
      }
    }
  }
  const name = pid => FIVE[pid] || pid;
  for (const [tk, b] of Object.entries(T)) {
    console.log(`\n===== ${TIERS[tk].toUpperCase()} ===== 回合数 ${b.rounds}`);
    const rows = [...b.per].map(([pid, a]) => ({ nick: name(pid), rounds: a.rounds, gave: a.gave, got: a.got, g_r: +(a.gave / a.rounds).toFixed(1), got_r: +(a.got / a.rounds).toFixed(1), net: +((a.gave - a.got) / a.rounds).toFixed(1) })).sort((x, y) => y.g_r - x.g_r);
    for (const r of rows) console.log(`${r.nick.padEnd(9)} 发 $${r.g_r}/r  收 $${r.got_r}/r  净 ${r.net >= 0 ? '+' : ''}${r.net}/r  (总发 $${Math.round(r.gave).toLocaleString()})`);
    const pairs = [...b.pair].sort((a, b2) => b2[1] - a[1]).slice(0, 6);
    if (pairs.length) console.log('  主要流向: ' + pairs.map(([k, v]) => `${name(k.split('>')[0])}→${name(k.split('>')[1])} $${Math.round(v).toLocaleString()}`).join(' | '));
    else console.log('  （该档几乎没有队内转移）');
  }
  for (const [sk, b] of Object.entries(S)) {
    console.log(`\n===== 满枪局·${sk} 方 ===== 回合数 ${b.rounds}`);
    const rows = [...b.per].map(([pid, a]) => ({ nick: name(pid), g_r: +(a.gave / a.rounds).toFixed(1), got_r: +(a.got / a.rounds).toFixed(1), net: +((a.gave - a.got) / a.rounds).toFixed(1) })).sort((x, y) => y.g_r - x.g_r);
    for (const r of rows) console.log(`${r.nick.padEnd(9)} 发 $${r.g_r}/r  收 $${r.got_r}/r  净 ${r.net >= 0 ? '+' : ''}${r.net}/r`);
    const pairs = [...b.pair].sort((a, b2) => b2[1] - a[1]).slice(0, 5);
    console.log('  主要流向: ' + (pairs.length ? pairs.map(([k, v]) => `${name(k.split('>')[0])}→${name(k.split('>')[1])} $${Math.round(v).toLocaleString()}`).join(' | ') : '（无）'));
  }
}
main().catch(e => { console.error(e); process.exit(1); });
