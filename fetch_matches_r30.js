// Fetch all 2026 ever-top20 matches, parse per-map official Rating 3.0 from match page HTML
// Output: E:\cs2_econ_2026\match_r30.jsonl (one line per match), resumable
const fs = require('fs');
const JINA = 'https://r.jina.ai/';
const UA = { 'user-agent': 'Mozilla/5.0', 'X-Return-Format': 'html' };
const OUT = 'E:/cs2_econ_2026/match_r30.jsonl';

const matchIds = JSON.parse(fs.readFileSync('E:/cs2_econ_2026/match_ids.json', 'utf8'));
const done = new Set(), skipped = new Set();
if (fs.existsSync(OUT)) {
  for (const line of fs.readFileSync(OUT, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try { const o = JSON.parse(line); done.add(o.match_id); } catch (e) {}
  }
}
if (fs.existsSync(OUT.replace('.jsonl', '_skipped.json'))) {
  for (const line of fs.readFileSync(OUT.replace('.jsonl', '_skipped.json'), 'utf8').split('\n')) {
    if (line.trim()) skipped.add(line.trim());
  }
}
const todo = matchIds.filter(m => !done.has(m.id) && !skipped.has(m.id));
console.log(`total ${matchIds.length}, done ${done.size}, skipped ${skipped.size}, todo ${todo.length}`);
fs.appendFileSync(OUT, ''); // ensure file exists

function decode(s) { return s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim(); }

function parseMatch(html, matchId, meta) {
  if (html.includes('Just a moment') || html.includes('challenges.cloudflare.com')) return 'CF';
  if (html.includes('RateLimit') || html.length < 5000) return 'CF';
  // map content ids -> names
  const tabs = [...html.matchAll(/dynamic-map-name-full" id="(\d+)">([^<]+)</g)].map(m => ({ id: m[1], map: m[2] }));
  const tabMap = Object.fromEntries(tabs.map(t => [t.id, t.map]));
  const maps = [];
  // all-content first (series aggregate), then per-map
  const contentIds = ['all', ...tabs.map(t => t.id)];
  for (const cid of contentIds) {
    const key = cid === 'all' ? 'all-content' : `${cid}-content`;
    const i = html.indexOf(`class="stats-content" id="${key}"`);
    if (i < 0) continue;
    // segment until next stats-content or reasonable length
    const nextIdx = html.indexOf('class="stats-content"', i + 20);
    const seg = html.slice(i, nextIdx > 0 ? nextIdx : i + 120000);
    // split rows by player links
    const rows = [...seg.matchAll(/<a href="\/player\/(\d+)\/[^"]+"[^>]*>([\s\S]*?)<\/a>([\s\S]*?)<\/tr>/g)];
    if (!rows.length) continue;
    const players = [];
    for (const rowm of rows) {
      const pid = rowm[1];
      const nickHtml = rowm[2];
      const nm = nickHtml.match(/'([^']+)'/);
      const nick = nm ? nm[1] : decode(nickHtml.replace(/<[^>]+>/g, ''));
      const cells = [...rowm[3].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(c => decode(c[1].replace(/<[^>]+>/g, '')));
      // cells: [K-D, eK-eD(hidden), Swing, ADR, eADR(hidden), KAST?, ..., rating]
      // find rating = last cell that looks like 0.xx/1.xx
      const kd = cells[0] || '';
      const swing = cells.find(c => /^[+-]\d+\.\d+%$/.test(c)) || null;
      const kast = cells.find(c => /^\d+\.\d%$/.test(c)) || null;
      const rating = cells.filter(c => /^\d\.\d{1,2}$/.test(c)).pop() || null;
      players.push({ pid, nick, kd, swing, kast, rating });
    }
    if (players.length) maps.push({ map: cid === 'all' ? 'ALL' : (tabMap[cid] || cid), players });
  }
  if (!maps.length) return null;
  return { match_id: matchId, teams: meta.teams, maps };
}

async function fetchOne(id) {
  const url = `${JINA}https://www.hltv.org/matches/${id}/x`;
  for (let a = 0; a < 8; a++) {
    try {
      const r = await fetch(url, { headers: UA });
      if (r.status === 429) {
        // rate limited: backoff hard, up to 60s
        const wait = Math.min(60000, 5000 * (a + 1) * (a + 1));
        console.log(`429 on ${id}, waiting ${wait / 1000}s`);
        await new Promise(res => setTimeout(res, wait));
        continue;
      }
      if (r.status !== 200) { await new Promise(res => setTimeout(res, 2000)); continue; }
      const t = await r.text();
      if (t.length < 500) { // tiny = still rate limit JSON
        await new Promise(res => setTimeout(res, 15000));
        continue;
      }
      return t;
    } catch (e) { await new Promise(res => setTimeout(res, 3000)); }
  }
  return null;
}

(async () => {
  const CONC = 2;
  let idx = 0, ok = 0, fail = 0;
  const next = () => (idx < todo.length ? todo[idx++] : null);
  async function worker(wid) {
    while (true) {
      const m = next();
      if (!m) return;
      const html = await fetchOne(m.id);
      if (!html) { fail++; console.log(`[w${wid}] FAIL(no-retry-left) ${m.id} — left for next run`); continue; }
      const rec = parseMatch(html, m.id, m);
      if (rec === 'CF') { fail++; console.log(`[w${wid}] blocked ${m.id} — left for retry`); continue; }
      if (rec) { fs.appendFileSync(OUT, JSON.stringify(rec) + '\n'); ok++; }
      else { fail++; fs.appendFileSync(OUT.replace('.jsonl', '_skipped.json'), m.id + '\n'); skipped.add(m.id); console.log(`[w${wid}] no-data ${m.id}`); }
      if ((ok + fail) % 25 === 0) console.log(`progress ${ok + fail}/${todo.length} ok=${ok}`);
      await new Promise(res => setTimeout(res, 600));
    }
  }
  await Promise.all(Array.from({ length: CONC }, (_, i) => worker(i)));
  console.log(`DONE ok=${ok} fail=${fail}`);
})();
