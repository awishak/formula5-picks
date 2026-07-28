// Adds every new dataset the rebuilt recap needs, on top of chart-data.json.
import { readFileSync, writeFileSync } from "node:fs";
import { season } from "./nobb.mjs";
const SP = new URL("./", import.meta.url);
const out = JSON.parse(readFileSync(new URL("chart-data.json", SP), "utf8"));
const D = JSON.parse(readFileSync(process.env.F5_DATA || (process.env.HOME + "/Downloads/formula5_data_2026-07-27.json"),"utf8"));

const TP=[25,18,15,12,10,8,6,4,2,1,0,0];
const sm={}; D.scores.forEach(s=>sm[s.player_id+"_"+s.race_id]=s);
const pk={}; D.picks.forEach(p=>pk[p.player_id+"_"+p.race_id]=p);
const C=s=>(s.top_pick_pts||0)+(s.midfield_pts||0)+(s.order_bonus||0)+(s.best_finish_bonus||0);
const races=D.races.filter(r=>r.round<=11).sort((a,b)=>a.round-b.round);
const CANON=n=>n==="Kimi Antonelli"?"Andrea Kimi Antonelli":n;
const dp=s=>{try{return typeof s.driver_pts==="string"?JSON.parse(s.driver_pts):(s.driver_pts||{})}catch{return{}}};

const UP=["Meatballs","HomeworkTubes.Com","TNT Roku F5 Team","Cal Aggie Racing","Peloton Aubergine"];
const DOWN=["El Camino Rapido","Stalloni 1851","Bronco SCUderia","Wildcat Motors","Garra Dynamics"];
const A=season(true), B=season(false);

/* ---- next-half divisions ---- */
const nextChamp=[...A.champ.filter(t=>!DOWN.includes(t.name)).map(t=>t.name),...UP];
const nextSecond=[...A.second.filter(t=>!UP.includes(t.name)).map(t=>t.name),...DOWN];
out.next={champ:nextChamp, second:nextSecond};

/* ---- scoring-average what-if, with and without BOX BOX ---- */
function avgView(src){
  const all=[...src.champ,...src.second].map(t=>({name:t.name,avg:t.avg,
    div:nextChamp.includes(t.name)?"C":"2"}));
  const ranked=[...all].sort((a,b)=>b.avg-a.avg);
  const top12=new Set(ranked.slice(0,12).map(t=>t.name));
  return ranked.map((t,i)=>({...t,rank:i+1,
    // arrow: in the Championship but outside the top 12 by average, or vice versa
    arrow: t.div==="C" && !top12.has(t.name) ? "down" : t.div==="2" && top12.has(t.name) ? "up" : null }));
}
out.cAvg={ withBB:avgView(A), withoutBB:avgView(B),
  champ:nextChamp, second:nextSecond };

