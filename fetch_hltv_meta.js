// v3: block-based parsing, img markers as separators
const fs=require('fs');
const path='E:\\cs2_econ_2026\\';
const JINA='https://r.jina.ai/';
const known=JSON.parse(fs.readFileSync(path+'match_ids.json','utf8'));
const wanted=new Set(known.map(x=>String(x.id)));
const teamIds=JSON.parse(fs.readFileSync(path+'hltv_team_ids.json','utf8'));
const metas=fs.existsSync(path+'hltv_match_meta.json')?JSON.parse(fs.readFileSync(path+'hltv_match_meta.json','utf8')):{};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function jfetch(url,tries=10){
  for(let i=0;i<tries;i++){
    try{
      const r=await fetch(JINA+url,{headers:{'x-no-cache':'true'}});
      if(r.status===429){ await sleep(6000*Math.pow(2,i)); continue; }
      if(!r.ok){ await sleep(1500); continue; }
      const t=await r.text();
      if(t.length<500){ await sleep(3000); continue; }
      return t;
    }catch(e){ console.log('  catch:',e.message); await sleep(2000); }
  }
  return null;
}
const MON={January:1,February:2,March:3,April:4,May:5,June:6,July:7,August:8,September:9,October:10,November:11,December:12};
const IMG=/!\[Image \d+:[^\]]*\]\([^)]*\)/g;
// parse one page text into metas
function parsePage(t){
  const out={};
  // cut page at first "Results for" (skip nav)
  const first=t.search(/Results for /);
  if(first<0) return out;
  const body=t.slice(first);
  // split by date headers keeping them
  const parts=body.split(/(?=Results for \w+ \d+(?:st|nd|rd|th)?,? \d{4})/);
  for(const part of parts){
    const dm=part.match(/^Results for (\w+) (\d+)(?:st|nd|rd|th)?,? (\d{4})/);
    if(!dm) continue;
    const date=`${dm[3]}-${String(MON[dm[1]]).padStart(2,'0')}-${String(+dm[2]).padStart(2,'0')}`;
    // each match link: find all occurrences of ](https://www.hltv.org/matches/ID/slug)
    const reM=/\]\(https:\/\/www\.hltv\.org\/matches\/(\d+)\/[^)]*\)/g;
    const links=[]; let m;
    while((m=reM.exec(part))) links.push({id:m[1], end:m.index+m[0].length});
    for(let i=0;i<links.length;i++){
      const start=i===0?0:links[i-1].end;
      const seg=part.slice(start,links[i].end);
      const id=links[i].id;
      if(!wanted.has(id)||out[id]) continue;
      // strip images but keep them as separators replaced by '|'
      const toks=seg.replace(IMG,'|').split(/\]\([^)]*\)/); // also cut markdown link syntax
      let text=toks.join('|');
      // now text contains: [prefix]teamA|1 - 2|teamB|event|bo3](url)
      // extract: remove leading '[' and trailing '](...)'
      text=text.replace(/^\[/,'').replace(/\]\(https:\/\/www\.hltv\.org\/matches\/\d+\/[^)]*\)\s*$/,'');
      const fields=text.split('|').map(s=>s.replace(/\s+/g,' ').trim()).filter(Boolean);
      // fields like: ['teamA','1 - 2','teamB','event','bo3'] (event may include trailing bo3)
      if(fields.length<4){ out[id]={id,date,label:fields.join(' '),teams:[fields[0]||''],event:null}; continue; }
      const cleanA=s=>s.replace(/^.*\[/,'').trim();
      const teamA=cleanA(fields[0]), score=fields[1], teamB=fields[2];
      let ev=fields.slice(3).join(' ').replace(/\s*bo\d+\s*$/i,'').trim();
      out[id]={id,date,teams:[teamA,teamB],event:ev,score};
    }
  }
  return out;
}
(async()=>{
  let nReq=0;
  outer:
  for(const [name,tid] of Object.entries(teamIds)){
    for(let off=0; off<700; off+=100){
      const url=`https://www.hltv.org/results?team=${tid.id ?? tid}&offset=${off}`;
      const t=await jfetch(url); nReq++;
      if(!t){ console.log('FAIL',name,off); break; }
      const got=parsePage(t);
      let newN=0;
      for(const id in got){ if(!metas[id]){ metas[id]=got[id]; newN++; } }
      console.log(name,'off'+off,'req#'+nReq,'new:',newN,'total:',Object.keys(metas).length);
      if(newN===0&&off>0) break;
      if(Object.keys(metas).length>=wanted.size){ console.log('COMPLETE'); break outer; }
      fs.writeFileSync(path+'hltv_match_meta.json',JSON.stringify(metas));
      await sleep(1100);
    }
    fs.writeFileSync(path+'hltv_match_meta.json',JSON.stringify(metas));
  }
  fs.writeFileSync(path+'hltv_match_meta.json',JSON.stringify(metas));
  console.log('done:',Object.keys(metas).length,'/',wanted.size);
  const nd=Object.values(metas).filter(x=>!x.date).length, ne=Object.values(metas).filter(x=>!x.event).length;
  console.log('noDate:',nd,'noEvent:',ne);
})();
