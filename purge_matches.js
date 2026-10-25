// Purge non-official matches (in-house/private club/showmatch) from match_r30 and rebuild
const fs = require('fs');
const path = 'E:/cs2_econ_2026/';
const meta = require(path + 'hltv_match_meta.json');
const SUSP = /in house|private club|showmatch|res showdown|copenhagen gaming week/i;
const r30 = fs.readFileSync(path + 'match_r30.jsonl', 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
const clean = [], purged = [];
for (const m of r30) {
  const mt = meta[m.match_id];
  const bad = mt && new Date(mt.date).getFullYear() === 2026 && SUSP.test(mt.event);
  (bad ? purged : clean).push(m);
}
fs.writeFileSync(path + 'match_r30_clean.jsonl', clean.map(m => JSON.stringify(m)).join('\n'));
fs.writeFileSync(path + 'match_r30_purged_ids.json', JSON.stringify(purged.map(m => m.match_id)));
console.log('clean matches:', clean.length, 'purged:', purged.length);

// rebuild season r30 aggregates (same logic as agg_r30.js: per pid per map, average)
const agg = new Map();
for (const m of clean) for (const mp of m.maps) {
  if (!mp.players || !mp.players.length) continue;
  const vals = mp.players.filter(p => p.rating != null);
  if (!vals.length) continue;
  for (const p of vals) {
    let a = agg.get(String(p.pid));
    if (!a) a = { nick: (p.nick || '').replace(/<[^>]*>/g, ''), sum: 0, n: 0, kast: 0, kn: 0 };
    a.sum += parseFloat(p.rating); a.n++;
    if (p.kast != null) { a.kast += parseFloat(p.kast); a.kn++; }
    agg.set(String(p.pid), a);
  }
}
const out = [];
for (const [pid, a] of agg) out.push({ pid, nick: a.nick, maps: a.n, r30: +(a.sum / a.n).toFixed(3), kast: a.kn ? +(a.kast / a.kn).toFixed(1) : null });
out.sort((a, b) => b.maps - a.maps);
fs.writeFileSync(path + 'season_r30_clean.json', JSON.stringify(out));
console.log('season rows:', out.length);
// sanity anchors
for (const k of ['ZywOo', 'donk', 'TeSeS', 'm0NESY', 'karrigan', 'kyousuke', 'NiKo', 'sh1ro']) {
  const p = require(path + 'hltv_ids.json').find(x => x[0] === k);
  if (p) { const r = out.find(x => String(x.pid) === String(p[1])); console.log(k, r ? r.r30 + ' (' + r.maps + ' maps)' : 'MISSING'); }
}
