// stats_tests3.js — MWU (Support vs others, nick-join), KPR binary test, conservation v2 (bomb money)
const fs=require('fs');
const readline=require('readline');
const E='E:/cs2_econ_2026/';
const norm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]/g,'');
const RENAME={cemenbakin:'kyousuke',nucleonz:'flamie'};

// --- Support cohort from players_with_positions.json (nick based) ---
const pwp=JSON.parse(fs.readFileSync(E+'players_with_positions.json','utf8'));
const roleByNick={};
for(const p of pwp){ roleByNick[norm(p.nick)]={role:p.pos_role,team:p.mainTeam}; }
const supNicks=new Set(Object.keys(roleByNick).filter(n=>roleByNick[n]&&roleByNick[n].role==='Support'));
console.log('Support names (from positions json):',supNicks.size);

// --- stream rounds_all, aggregate per player ---
const agg=new Map(); // nick -> {rounds, spent[], got[], util[], ecoRounds, ecoKills, eco, fullRounds, fullKills, kprEco..., team}
async function main(){
  const rl=readline.createInterface({input:fs.createReadStream(E+'rounds_all.jsonl'),crlf:false});
  let gameN=0;
  for await(const ln of rl){
    if(!ln.trim())continue;
    let j;try{j=JSON.parse(ln)}catch(e){continue}
    if(j.error)continue; gameN++;
    for(const r of (j.rounds||[])){
      for(const p of (r.players||[])){
        let n=norm(p.nick); if(RENAME[n])n=RENAME[n];
        let a=agg.get(n);
        if(!a){a={nick:n,raw:p.nick,rounds:0,spent:0,got:0,util:0,ecoR:0,ecoK:0,lowR:0,lowK:0,fullR:0,fullK:0,ecoKPR_sum:0};agg.set(n,a)}
        a.rounds++; a.spent+=p.spent||0; a.got+=p.got||0; a.util+=p.util||0;
        const k=p.k||0;
        const ecoCls=p.eco; // player-level: -1 eco /0 low /1 force /2 full
        if(ecoCls===-1||ecoCls===0){ a.ecoR++; a.ecoK+=k; }
        else if(ecoCls===2){ a.fullR++; a.fullK+=k; }
      }
    }
  }
  console.log('games:',gameN,'players:',agg.size);
  // --- MWU: Support vs non-Support on got/round, spent/round, util/round ---
  const sup=[],oth=[];
  for(const [n,a] of agg){
    if(a.rounds<500)continue;
    const row={n,got:a.got/a.rounds,spent:a.spent/a.rounds,util:a.util/a.rounds,rounds:a.rounds};
    if(supNicks.has(n))sup.push(row);else oth.push(row);
  }
  console.log('sup with >=500 rounds:',sup.length,'others:',oth.length);
  function mwu(A,B,key){
    const xs=A.map(r=>r[key]).sort((a,b)=>a-b), ys=B.map(r=>r[key]).sort((a,b)=>a-b);
    // rank all
    const all=[...xs.map(v=>[v,0]),...ys.map(v=>[v,1])].sort((a,b)=>a[0]-b[0]);
    let i=0,rankSumX=0,n1=xs.length,n2=ys.length;
    while(i<all.length){
      let jx=i; while(jx+1<all.length&&all[jx+1][0]===all[i][0])jx++;
      const avgRank=(i+jx)/2+1;
      for(let t=i;t<=jx;t++) if(all[t][1]===0) rankSumX+=avgRank;
      i=jx+1;
    }
    const U=rankSumX-n1*(n1+1)/2;
    const mu=n1*n2/2, sd=Math.sqrt(n1*n2*(n1+n2+1)/12);
    const z=(U-mu)/sd;
    return {n1,n2,meanA:+(xs.reduce((a,b)=>a+b,0)/n1).toFixed(1),meanB:+(ys.reduce((a,b)=>a+b,0)/n2).toFixed(1),z:+z.toFixed(3),p:+(2*(1-normcdf(Math.abs(z)))).toFixed(6)};
  }
  function normcdf(x){ return 0.5*(1+erf(x/Math.SQRT2)); }
  function erf(x){ const t=1/(1+0.3275911*Math.abs(x));
    const y=1-(((((1.061405429*t-1.453152027)*t)+1.421413741)*t-0.284496736)*t+0.254829592)*t*Math.exp(-x*x);
    return x>=0?y:-y; }
  const res={};
  for(const k of ['got','spent','util']) res[k]=mwu(sup,oth,k);
  console.log('MWU Support vs others:',JSON.stringify(res,null,1));
  // --- KPR eco vs full per player (two-prop z on kills/rounds means via normal approx) ---
  const bin=[];
  for(const [n,a] of agg){
    if(a.ecoR<150||a.fullR<400)continue;
    const kprE=a.ecoK/a.ecoR, kprF=a.fullK/a.fullR;
    // z for difference of two proportions/means with poisson-ish var: use pooled rate ratio test (normal approx on means)
    const pP=(a.ecoK+a.fullK)/(a.ecoR+a.fullR);
    const se=Math.sqrt(pP*(1-pP)*(1/a.ecoR+1/a.fullR));
    const z=se>0?(kprE-kprF)/se:0;
    bin.push({n,raw:a.raw,rounds:a.rounds,ecoR:a.ecoR,fullR:a.fullR,kprEco:+kprE.toFixed(3),kprFull:+kprF.toFixed(3),rel:+(kprE/kprF).toFixed(3),z:+z.toFixed(3)});
  }
  bin.sort((a,b)=>b.z-a.z);
  fs.writeFileSync(E+'players_ecokpr.json',JSON.stringify(bin,null,1));
  console.log('KPR-eco table n=',bin.length);
  console.log('top5:',bin.slice(0,5).map(r=>`${r.raw} z=${r.z} rel=${r.rel}`).join(' | '));
  console.log('bottom5:',bin.slice(-5).map(r=>`${r.raw} z=${r.z} rel=${r.rel}`).join(' | '));
  // support cohort subset
  const supBin=bin.filter(r=>supNicks.has(r.n));
  console.log('Support KPR-eco:',JSON.stringify(supBin,null,0).slice(0,1500));
  // --- conservation v2: bomb money + team-level streaks ---
  // team income/round from win/loss bonus + kill money; kill money: AWP kills $100 others $300 (approx: use 300, AWP share small)
  // note: rounds are per-game; team Map per round keyed by clan
  let inc=0,nR=0;
  const streakByTeam=new Map();
  const rl2=readline.createInterface({input:fs.createReadStream(E+'rounds_all.jsonl'),crlf:false});
  for await(const ln of rl2){
    if(!ln.trim())continue;
    let j;try{j=JSON.parse(ln)}catch(e){continue}
    if(j.error)continue;
    const teamMap=new Map();
    for(const r of (j.rounds||[])){
      nR++;
      for(const p of (r.players||[])){
        const cl=norm(p.clan); if(!cl)continue;
        if(!teamMap.has(cl))teamMap.set(cl,{win:0,kills:0});
        const t=teamMap.get(cl);
        t.kills+=p.k||0; if(p.win)t.win++;
      }
    }
    for(const [cl,t] of teamMap){
      const key=j.game_id+'|'+cl;
      const st=streakByTeam.get(key)||0;
      if(t.win){ inc+=3250+t.kills*300; streakByTeam.set(key,0); }
      else { inc+=1400+500*Math.min(st,4); streakByTeam.set(key,st+1); }
    }
  }
  const incPerRoundTeam=inc/nR; let spentSum3=0; for(const [,a] of agg) spentSum3+=a.spent;
  const spentPerRoundTeam=spentSum3/nR;
  console.log('team income/round:',+incPerRoundTeam.toFixed(0),'team spent/round:',+spentPerRoundTeam.toFixed(0),'rounds:',nR);
  console.log('gap (bomb money 3500 + other):',+(spentPerRoundTeam-incPerRoundTeam).toFixed(0));
  fs.writeFileSync(E+'v10_stats3.json',JSON.stringify({mwu:res,binTop:bin.slice(0,20),binBottom:bin.slice(-20),conservation:{incPerRoundTeam:+incPerRoundTeam.toFixed(0),spentPerRoundTeam:+spentPerRoundTeam.toFixed(0),rounds:nR}},null,1));
}
main().catch(e=>{console.error(e);process.exit(1)});
