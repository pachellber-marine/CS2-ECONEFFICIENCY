// mechanism_regression.js — strict regression & causal-style checks for gun-giving mechanisms
// Data: top10 team player-rounds (same roster attribution as top10_netflow.js v2)
// Models:
//  A: OLS  gave ~ surplus + awp + rifle + force + full + T + h2 + win
//  B: + player FE (within transformation)
//  C: conditional gradient: gave vs surplus buckets WITHIN (weapon x tier x side) cells
//  D: supply vs demand: gave ~ own surplus + teammate max-gap (+ interaction), gap = max over teammates of (2000 - money_free)
// All SEs clustered by player (sandwich).
const fs = require('fs'), readline = require('readline');
const TOP10 = ['Spirit','Vitality','FURIA','MOUZ','Aurora','Falcons','Legacy','G2','BETBOOM','FUT'];
const sl = require('E:/cs2_econ_2026/stats_list_2026_byTeam.json');
const pidTeam = {};
for (const r of sl) {
  const t = r.bo3_team; if (!t) continue;
  let name = null;
  if (t.slug==='vitality') name='Vitality'; else if (t.slug==='furia') name='FURIA';
  else if (t.slug==='falcons-esports') name='Falcons'; else if (t.slug==='mouz-cs2') name='MOUZ';
  else if (t.slug==='spirit') name='Spirit'; else if (t.slug==='g2') name='G2';
  else if (t.slug==='aurora-gaming') name='Aurora'; else if (t.slug==='legacy-br') name='Legacy';
  else if (t.slug==='fut-cs2') name='FUT'; else if (t.slug==='betboom-team') name='BETBOOM';
  if (name) pidTeam[r.player.id] = name;
}

// accumulate per-observation covariates (keep in memory; ~166k x small)
const rows = [];
const nick = {};
const tierCnt = {eco:0, force:0, full:0};

const rl = readline.createInterface({ input: fs.createReadStream('E:/cs2_econ_2026/rounds_all_final.jsonl') });
rl.on('line', line => {
  let g; try { g = JSON.parse(line); } catch { return; }
  for (const rd of g.rounds) {
    const rno = rd.round, half = rno<=12?0 : rno<=24?1 : 2;
    const byTeam = {};
    for (const p of rd.players) {
      const tn = pidTeam[p.pid]; if (!tn) continue;
      nick[p.pid] = p.nick || nick[p.pid];
      (byTeam[tn] = byTeam[tn] || []).push(p);
    }
    for (const tn in byTeam) {
      const players = byTeam[tn];
      for (const p of players) {
        const tier = p.eco; // -1 pistol, 0 eco, 1 force, 2 full
        if (tier===-1 || tier===undefined) continue;
        const surplus = p.save + 270*p.k - p.spent;
        // teammate gap: among other 4 teammates alive-or-not, max unmet need in buy rounds
        // need proxy: (2700 - cash_free) where cash_free = p2.money? we have save only after round... use money at buy time approximated by eq+add? Use: gap = max(0, 2700 - (p2.spent)) not ideal.
        // Better proxy available at buy time: start-of-round money = spent + save' ... we don't have start money directly.
        // Use teammates' spent: gap_i = max over teammates of (2700 - spent_j)  (standard rifle cost benchmark)
        let gap = 0;
        for (const q of players) { if (q===p) continue; const g2 = 2700 - q.spent; if (g2>gap) gap = g2; }
        rows.push({pid:p.pid, tn, y:p.gave, surplus, awp:p.wval>=4000?1:0, rifle:(p.wval>=2000&&p.wval<4000)?1:0,
          force:tier===1?1:0, full:tier===2?1:0, T:p.side==='T'?1:0, h2:half===1?1:0, win:p.win===1?1:0, gap, spent:p.spent});
      }
    }
  }
});
rl.on('close', () => {
  console.log('obs:', rows.length);
  olsClustered(rows, ['surplus','awp','rifle','force','full','T','h2','win'], 'A: OLS baseline');
  olsClustered(rows, ['surplus','awp','rifle','force','full','T','h2','win','gap'], 'D: + teammate gap (demand)');
  // Model B: player FE via within transform
  withinFE(rows, ['surplus','awp','rifle','force','full','T','h2','win','gap'], 'B: player FE (within)');
  // Model C: conditional gradient within weapon x tier cells
  condGradient(rows);
  // save result
  fs.writeFileSync('E:/cs2_econ_2026/mechanism_regression_summary.json', JSON.stringify({n:rows.length}, null, 1));
});

function design(row, vars){ const x=[1]; for(const v of vars) x.push(row[v]); return x; }

