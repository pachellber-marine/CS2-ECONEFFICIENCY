// top10_netflow.js v2 — pid-based grouping (robust vs bo3 team_id inconsistencies), eco from p.eco
const fs = require('fs'), readline = require('readline');

const TOP10 = ['Spirit','Vitality','FURIA','MOUZ','Aurora','Falcons','Legacy','G2','BETBOOM','FUT'];
const sl = require('E:/cs2_econ_2026/stats_list_2026_byTeam.json');
// pid -> team display name (prefer later rows); collect roster per team name
const pidTeam = {}, teamRoster = {};
for (const r of sl) {
  const t = r.bo3_team; if (!t) continue;
  let name = null;
  for (const T of TOP10) {
    if (t.slug === T.toLowerCase() || t.name === T || t.name === T+' Esports' || t.name === 'Team '+T || t.name === T+' Gaming' || t.slug === 'falcons-esports'&&T==='Falcons' || t.slug==='mouz-cs2'&&T==='MOUZ' || t.slug==='legacy-br'&&T==='Legacy' || t.slug==='fut-cs2'&&T==='FUT' || t.slug==='aurora-gaming'&&T==='Aurora' || t.slug==='betboom-team'&&T==='BETBOOM' || t.slug==='spirit'&&T==='Spirit') { name = T; break; }
  }
  if (!name) continue;
  pidTeam[r.player.id] = name;
  (teamRoster[name] = teamRoster[name] || new Set()).add(r.player.id);
}
console.log('roster sizes:', Object.entries(teamRoster).map(([k,v])=>k+':'+v.size).join(' | '));

const TIER = {'-1':'pistol', '0':'eco', '1':'force', '2':'full'};
function wclass(w){ return w>=4000?'awp' : w>=2000?'rifle' : w>0?'cheap' : 'none'; }
function newAcc(){ return {r:0, gave:0, got:0, surplus:0, awpR:0, spent:0, t_r:0,t_net:0, ct_r:0,ct_net:0, h1_r:0,h1_net:0, h2_r:0,h2_net:0, ot_r:0,ot_net:0, pist_r:0,pist_gave:0,pist_got:0, e_r:0,e_net:0, f_r:0,f_net:0, full_r:0,full_net:0}; }
const A = {};
const nick = {};
const flows = {}; // teamName -> giverPid -> recvPid -> $

const K = 8;
const XtX = Array.from({length:K},()=>new Array(K).fill(0));
const Xty = new Array(K).fill(0);
let nObs = 0, gaveMean = 0;
let games=0, rounds=0, sumGave=0, sumGot=0, noEco=0, tierCnt={};

