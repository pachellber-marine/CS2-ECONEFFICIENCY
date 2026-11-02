// Falcons per-map average gun-giving economy (2026, official ids, giver only)
// Give = same round, same team (Falcons), equal-amount 1:1 pairing of gave->got (enemy excluded).
// Per map per player: gave/r (per round played), gave per map; plus receiver breakdown + full-year summary.
const fs = require('fs');
const readline = require('readline');
const E = 'E:/cs2_econ_2026/';

const FALCONS = new Set(['23037', '17522', '17524', '25998', '51876']);
const NICK = { '23037': 'TeSeS', '17522': 'NiKo', '17524': 'karrigan', '25998': 'm0NESY', '51876': 'kyousuke' };

async function main() {
  const rl = readline.createInterface({ input: fs.createReadStream(E + 'rounds_all_final.jsonl'), crlf: false });
  const mapAgg = new Map();   // map -> pid -> {gave, rounds, maps:Set}
  const pairAgg = new Map();  // giverPid -> recvPid -> $ (full year)
  let games = 0, matched = 0, gaveSum = 0, gotSum = 0;
  for await (const ln of rl) {
    if (!ln.trim()) continue;
    let g; try { g = JSON.parse(ln); } catch { continue; }
    if (!g.rounds || g.error) continue;
    games++;
    const map = g.map || 'unknown';
    for (const r of g.rounds) {
      const fal = (r.players || []).filter(p => (p.clan === 'Falcons' || p.clan === 'Team Falcons') && p.pid !== undefined);
      if (!fal.length) continue;
      // per-map per-player bookkeeping (rounds played & raw gave)
      for (const p of fal) {
        const pid = String(p.pid);
        let ma = mapAgg.get(map); if (!ma) { ma = new Map(); mapAgg.set(map, ma); }
        let a = ma.get(pid); if (!a) { a = { gave: 0, rounds: 0, maps: new Set() }; ma.set(pid, a); }
        a.rounds++; a.maps.add(g.game_id);
      }
      // equal-amount sequential pairing: gives FIFO vs gots FIFO
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
          pairAgg.set(key, (pairAgg.get(key) || 0) + take);
          matched += take;
          const ma = mapAgg.get(map); const a = ma.get(gv.pid);
          a.gave += take; // count only matched transfer as "发枪"
        }
        gaveSum += take; gotSum += take;
        gv.rem -= take; rv.rem -= take;
        if (gv.rem <= 0) gi++;
        if (rv.rem <= 0) ri++;
      }
    }
  }
  console.log('games:', games, '| Σmatched gave $' + Math.round(gaveSum).toLocaleString(), 'Σgot $' + Math.round(gotSum).toLocaleString(), '(equal => pairing OK)');

  // per map table
  const rows = [];
  for (const [map, ma] of [...mapAgg].sort()) {
    for (const [pid, a] of ma) {
      if (!FALCONS.has(pid)) continue;
      rows.push({ map, nick: NICK[pid], rounds: a.rounds, maps: a.maps.size, gaveMatched: Math.round(a.gave), gavePerRound: +(a.gave / a.rounds).toFixed(1) });
    }
  }
  fs.writeFileSync(E + 'falcons_givemap.json', JSON.stringify(rows, null, 1));

  // full-year summary
  const sum = new Map();
  for (const r of rows) {
    let s = sum.get(r.nick) || { rounds: 0, gave: 0, maps: new Set() };
    s.rounds += r.rounds; s.gave += r.gaveMatched; s.maps.add(r.map);
    sum.set(r.nick, s);
  }
  console.log('\n=== 2026 全年：Falcons 队内发枪（只算发给队友的钱，同回合等额转移口径）===');
  for (const [nick, s] of [...sum].sort((a, b) => b[1].gave - a[1].gave)) {
    console.log(`${nick}: 全年发枪 $${Math.round(s.gave).toLocaleString()} | ${s.rounds} 回合 / ${s.maps.size} 图 | 平均 $${(s.gave / s.rounds).toFixed(1)}/回合 ≈ $${Math.round(s.gave / s.maps.size).toLocaleString()}/图`);
  }
  console.log('\n=== 谁收到了谁的枪（全年，$）===');
  const byGiver = new Map();
  for (const [k, v] of pairAgg) {
    const [gp, rp] = k.split('>');
    const g = NICK[gp] || gp, r = NICK[rp] || rp;
    let m = byGiver.get(g) || new Map();
    m.set(r, (m.get(r) || 0) + v);
    byGiver.set(g, m);
  }
  for (const [g, m] of [...byGiver].sort((a, b) => b[1] && [...b[1].values()].reduce((x, y) => x + y, 0) - [...a[1].values()].reduce((x, y) => x + y, 0))) {
    const tot = [...m.values()].reduce((x, y) => x + y, 0);
    const parts = [...m].sort((a, b) => b[1] - a[1]).map(([r, v]) => `${r} ${Math.round(v).toLocaleString()}`).join(' / ');
    console.log(`${g} (共 $${Math.round(tot).toLocaleString()}): ${parts}`);
  }
  console.log('\n=== 逐图：每人发枪 $/回合（括号=该图总发枪）===');
  for (const map of [...new Set(rows.map(r => r.map))].sort()) {
    const line = rows.filter(r => r.map === map).sort((a, b) => b.gavePerRound - a.gavePerRound)
      .map(r => `${r.nick} $${r.gavePerRound}`).join(' | ');
    console.log(`${map}: ${line}`);
  }
}
main().catch(e => { console.error(e); process.exit(1); });