function olsClustered(rows, vars, label){
  const K = vars.length+1;
  const XtX = Array.from({length:K},()=>new Array(K).fill(0));
  const Xty = new Array(K).fill(0);
  for (const r of rows){ const x=design(r,vars); for(let i=0;i<K;i++){Xty[i]+=x[i]*r.y; for(let j=0;j<K;j++) XtX[i][j]+=x[i]*x[j];} }
  const Ainv = inv(XtX);
  const beta = mul(Ainv, Xty);
  // clustered meat: sum over players of (X_g' u_g)(X_g' u_g)'
  const groups = new Map();
  rows.forEach((r,i)=>{ const x=design(r,vars); const yhat=dot(x,beta); const u=r.y-yhat;
    let g=groups.get(r.pid); if(!g){g={s:new Array(K).fill(0)}; groups.set(r.pid,g);}
    for(let i2=0;i2<K;i2++) g.s[i2]+=x[i2]*u; });
  const meat = Array.from({length:K},()=>new Array(K).fill(0));
  for (const g of groups.values()) for(let i=0;i<K;i++) for(let j=0;j<K;j++) meat[i][j]+=g.s[i]*g.s[j];
  const V = mul(mul(Ainv, meat), Ainv);
  const N=rows.length, G=groups.size;
  // R2
  let sse=0, m=0; for (const r of rows){ m+=r.y; } m/=N;
  let sst=0; for (const r of rows){ const e=r.y-m; sst+=e*e; } for (const r of rows){ const x=design(r,vars); sse+=(r.y-dot(x,beta))**2; }
  console.log(`\n== ${label} ==  n=${N} players=${G} R2=${(1-sse/sst).toFixed(4)}`);
  ['const',...vars].forEach((nm,i)=>console.log(`  ${nm.padEnd(9)} b=${beta[i].toFixed(3).padStart(9)}  se=${Math.sqrt(V[i][i]).toFixed(3)}  t=${(beta[i]/Math.sqrt(V[i][i])).toFixed(2)}`));
}

function withinFE(rows, vars, label){
  // demean by pid
  const sums=new Map(), cnt=new Map();
  const all=['surplus','awp','rifle','force','full','T','h2','win','gap'];
  for (const r of rows){ let s=sums.get(r.pid); if(!s){s={}; sums.set(r.pid,s); cnt.set(r.pid,0);} for(const v of all) s[v]=(s[v]||0)+r[v]; s._y=(s._y||0)+r.y; cnt.set(r.pid,cnt.get(r.pid)+1); }
  const dm = rows.map(r=>{ const s=sums.get(r.pid), n=cnt.get(r.pid); const o={pid:r.pid, y:r.y-s._y/n}; for(const v of all) o[v]=r[v]-s[v]/n; return o; });
  olsClustered(dm, vars, label+' — demeaned, SE still clustered by player');
  console.log('   (FE absorbed: per-player intercepts; within-player variation identifies coefficients)');
}

function condGradient(rows){
  // cells: awp x tier(force/full/eco) ; bucket surplus into 4 quantiles within cell
  console.log('\n== C: conditional gradient gave vs surplus, within weapon x tier ==');
  for (const awp of [0,1]) for (const tier of [0,1,2]) {
    const cell = rows.filter(r=>r.awp===awp && (tier===0? r.force===0&&r.full===0 : tier===1? r.force===1 : r.full===1));
    if (cell.length<500) continue;
    cell.sort((a,b)=>a.surplus-b.surplus);
    const Q=4, buckets=Array.from({length:Q},()=>({n:0,s:0,gave:0}));
    cell.forEach((r,i)=>{ const b=buckets[Math.min(Q-1,Math.floor(i/cell.length*Q))]; b.n++; b.s+=r.surplus; b.gave+=r.y; });
    console.log(`  ${awp?'AWP':'noAWP'} tier=${['eco','force','full'][tier]} n=${cell.length}: ` + buckets.map((b,i)=>`Q${i+1}(s=${Math.round(b.s/b.n)}):$${(b.gave/b.n).toFixed(0)}`).join(' '));
  }
}

// helpers
function inv(M){ const K=M.length; const A=M.map((row,i)=>[...row, ...Array.from({length:K},(_,j)=>i===j?1:0)]);
  for(let c=0;c<K;c++){ let p=c; for(let r=c+1;r<K;r++) if(Math.abs(A[r][c])>Math.abs(A[p][c])) p=r; [A[c],A[p]]=[A[p],A[c]];
    const d=A[c][c]; for(let j=0;j<2*K;j++) A[c][j]/=d;
    for(let r=0;r<K;r++) if(r!==c&&A[r][c]!==0){const f=A[r][c]; for(let j=0;j<2*K;j++) A[r][j]-=f*A[c][j];} }
  return A.map(row=>row.slice(K)); }
function mul(A,B){ // A matrix, B matrix or vector
  if (Array.isArray(B[0])){ return A.map((row,i)=>B[0].map((_,j)=>row.reduce((s,x,k)=>s+x*B[k][j],0))); }
  return A.map(row=>row.reduce((s,x,k)=>s+x*B[k],0)); }
function dot(x,b){ return x.reduce((s,xi,i)=>s+xi*b[i],0); }
