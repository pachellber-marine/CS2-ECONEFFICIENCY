// Rebuild tables 2/3/4 with official nicknames + ever-top20 roster filter
// Table2: KPR eco vs full (from rounds_all_final.jsonl, pid in roster whitelist)
// Table3: marginal elasticity (same stream, thresholds eco>=150 full>=400, rounds>=500? no: old marginal used pts OLS n>=200 only for ols; tiers threshold 150/400)
// Table4: layers filtered by team in ever-top20, pid -> official nick
const fs = require('fs');
const E = 'E:/cs2_econ_2026/';
const readline = require('readline');

const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

// --- roster whitelist ---
const sl = JSON.parse(fs.readFileSync(E + 'stats_list_2026_byTeam.json', 'utf8'));
const roster = new Map(); // pid -> {nick, team}
for (const r of sl) {
  const pid = String(r.player.id);
  if (!roster.has(pid)) roster.set(pid, { nick: r.player.nickname, team: r.hltv_team });
}
console.log('roster pids:', roster.size);

// --- ever-top20 team set ---
const weeks = JSON.parse(fs.readFileSync(E + 'weeks_progress.json', 'utf8'));
const ever20 = new Set();
for (const [k, arr] of Object.entries(weeks)) for (const t of (arr || [])) ever20.add(norm(t));
console.log('ever20 teams:', ever20.size);

// official team display names from roster (hltv_team)
const pidTeam = new Map(); for (const [pid, v] of roster) pidTeam.set(pid, v.team);

