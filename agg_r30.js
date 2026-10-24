// Aggregate per-map official Rating 3.0 from match_r30.jsonl into season-level stats per player
const fs = require('fs');
const lines = fs.readFileSync('E:/cs2_econ_2026/match_r30.jsonl', 'utf8').split('\n').filter(Boolean);
const idMap = JSON.parse(fs.readFileSync('E:/cs2_econ_2026/hltv_ids.json', 'utf8'));
// hltv_ids.json: {nick: pid} or [{nick,pid}]? inspect
const sample = JSON.stringify(idMap).slice(0, 300);
console.log('hltv_ids structure sample:', sample);

const stats = {}; // pid -> {nick, maps, sum, sumKast, sumAdr, kds, matches, byMap}
for (const line of lines) {
  let rec; try { rec = JSON.parse(line); } catch (e) { continue; }
  const matchPids = new Set();
  for (const mp of rec.maps) {
    if (!mp.players) continue;
    for (const p of mp.players) {
      if (!p.pid || !p.rating) continue;
      matchPids.add(p.pid);
      const s = stats[p.pid] || (stats[p.pid] = { nick: null, maps: 0, sum: 0, sumKast: 0, kastN: 0, matches: new Set(), perMap: [] });
      s.maps++; s.sum += parseFloat(p.rating);
      if (p.kast) { s.sumKast += parseFloat(p.kast); s.kastN++; }
      s.matches.add(rec.match_id);
      s.nick = p.nick;
      if (mp.map !== 'ALL') s.perMap.push({ m: rec.match_id, map: mp.map, r: parseFloat(p.rating) });
    }
  }
}
const rows = Object.entries(stats).map(([pid, s]) => ({
  pid, nick: (s.nick || '').replace(/<[^>]+>/g, ''), maps: s.maps, matches: s.matches.size,
  rating30: +(s.sum / s.maps).toFixed(3), avg_kast: s.kastN ? +(s.sumKast / s.kastN).toFixed(1) : null
})).sort((a, b) => b.maps - a.maps);
console.log('players parsed:', rows.length);
console.log('top by maps:', rows.slice(0, 5));
const known = rows.filter(r => ['ZywOo', 'donk', 'TeSeS', 'm0NESY', 'NiKo', 'karrigan', 'kyousuke'].includes(r.nick));
console.log('sanity:', known);
fs.writeFileSync('E:/cs2_econ_2026/season_r30_raw.json', JSON.stringify(rows, null, 1));
