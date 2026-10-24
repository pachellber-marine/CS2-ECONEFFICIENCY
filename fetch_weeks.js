// fetch_weeks.js — fetch HLTV weekly rankings for 2026 + team page, parse top20
const fs = require('fs');
const path = require('path');
const DIR = __dirname;
const months = ['january','february','march','april','may','june','july','august','september','october','november','december'];

// all Mondays of 2026 through Oct 19
const mondays = [];
let d = new Date(Date.UTC(2026, 0, 5));
while (d <= new Date(Date.UTC(2026, 9, 19))) {
  mondays.push(`${d.getUTCFullYear()}/${months[d.getUTCMonth()]}/${d.getUTCDate()}`);
  d = new Date(d.getTime() + 7 * 86400000);
}

const sleep = ms => new Promise(r => setTimeout(r, ms));
async function jfetch(url, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch('https://r.jina.ai/' + url, {headers: {'user-agent': 'Mozilla/5.0'}});
      if (r.status === 429) { await sleep(15000); continue; }
      const t = await r.text();
      return {status: r.status, text: t};
    } catch (e) { await sleep(8000); }
  }
  return {status: 0, text: ''};
}

(async () => {
  const teams = {}; // name -> {teams: Set of ranks, name}
  const weeks = {};
  for (const w of mondays) {
    const url = `https://www.hltv.org/ranking/teams/${w}`;
    const {status, text} = await jfetch(url);
    if (status !== 200 || !text) { console.log('FAIL', w, status); weeks[w] = null; await sleep(2500); continue; }
    // parse: lines like "#1![Image 48: Spirit](...)" — take first 20
    const re = /#(\d+)!\[Image \d+: ([^\]]+)\]\(/g;
    const m = []; let x;
    while ((x = re.exec(text)) !== null) m.push([parseInt(x[1]), x[2]]);
    const top = m.filter(([r]) => r <= 20);
    weeks[w] = top.map(([r, n]) => n.replace(/\s+/g, ' ').trim());
    for (const [r, n] of top) {
      const name = n.replace(/\s+/g, ' ').trim();
      if (!teams[name]) teams[name] = [];
      if (!teams[name].includes(r)) teams[name].push(r);
    }
    fs.writeFileSync(path.join(DIR, 'weeks_progress.json'), JSON.stringify(weeks, null, 1));
    console.log('OK', w, 'top1:', weeks[w] ? weeks[w][0] : '?');
    await sleep(2500);
  }
  const result = {};
  for (const [name, ranks] of Object.entries(teams)) result[name] = {bestRank: Math.min(...ranks), rankSet: ranks.sort((a,b)=>a-b)};
  fs.writeFileSync(path.join(DIR, 'top20_2026_teams.json'), JSON.stringify(result, null, 1));
  console.log('DONE. ever-top20 team count:', Object.keys(result).length);
})();