// --- stream rounds_all_final.jsonl ---
const agg = new Map(); // pid -> {nick,team,ecoR,ecoK,fullR,fullK,spE,spF,rounds,pts}
async function main() {
  const rl = readline.createInterface({ input: fs.createReadStream(E + 'rounds_all_final.jsonl'), crlf: false });
  let games = 0, bad = 0;
  for await (const ln of rl) {
    if (!ln.trim()) continue;
    let j; try { j = JSON.parse(ln); } catch (e) { continue; }
    if (j.error) continue; games++;
    for (const r of (j.rounds || [])) {
      for (const p of (r.players || [])) {
        const pid = String(p.pid);
        const R = roster.get(pid);
        if (!R) continue; // filter non-roster
        let a = agg.get(pid);
        if (!a) { a = { nick: R.nick, team: R.team, ecoR: 0, ecoK: 0, fullR: 0, fullK: 0, spE: 0, spF: 0, hR: 0, hK: 0, hSp: 0, rounds: 0, pts: [] }; agg.set(pid, a); }
        a.rounds++;
        const k = p.k || 0, sp = p.spent || 0;
        const eco = p.eco;
        if (eco === -1) { a.hR++; a.hK += k; a.hSp += sp; a.ecoR++; a.ecoK += k; a.spE += sp; } // hard eco: T3; also in T2 eco
        else if (eco === 0) { a.ecoR++; a.ecoK += k; a.spE += sp; } // low joins T2 eco
        else if (eco === 2) { a.fullR++; a.fullK += k; a.spF += sp; }
        if (a.pts.length < 3000) a.pts.push([sp, k + (p.dmg || 0) / 100]);
      }
    }
  }
  console.log('games:', games, 'roster players seen:', agg.size, 'bad:', bad);

  function ols(pts) {
    const n = pts.length; if (n < 200) return null;
    let sx = 0, sy = 0, sxx = 0, sxy = 0;
    for (const [x, y] of pts) { sx += x; sy += y; sxx += x * x; sxy += x * y; }
    const cov = sxy / n - (sx / n) * (sy / n), varx = sxx / n - (sx / n) ** 2;
    if (varx <= 0) return null;
    return { slope: cov / varx, n };
  }

  // Table2 + Table3 rows
  const t2 = [], t3 = [];
  for (const [pid, a] of agg) {
    if (a.ecoR < 150 || a.fullR < 400) continue;
    const kprE = a.ecoK / a.ecoR, kprF = a.fullK / a.fullR;
    const pP = (a.ecoK + a.fullK) / (a.ecoR + a.fullR);
    const se = Math.sqrt(pP * (1 - pP) * (1 / a.ecoR + 1 / a.fullR));
    const z = se > 0 ? (kprE - kprF) / se : 0;
    // marginal (T3): hard eco only
    const hR = a.hR, hK = a.hK, hSp = a.hSp;
    if (hR < 150 || a.fullR < 400) { t2.push({ pid, nick: a.nick, team: a.team, rounds: a.rounds, ecoR: a.ecoR, fullR: a.fullR, kprEco: +kprE.toFixed(3), kprFull: +kprF.toFixed(3), rel: +(kprE / kprF).toFixed(3), z: +z.toFixed(2) }); continue; }
    const kprH = hK / hR;
    const spE = hSp / hR, spF = a.spF / a.fullR;
    const dSp = spF - spE, dK = kprF - kprH;
    const marginal = dSp > 0 ? dK / dSp : 0;
    const elasticity = dSp > 0 ? marginal * ((spE + spF) / 2) / ((kprH + kprF) / 2) : 0;
    const fit = ols(a.pts);
    t2.push({ pid, nick: a.nick, team: a.team, rounds: a.rounds, ecoR: a.ecoR, fullR: a.fullR, kprEco: +kprE.toFixed(3), kprFull: +kprF.toFixed(3), rel: +(kprE / kprF).toFixed(3), z: +z.toFixed(2) });
    t3.push({ pid, nick: a.nick, team: a.team, kprEco: +kprH.toFixed(3), kprFull: +kprF.toFixed(3), spendEco: Math.round(spE), spendFull: Math.round(spF), marginalKPD: +(marginal * 1000).toFixed(2), elasticity: +elasticity.toFixed(3), olsSlope: fit ? +(fit.slope * 1000).toFixed(2) : null });
  }
  t2.sort((a, b) => b.z - a.z);
  t3.sort((a, b) => b.elasticity - a.elasticity);
  console.log('T2 rows:', t2.length, 'T3 rows:', t3.length);
  // anchors
  const find = (arr, nick) => arr.findIndex(r => norm(r.nick) === norm(nick));
  const anchors = ['TeSeS', 'donk', 'xKacpersky', 'kyousuke', 'karrigan', 'm0NESY', 'Jee'];
  for (const an of anchors) {
    const i2 = find(t2, an), i3 = find(t3, an);
    console.log(`ANCHOR ${an}: T2#${i2 + 1} rel=${i2 >= 0 ? t2[i2].rel : '-'} | T3#${i3 + 1} ela=${i3 >= 0 ? t3[i3].elasticity : '-'}`);
  }
  fs.writeFileSync(E + 'players_ecokpr_official.json', JSON.stringify(t2, null, 1));
  fs.writeFileSync(E + 'players_marginal_official.json', JSON.stringify(t3, null, 1));

  // --- Table4: layers filter ---
  const lay = JSON.parse(fs.readFileSync(E + 'players_layers_full.json', 'utf8'));
  console.log('layers rows:', lay.length, 'fields:', Object.keys(lay[0]).join(','));
  // p30 official nick by HLTV pid
  const p30 = JSON.parse(fs.readFileSync(E + 'players_final_season30_clean.json', 'utf8'));
  const pidNick = new Map(p30.map(p => [String(p.pid), p.nick]));
  let t4 = [];
  for (const r of lay) {
    const teamNorm = norm(r.team);
    if (!ever20.has(teamNorm)) continue;
    const offNick = pidNick.get(String(r.pid)) || r.nick;
    t4.push({ ...r, nick: offNick });
  }
  t4.sort((a, b) => (b.ALL || 0) - (a.ALL || 0));
  console.log('T4 rows after filter:', t4.length);
  const i4 = t4.findIndex(r => norm(r.nick) === norm('TeSeS'));
  console.log('ANCHOR TeSeS T4#' + (i4 + 1), JSON.stringify(t4[i4]));
  fs.writeFileSync(E + 'players_layers_official.json', JSON.stringify(t4));
  console.log('DONE');
}
main().catch(e => { console.error(e); process.exit(1); });