/* ---- El Camino +4 ---- */
function run(bonus){
  const T={}; D.teams.forEach(t=>T[t.id]={id:t.id,name:t.name,div:t.division||"second",pts:0,wins:0,tot:0,n:0});
  races.forEach(race=>{
    ["championship","second"].forEach(div=>{
      const rows=D.teams.filter(t=>(t.division||"second")===div).map(t=>{
        const s1=sm[t.player1_id+"_"+race.id],s2=sm[t.player2_id+"_"+race.id];
        if(!s1||!s2) return null;
        let score=C(s1)+C(s2)+(s1.pit_matchup_pts||0);
        if(bonus&&race.round===11&&t.name==="El Camino Rapido") score+=bonus;
        const m=D.schedule.find(x=>x.race_id===race.id&&(x.home_team_id===t.id||x.away_team_id===t.id));
        let opp=null;
        if(m){const oid=m.home_team_id===t.id?m.away_team_id:m.home_team_id;
          const o=D.teams.find(x=>x.id===oid);
          const o1=sm[o.player1_id+"_"+race.id],o2=sm[o.player2_id+"_"+race.id];
          if(o1&&o2){opp=C(o1)+C(o2)+(o1.pit_matchup_pts||0);
            if(bonus&&race.round===11&&o.name==="El Camino Rapido") opp+=bonus;}}
        return {id:t.id,score,opp,bb:(s1.pit_matchup_pts||0)>0,
          won:opp==null?null:score>opp?true:score<opp?false:null};
      }).filter(Boolean);
      const w=rows.filter(r=>r.won===true).sort((a,b)=>b.score-a.score);
      const ti=rows.filter(r=>r.won===null).sort((a,b)=>(a.bb&&!b.bb)?-1:(!a.bb&&b.bb)?1:b.score-a.score);
      const l=rows.filter(r=>r.won===false).sort((a,b)=>b.score-a.score);
      const rk=[...w,...ti,...l]; let i=0;
      while(i<rk.length){
        let end=i+1; const r=rk[i];
        if(r.won===null) while(end<rk.length&&rk[end].won===null&&rk[end].bb===r.bb) end++;
        const size=end-i;
        if(size>1&&r.won===null){let tot=0;for(let k=i;k<end;k++)tot+=TP[k]??0;
          for(let k=i;k<end;k++) T[rk[k].id].pts+=tot/size;}
        else for(let k=i;k<end;k++) T[rk[k].id].pts+=TP[k]??0;
        i=end;
      }
      rk.forEach(r=>{const t=T[r.id];if(r.won===true)t.wins++;t.tot+=r.score;t.n++;});
    });
  });
  Object.values(T).forEach(t=>{t.pts=Math.round(t.pts*10)/10;t.avg=+(t.tot/t.n).toFixed(1);});
  const by=d=>Object.values(T).filter(t=>t.div===d).sort((a,b)=>b.pts-a.pts||b.wins-a.wins||b.avg-a.avg);
  return {champ:by("championship"),second:by("second")};
}
const real=run(0), alt=run(4);
const pFifth=real.second[4];
out.cEC={
  real: real.champ.map((t,i)=>({name:t.name,pos:i+1,pts:t.pts,avg:t.avg})),
  alt:  alt.champ.map((t,i)=>({name:t.name,pos:i+1,pts:t.pts,avg:t.avg})),
  fifthSecond:{name:pFifth.name,avg:pFifth.avg},
  realSwap:{eighth:real.champ[7].name,avg:real.champ[7].avg,fires:pFifth.avg>real.champ[7].avg},
  altSwap:{eighth:alt.champ[7].name,avg:alt.champ[7].avg,fires:pFifth.avg>alt.champ[7].avg},
};

/* ---- pit-pick extremity ---- */
const ext={}; D.teams.forEach(t=>ext[t.id]={name:t.name,d:0,n:0,gs:[]});
races.forEach(r=>{
  const gs=D.picks.filter(p=>p.race_id===r.id&&p.pit_guess!=null).map(p=>p.pit_guess);
  if(!gs.length) return;
  const mean=gs.reduce((a,b)=>a+b,0)/gs.length;
  D.teams.forEach(t=>[t.player1_id,t.player2_id].forEach(pid=>{
    const g=pk[pid+"_"+r.id]?.pit_guess; if(g==null) return;
    ext[t.id].d+=Math.abs(g-mean); ext[t.id].n++; ext[t.id].gs.push(+g.toFixed(2));
  }));
});
out.cPit=Object.values(ext).map(e=>{
  const st=[...A.champ,...A.second].find(x=>x.name===e.name);
  return {name:e.name,dev:+(e.d/e.n).toFixed(2),lo:Math.min(...e.gs),hi:Math.max(...e.gs),
    bbPct:out.c5.hitRate.find(h=>h.name===e.name)?.pct??0, pts:st.pts,
    inNextChamp:nextChamp.includes(e.name)};
}).sort((a,b)=>b.dev-a.dev);

