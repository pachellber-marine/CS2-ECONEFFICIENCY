// rating_layers.js — stratified official Rating 3.0 / swing by opponent strength & event tier
// strata: ALL / BIG (HLTV big events) / BIG&TOP20 / BIG&TOP5 / ALL&TOP20 / ALL&TOP5
const fs=require('fs');
const E='E:/cs2_econ_2026/';
const meta=JSON.parse(fs.readFileSync(E+'hltv_match_meta.json','utf8'));
const p30=JSON.parse(fs.readFileSync(E+'players_final_season30.json','utf8'));
const weeks=JSON.parse(fs.readFileSync(E+'weeks_progress.json','utf8'));

// --- helpers ---
const norm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]/g,'');
const teamAlias=t=>{ // HLTV meta team name -> p30 mainTeam spelling
  const n=norm(t);
  if(n==='natusvincere')return 'NAVI';
  if(n==='themongolz')return 'The MongolZ';
  if(n==='gentlemates')return 'Gentle Mates';
  return t;
};

// weekly top20 lookup: date -> week key <= date
// keys are '2026/january/5' format; some weeks are empty (parse failures) -> fall back to nearest non-empty week
const MO={january:'01',february:'02',march:'03',april:'04',may:'05',june:'06',july:'07',august:'08',september:'09',october:'10',november:'11',december:'12'};
const wkKeys=Object.keys(weeks)
  .filter(k=>Array.isArray(weeks[k])&&weeks[k].length>=20)
  .map(k=>({iso:`${k.split('/')[0]}-${MO[k.split('/')[1].toLowerCase()]}-${String(k.split('/')[2]).padStart(2,'0')}`,arr:weeks[k]}))
  .sort((a,b)=>a.iso<b.iso?-1:1);
function weekFor(date){
  // find the latest non-empty week whose Monday <= date+3 days (week lists may lag mid-week matches slightly);
  // simpler: last week with iso <= date, else earliest week (for matches before first snapshot)
  let best=null;
  for(const w of wkKeys){ if(w.iso<=date) best=w; else break; }
  if(!best) best=wkKeys[0];
  return best;
}
const rankOf=(team,date)=>{
  const wk=weekFor(date); if(!wk)return null;
  const idx=wk.arr.findIndex(x=>norm(x)===norm(team));
  return idx<0?null:idx+1;
};

// big event rule (HLTV standard: majors, IEM, BLAST open/premier/bounty/rivals?, EPL, EWC, PGL, StarSeries, Thunderpick WC, CS Asia, FISSURE)
const BIG_RE=/major|iem |blast (open|bounty|premier|rivals)|esl pro league|esports world cup|pgl |starladder starseries|thunderpick world championship|cs asia championships|fissure/i;
const NOTBIG_RE=/qualifier|rising|circuit|challenger|showmatch|in house|private club|season \d+ (mrg|d2|nuke|inf|anc|anb|ovp|def|cch)|\s(mrg|d2|nuke|inf|anc|anb|ovp|def|cch)$/i;
const isBig=ev=>BIG_RE.test(ev)&&!NOTBIG_RE.test(ev);

// --- load per-match player rows ---
const lines=fs.readFileSync(E+'match_r30.jsonl','utf8').split('\n').filter(Boolean);
// aggregate: pid -> {strata: {maps, r30sum, swingSum, swingN, opp: Set}}
const agg=new Map(); // pid -> {nick, main, strata:{}}
function rec(pid,nick,main,stratum,rating,swing){
  pid=String(pid);
  if(!agg.has(pid)) agg.set(pid,{nick,main,strata:{}});
  const a=agg.get(pid); a.nick=nick||a.nick; a.main=main||a.main;
  const s=a.strata[stratum]||(a.strata[stratum]={maps:0,r30:0,sw:0,swN:0});
  s.maps++; s.r30+=rating||0;
  if(swing!==null&&swing!==undefined&&!isNaN(swing)){ s.sw+=swing; s.swN++; }
}
let matched=0,unmatched=0;
for(const ln of lines){
  let j; try{ j=JSON.parse(ln); }catch(e){ continue; }
  const mt=meta[j.match_id]; if(!mt) continue;
  if(mt.date<'2026-01-01') continue;
  const tA=mt.teams&&mt.teams[0], tB=mt.teams&&mt.teams[1];
  if(!tA||!tB) continue;
  const big=isBig(mt.event);
  for(const map of (j.maps||[])){
    for(const pl of (map.players||[])){
      // strip HTML from nick, parse swing
      const cleanNick=String(pl.nick||'').replace(/<[^>]*>/g,'');
      const sw=parseFloat(String(pl.swing||'').replace('%','').replace('+',''));
      const rate=parseFloat(pl.rating);
      // find player's team among the two via p30 mainTeam (normalize)
      const ref=p30.find(p=>String(p.pid)===String(pl.pid));
      let main=ref?ref.mainTeam:null;
      let opp=null;
      if(main){
        const nMain=norm(main);
        if(norm(tA)===nMain) opp=tB; else if(norm(tB)===nMain) opp=tA;
      }
      if(!main||!opp){ unmatched++; continue; }
      matched++;
      const rk=rankOf(opp,mt.date); // null if opponent not in top20 that week
      const t20=rk!==null, t5=rk!==null&&rk<=5;
      rec(pl.pid,cleanNick,main,'ALL',rate,sw);
      if(big) rec(pl.pid,cleanNick,main,'BIG',rate,sw);
      if(t20) rec(pl.pid,cleanNick,main,'ALL_T20',rate,sw);
      if(t5) rec(pl.pid,cleanNick,main,'ALL_T5',rate,sw);
      if(big&&t20) rec(pl.pid,cleanNick,main,'BIG_T20',rate,sw);
      if(big&&t5) rec(pl.pid,cleanNick,main,'BIG_T5',rate,sw);
    }
  }
}
console.log('rows matched:',matched,'unmatched:',unmatched);
// also team-level join via meta teams for players whose mainTeam is one of the two —
// nickname collision guard: if two p30 players share normalized mainTeam? fine.

// output
const out=[];
for(const [pid,a] of agg){
  const row={pid,nick:a.nick,main:a.main,strata:{}};
  for(const k in a.strata){
    const s=a.strata[k];
    if(s.maps<3) continue;
    row.strata[k]={maps:s.maps,r30:+(s.r30/s.maps).toFixed(3),swing:s.swN?+(s.sw/s.swN).toFixed(4):null};
  }
  if(row.strata.ALL&&row.strata.ALL.maps>=15) out.push(row);
}
out.sort((x,y)=>y.strata.ALL.r30-x.strata.ALL.r30);
fs.writeFileSync(E+'players_layers.json',JSON.stringify(out,null,1));
console.log('players with ALL>=15 maps:',out.length);
// quick sanity
for(const nm of ['ZywOo','donk','TeSeS','m0NESY','karrigan','NiKo','kyousuke','sh1ro','apEX']){
  const r=out.find(x=>norm(x.nick)===norm(nm));
  if(!r){ console.log(nm,'NOT IN OUT'); continue; }
  const f=k=>r.strata[k]?`${r.strata[k].maps}m/${r.strata[k].r30}`:'-';
  console.log(nm.padEnd(9),'ALL',f('ALL'),'| BIG',f('BIG'),'| B&T20',f('BIG_T20'),'| B&T5',f('BIG_T5'),'| A&T20',f('ALL_T20'),'| A&T5',f('ALL_T5'));
}
// stratum coverage
const cov={};
for(const r of out) for(const k in r.strata) cov[k]=(cov[k]||0)+1;
console.log('coverage:',JSON.stringify(cov));
