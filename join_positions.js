// join positions DB (Tableau) with economy data (bo3.gg), fuzzy name match
const fs = require('fs');
const path = require('path');
const DIR = 'E:/cs2_econ_2026';
const raw = fs.readFileSync(path.join(DIR, 'tableau_positions_raw.csv'), 'utf8');
function parseCSVLine(l) {
  const out = []; let cur = '', inq = false;
  for (let i = 0; i < l.length; i++) {
    const c = l[i];
    if (inq) { if (c === '"' && l[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') inq = false; else cur += c; }
    else if (c === '"') inq = true;
    else if (c === ',') { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur); return out;
}
const lines = raw.split('\n').filter(l => l.trim());
const hdr = parseCSVLine(lines[0]);
const pos = lines.slice(1).map(l => {
  const v = parseCSVLine(l);
  const o = {}; hdr.forEach((h, i) => o[h.trim()] = v[i]);
  return o;
});
console.log('positions rows:', pos.length);
// team name normalize: tableau uses e.g. 'Falcons','1WIN','magic','Astralis','FUT','The MongolZ','GamerLegion'
const players = JSON.parse(fs.readFileSync(path.join(DIR, 'players_final.json'), 'utf8'));
const norm = s => s.toLowerCase().replace(/[^a-z0-9]/g, '');
const posIdx = new Map(pos.map(p => [norm(p.Name), p]));
let matched = 0, unmatched = [];
for (const p of players) {
  const hit = posIdx.get(norm(p.nick));
  if (hit) { matched++; p.pos_role = hit.Role; p.pos_ct_role = hit['CT Role'] || hit['CT Role'.trim()]; p.pos_t_role = hit['T Role']; p.age = hit.Age; p.xADR_CT = hit['xADR (CT)']; p.xADR_T = hit['xADR (T)']; p.pos_rating_last12 = hit['T Last12 Rating']; p.pos_team = hit.Team; }
  else unmatched.push(p.nick + '(' + p.mainTeam + ')');
}
console.log('matched:', matched, 'of', players.length);
console.log('unmatched sample:', unmatched.slice(0, 40).join(', '));
// role distribution & economy by position role
const agg = key => {
  const g = {};
  for (const p of players.filter(x => x[key])) {
    const k = p[key];
    if (!g[k]) g[k] = {n: 0, spent: 0, rating: 0, eff: 0, opening: 0, fk: 0};
    g[k].n++; g[k].spent += p.spent; g[k].rating += p.rating; g[k].eff += p.eff; g[k].opening += p.opening; g[k].fk += p.fk;
  }
  for (const k in g) { const o = g[k]; console.log(k.padEnd(14), 'n=' + String(o.n).padStart(3), 'spent=$' + (o.spent / o.n).toFixed(0), 'rating=' + (o.rating / o.n).toFixed(2), 'eff=' + (o.eff / o.n).toFixed(2), 'opening=' + (o.opening / o.n).toFixed(3), 'fk=' + (o.fk / o.n).toFixed(3)); }
};
console.log('\n=== economy by Tableau position role ===');
agg('pos_role');
fs.writeFileSync(path.join(DIR, 'players_with_positions.json'), JSON.stringify(players, null, 1));