/* ---- drivers, per race in pool ---- */
const perRace={};
races.forEach(r=>{const m={};
  D.scores.filter(s=>s.race_id===r.id).forEach(s=>{for(const[k,v]of Object.entries(dp(s))) m[CANON(k)]=v;});
  perRace[r.round]=m;});
const drv={};
Object.values(perRace).forEach(m=>{for(const[n,v]of Object.entries(m)){
  drv[n]||={name:n,races:0,pts:0,dnf:0,zero:0};
  drv[n].races++; drv[n].pts+=v; if(v===-1)drv[n].dnf++; else if(v===0)drv[n].zero++;}});
const pop={}; D.picks.forEach(p=>(p.finishing_order||[]).forEach(d=>{const c=CANON(d);pop[c]=(pop[c]||0)+1;}));
out.cDrv=Object.values(drv).map(d=>({...d,avg:+(d.pts/d.races).toFixed(2),cards:pop[d.name]||0}))
  .sort((a,b)=>b.avg-a.avg);

/* ---- best finish payout ---- */
const bf={};
D.picks.forEach(p=>{
  const raw=String(p.best_finish??"").replace(/[^0-9]/g,""); if(!raw) return;
  const g=parseInt(raw,10), s=sm[p.player_id+"_"+p.race_id]; if(!s) return;
  bf[g]||={g,n:0,hit:0}; bf[g].n++; if((s.best_finish_bonus||0)>0) bf[g].hit++;
});
out.cBF=Object.values(bf).filter(b=>b.n>=5).sort((a,b)=>a.g-b.g)
  .map(b=>({...b,pct:Math.round(100*b.hit/b.n)}));

/* ---- over / under ---- */
let ov={w:0,n:0,p:0}, un={w:0,n:0,p:0};
races.forEach(r=>D.schedule.filter(x=>x.race_id===r.id).forEach(m=>{
  const h=D.teams.find(t=>t.id===m.home_team_id), a=D.teams.find(t=>t.id===m.away_team_id);
  if(!h||!a) return;
  const hb=sm[h.player1_id+"_"+r.id]?.pit_matchup_pts||0, ab=sm[a.player1_id+"_"+r.id]?.pit_matchup_pts||0;
  ov.n++; un.n++; ov.p+=hb; un.p+=ab; if(hb>0)ov.w++; if(ab>0)un.w++;
}));
out.cOU={over:{...ov,pct:Math.round(100*ov.w/ov.n)},under:{...un,pct:Math.round(100*un.w/un.n)},
  push:ov.n-ov.w-un.w};

/* ---- timing buckets ---- */
const dl={}; D.races.forEach(r=>dl[r.id]=r.pick_deadline?new Date(r.pick_deadline):null);
const timed=D.picks.filter(p=>p.submitted_at&&dl[p.race_id]).map(p=>{
  const s=sm[p.player_id+"_"+p.race_id]; if(!s) return null;
  return {h:(dl[p.race_id]-new Date(p.submitted_at))/3600000, sc:C(s),
    dow:new Date(p.submitted_at).getUTCDay()};}).filter(Boolean);
const B2=[[-99,0,"After the deadline"],[0,12,"Under 12h early"],[12,24,"12 to 24h"],[24,48,"1 to 2 days"],[48,999,"More than 2 days"]];
out.cTime={buckets:B2.map(([lo,hi,lab])=>{const g=timed.filter(t=>t.h>=lo&&t.h<hi);
    return {label:lab,n:g.length,avg:+(g.reduce((a,t)=>a+t.sc,0)/g.length).toFixed(1)};}).filter(b=>b.n),
  days:["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d,i)=>{const g=timed.filter(t=>t.dow===i);
    return g.length?{day:d,n:g.length,avg:+(g.reduce((a,t)=>a+t.sc,0)/g.length).toFixed(1)}:null;}).filter(Boolean)};