const rl = readline.createInterface({ input: fs.createReadStream('E:/cs2_econ_2026/rounds_all_final.jsonl') });
rl.on('line', line => {
  let g; try { g = JSON.parse(line); } catch { return; }
  games++;
  // group this round's players by their top10 team (via pid); keep raw list for FIFO per team
  for (const rd of g.rounds) {
    rounds++;
    const rno = rd.round;
    const half = rno<=12?'h1' : rno<=24?'h2' : 'ot';
    const byTeam = {};
    for (const p of rd.players) {
      const tn = pidTeam[p.pid];
      if (!tn) continue;
      nick[p.pid] = p.nick || nick[p.pid];
      (byTeam[tn] = byTeam[tn] || []).push(p);
    }
    for (const tn in byTeam) {
      const players = byTeam[tn];
      const givers=[], recvers=[];
      for (const p of players) {
        if (p.gave>0) givers.push([p.pid, p.gave]);
        if (p.got>0) recvers.push([p.pid, p.got]);
        const a = A[tn+':'+p.pid] || (A[tn+':'+p.pid] = newAcc());
        const net = p.gave - p.got;
        const surplus = p.save + 270*p.k - p.spent;
        const tier = TIER[String(p.eco)];
        if (tier===undefined) noEco++;
        tierCnt[tier] = (tierCnt[tier]||0)+1;
        a.r++; a.gave += p.gave; a.got += p.got; a.surplus += surplus; a.spent += p.spent;
        if (wclass(p.wval)==='awp') a.awpR++;
        if (p.side==='T'){a.t_r++; a.t_net += net;} else {a.ct_r++; a.ct_net += net;}
        if (half==='h1'){a.h1_r++; a.h1_net+=net;} else if (half==='h2'){a.h2_r++; a.h2_net+=net;} else {a.ot_r++; a.ot_net+=net;}
        if (tier==='pistol'){a.pist_r++; a.pist_gave+=p.gave; a.pist_got+=p.got;}
        else if (tier==='eco'){a.e_r++; a.e_net+=net;}
        else if (tier==='force'){a.f_r++; a.f_net+=net;}
        else if (tier==='full'){a.full_r++; a.full_net+=net;}
        if (tier && tier!=='pistol') {
          const x = [1, surplus, wclass(p.wval)==='awp'?1:0, tier==='force'?1:0, tier==='full'?1:0, p.side==='T'?1:0, half==='h2'?1:0, p.win===1?1:0];
          for (let i=0;i<K;i++){ Xty[i]+=x[i]*p.gave; for(let j=0;j<K;j++) XtX[i][j]+=x[i]*x[j]; }
          nObs++; gaveMean+=p.gave;
        }
      }
      // FIFO pairing within (team, round)
      const gl=givers.map(([id,v])=>({id,rem:v})), rv=recvers.map(([id,v])=>({id,rem:v}));
      const fm = flows[tn] || (flows[tn] = {});
      let gi=0, ri=0;
      while (gi<gl.length && ri<rv.length) {
        const amt = Math.min(gl[gi].rem, rv[ri].rem);
        if (gl[gi].id!==rv[ri].id) { fm[gl[gi].id] = fm[gl[gi].id] || {}; fm[gl[gi].id][rv[ri].id] = (fm[gl[gi].id][rv[ri].id]||0)+amt; }
        gl[gi].rem-=amt; rv[ri].rem-=amt;
        if (gl[gi].rem<=0) gi++; if (rv[ri].rem<=0) ri++;
      }
    }
    // global sums once per player
    for (const p of rd.players){ sumGave+=p.gave; sumGot+=p.got; }
  }
});
rl.on('close', () => {
  console.log(`games=${games} rounds=${rounds} noEco=${noEco} tiers=`, JSON.stringify(tierCnt));
  console.log(`league-wide sumGave=$${sumGave} sumGot=$${sumGot}`);
  const M = XtX.map((row,i)=>[...row, Xty[i]]);
  for (let c=0;c<K;c++){
    let piv=c; for(let r2=c+1;r2<K;r2++) if(Math.abs(M[r2][c])>Math.abs(M[piv][c])) piv=r2;
    [M[c],M[piv]]=[M[piv],M[c]];
    const d=M[c][c]; for(let j=c;j<=K;j++) M[c][j]/=d;
    for(let r2=0;r2<K;r2++) if(r2!==c && M[r2][c]!==0){ const f=M[r2][c]; for(let j=c;j<=K;j++) M[r2][j]-=f*M[c][j]; }
  }
  const beta = M.map(row=>row[K]);
  const names=['const','surplus($)','AWP in hand','force rd','full rd','T side','2nd half','round won'];
  console.log(`\nOLS gave$ ~ controls | n=${nObs} mean_gave=$${(gaveMean/nObs).toFixed(1)}`);
  names.forEach((nm,i)=>console.log(`  ${nm}: ${beta[i].toFixed(4)}`));

  const out = {ols:{n:nObs, mean_gave:gaveMean/nObs, beta:Object.fromEntries(names.map((nm,i)=>[nm,beta[i]]))}, teams:{}};
  for (const tn of Object.keys(teamRoster)) {
    const rows = [];
    for (const pid of teamRoster[tn]) {
      const a = A[tn+':'+pid]; if (!a) continue;
      rows.push({pid, nick:nick[pid]||String(pid), r:a.r, gave_r:+(a.gave/a.r).toFixed(1), got_r:+(a.got/a.r).toFixed(1), net_r:+((a.gave-a.got)/a.r).toFixed(1), surplus_r:+(a.surplus/a.r).toFixed(0), spent_r:+(a.spent/a.r).toFixed(0), awp_pct:+(100*a.awpR/a.r).toFixed(1), t_net_r: a.t_r?+(a.t_net/a.t_r).toFixed(1):null, ct_net_r: a.ct_r?+(a.ct_net/a.ct_r).toFixed(1):null, h1_net_r: a.h1_r?+(a.h1_net/a.h1_r).toFixed(1):null, h2_net_r: a.h2_r?+(a.h2_net/a.h2_r).toFixed(1):null, ot_net_r: a.ot_r?+(a.ot_net/a.ot_r).toFixed(1):null, pist_gave_r: a.pist_r?+(a.pist_gave/a.pist_r).toFixed(1):0, pist_got_r: a.pist_r?+(a.pist_got/a.pist_r).toFixed(1):0, eco_net_r: a.e_r?+(a.e_net/a.e_r).toFixed(1):null, force_net_r: a.f_r?+(a.f_net/a.f_r).toFixed(1):null, full_net_r: a.full_r?+(a.full_net/a.full_r).toFixed(1):null});
    }
    rows.sort((x,y)=>y.r-x.r);
    const fm = flows[tn]||{}; const flowRows=[];
    for (const gp in fm) for (const rp in fm[gp]) flowRows.push({from:nick[gp]||gp, to:nick[rp]||rp, $:Math.round(fm[gp][rp])});
    flowRows.sort((a,b)=>b.$-a.$);
    out.teams[tn] = {players_main: rows.filter(r=>r.r>=300), players_bench: rows.filter(r=>r.r<300 && r.r>=100), top_flows: flowRows.slice(0,10)};
  }
  fs.writeFileSync('E:/cs2_econ_2026/top10_netflow.json', JSON.stringify(out, null, 1));
  console.log('written top10_netflow.json\n');
  for (const [tn,T] of Object.entries(out.teams)) {
    console.log(`=== ${tn} ===`);
    for (const p of T.players_main) console.log(`  ${String(p.nick).padEnd(12)} r=${p.r} gave=${p.gave_r} got=${p.got_r} net=${p.net_r} (T ${p.t_net_r}/CT ${p.ct_net_r} | H1 ${p.h1_net_r}/H2 ${p.h2_net_r} | eco ${p.eco_net_r}/for ${p.force_net_r}/full ${p.full_net_r}) awp=${p.awp_pct}%`);
    console.log('  flows:', T.top_flows.slice(0,5).map(f=>`${f.from}->${f.to} $${f.$}`).join(' | '));
  }
});
