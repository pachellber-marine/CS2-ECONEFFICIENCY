// Falcons five-man net gun economy, April 1 onward (karrigan era)
// net = gave - got (matched 1:1 same-round same-team), by tier
const fs = require('fs');
const readline = require('readline');
const E = 'E:/cs2_econ_2026/';
const FIVE = { '23037': 'TeSeS', '17522': 'NiKo', '17524': 'karrigan', '25998': 'm0NESY', '51876': 'kyousuke' };
const TIER = { '-1': 'eco', '0': 'low', '1': 'force', '2': 'full' };
const CUTOFF = '2026-04-01';

async function main() {
  // gameId -> date, from matches_2026_byTeam.json (Falcons entries carry for_game_ids + match_start_date)
  const mt = JSON.parse(fs.readFileSync(E + 'matches_2026_byTeam.json', 'utf8'));
  const g2date = new Map();
  for (const t of mt) {
    if (!/falcon/i.test(t.team || '')) continue;
    for (const m of t.matches) {
      if (!m.for_game_ids || !m.match_start_date) continue;
      for (const gid of m.for_game_ids) g2date.set(String(gid), m.match_start_date.slice(0, 10));
    }
  }
  console.log('Falcons games with date:', g2date.size);

  const rl = readline.createInterface({ input: fs.createReadStream(E + 'rounds_all_final.jsonl'), crlf: false });
  // per player: {gave, got, rounds} overall and per tier
  const agg = new Map();
  for (const n of Object.values(FIVE)) agg.set(n, { all: mk(), tiers: { eco: mk(), low: mk(), force: mk(), full: mk() } });
  function mk() { return { gave: 0, got: 0, rounds: 0 }; }
  let games = 0, kept = 0, skipped = 0;
  for await (const ln of rl) {
    if (!ln.trim()) continue;
    let g; try { g = JSON.parse(ln); } catch { continue; }
    if (g.error || !g.rounds) continue;
    games++;
    const d = g2date.get(String(g.game_id));
    if (!d || d < CUTOFF) { skipped++; continue; }
    kept++;
    for (const r of g.rounds) {
      // FIFO 1:1 matching of gave->got within same round & same clan
      const evs = [];
      for (const p of (r.players || [])) {
        if (FIVE[String(p.pid)] && (p.clan || '').match(/falcon/i)) evs.push(p);
      }
      if (evs.length < 2) continue;
      const givers = [], recvers = [];
      for (const p of evs) {
        if ((p.gave || 0) > 0) givers.push({ pid: String(p.pid), amt: p.gave });
        if ((p.got || 0) > 0) recvers.push({ pid: String(p.pid), amt: p.got });
      }
      const pairs = [];
      let gi = 0, ri = 0;
      while (gi < givers.length && ri < recvers.length) {
        const a = Math.min(givers[gi].amt, recvers[ri].amt);
        pairs.push([givers[gi].pid, recvers[ri].pid, a]);
        givers[gi].amt -= a; recvers[ri].amt -= a;
        if (givers[gi].amt === 0) gi++;
        if (recvers[ri].amt === 0) ri++;
      }
      for (const n of Object.values(FIVE)) {
        const row = evs.find(p => FIVE[String(p.pid)] === n);
        if (!row) continue;
        const tier = TIER[String(row.eco)];
        const pid = String(row.pid);
        const add = (o, gAmt, rAmt) => { o.gave += gAmt; o.got += rAmt; o.rounds++; };
        const gAmt = pairs.filter(p => p[0] === pid).reduce((s, p) => s + p[2], 0);
        const rAmt = pairs.filter(p => p[1] === pid).reduce((s, p) => s + p[2], 0);
        add(agg.get(n).all, gAmt, rAmt);
        if (tier) add(agg.get(n).tiers[tier], gAmt, rAmt);
      }
    }
  }
  console.log('games total', games, 'kept(after', CUTOFF + ')', kept, 'skipped', skipped);
  const NAMES = ['m0NESY', 'NiKo', 'kyousuke', 'TeSeS', 'karrigan'];
  for (const tier of ['all', 'eco', 'low', 'force', 'full']) {
    console.log('\n== ' + tier.toUpperCase() + ' ==');
    for (const n of NAMES) {
      const o = tier === 'all' ? agg.get(n).all : agg.get(n).tiers[tier];
      const net = o.gave - o.got;
      console.log(`${n}\trounds=${o.rounds}\tgave=${o.gave}\tgot=${o.got}\tnet=${net}\tnet/r=${(net / o.rounds).toFixed(1)}\tgave/r=${(o.gave / o.rounds).toFixed(1)}\tgot/r=${(o.got / o.rounds).toFixed(1)}`);
    }
  }
  fs.writeFileSync(E + 'falcons_net_apr.json', JSON.stringify(agg, null, 1));
  console.log('saved falcons_net_apr.json');
}
main().catch(e => { console.error(e); process.exit(1); });