/* ---- chart 10 quadrants + avatars ---- */
const photos=Object.fromEntries(D.players.map(p=>[p.name,p.photo_url||null]));
const indivs=out.c10.map(p=>p.indiv), teamPts=out.c10.map(p=>p.teamPts);
const medI=[...indivs].sort((a,b)=>a-b)[Math.floor(indivs.length/2)];
const medT=[...teamPts].sort((a,b)=>a-b)[Math.floor(teamPts.length/2)];
out.c10=out.c10.map(p=>({...p, photo:photos[p.player]||null,
  quad:(p.teamPts>=medT?"strongTeam":"weakTeam")+"/"+(p.indiv>=medI?"strongPlayer":"weakPlayer")}));
out.c10meta={medIndiv:medI, medTeam:medT};

/* ---- calendar with Malaysia ---- */
out.cal=D.races.filter(r=>r.round>=12).sort((a,b)=>a.round-b.round).map(r=>({
  round:r.round, name:r.race_name.replace(" Grand Prix",""),
  date:new Date(r.race_date+"T12:00:00Z").toLocaleDateString("en-US",{month:"short",day:"numeric",timeZone:"UTC"}),
  isNew:false }));
out.cal.push({round:"—", name:"Bahrain, held in Malaysia", date:"Oct 4", isNew:true});
out.cal.sort((a,b)=>new Date(a.date+" 2026")-new Date(b.date+" 2026"));
out.logos=Object.fromEntries(D.teams.map(t=>[t.name,t.logo_url||null]));


/* ---- chart 7 rebuilt: agreement by scoring-average quartile ---- */
{
  const all=[...A.champ,...A.second].map(t=>{
    const c8=out.c8.find(x=>x.name===t.name);
    return {name:t.name, avg:t.avg, overlap:c8.overlap, identical:c8.identical,
            wins:t.wins, p1:c8.p1, p2:c8.p2};
  }).sort((a,b)=>b.avg-a.avg);
  const labels=["Top 6 by scoring average","7th to 12th","13th to 18th","Bottom 6"];
  out.cQuart=[0,1,2,3].map(i=>{
    const g=all.slice(i*6,i*6+6);
    return { label:labels[i], rank:i+1,
      meanOverlap:+(g.reduce((a,t)=>a+t.overlap,0)/g.length).toFixed(1),
      meanAvg:+(g.reduce((a,t)=>a+t.avg,0)/g.length).toFixed(1),
      identical:g.reduce((a,t)=>a+t.identical,0),
      teams:g.map(t=>({name:t.name,overlap:t.overlap,avg:t.avg,identical:t.identical})) };
  });
}

writeFileSync(new URL("chart-data.json",SP), JSON.stringify(out));
console.log("added datasets");
console.log("  cAvg arrows (with BB):", out.cAvg.withBB.filter(t=>t.arrow).map(t=>`${t.name} ${t.arrow}`).join(", "));
console.log("  cAvg arrows (no BB):  ", out.cAvg.withoutBB.filter(t=>t.arrow).map(t=>`${t.name} ${t.arrow}`).join(", "));
console.log("  cEC: real swap fires?",out.cEC.realSwap.fires,"| alt swap fires?",out.cEC.altSwap.fires);
console.log("  cPit top3:", out.cPit.slice(0,3).map(p=>`${p.name} ${p.dev}`).join(", "));
console.log("  cDrv:", out.cDrv.length, "drivers | cBF:", out.cBF.length, "guesses");
console.log("  cOU: over", out.cOU.over.pct+"%", "under", out.cOU.under.pct+"%");
console.log("  c10 medians: indiv", medI, "team", medT);
console.log("  calendar:", out.cal.length, "rows; Malaysia included:", out.cal.some(c=>c.isNew));
console.log("  quartiles:", out.cQuart.map(q=>`${q.label} ${q.meanOverlap}%`).join(" | "));
console.log("  photos:", Object.values(photos).filter(Boolean).length, "of 48");
