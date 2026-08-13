// Build every chart's dataset in one pass. Emits chart-data.json.
import { standingsThrough, D } from "./standings.mjs";
import { season as nobbSeason } from "./nobb.mjs";
import { writeFileSync } from "node:fs";

const base = s => (s.top_pick_pts||0)+(s.midfield_pts||0)+(s.order_bonus||0)+(s.best_finish_bonus||0);
const final = standingsThrough(11);
const teamById = Object.fromEntries(D.teams.map(t => [t.id, t]));
const roundOf = Object.fromEntries(D.races.map(r => [r.id, r.round]));

const UP   = ["Meatballs","HomeworkTubes.Com","TNT Roku F5 Team","Cal Aggie Racing","Peloton Aubergine"];
const DOWN = ["El Camino Rapido","Stalloni 1851","Bronco SCUderia","Wildcat Motors","Garra Dynamics"];
const SWAP_UP = "Peloton Aubergine", SWAP_DOWN = "Garra Dynamics";
const role = n => UP.includes(n) ? "up" : DOWN.includes(n) ? "down" : "stay";

// ---- 1. promotion / relegation ----
const c1 = {
  champ: final.champ.map((t,i) => ({ name:t.name, pos:i+1, pts:t.pts, avg:t.avg, wins:t.wins,
    role: role(t.name), viaSwap: t.name===SWAP_DOWN, p1:t.p1Name, p2:t.p2Name })),
  second: final.second.map((t,i) => ({ name:t.name, pos:i+1, pts:t.pts, avg:t.avg, wins:t.wins,
    role: role(t.name), viaSwap: t.name===SWAP_UP, p1:t.p1Name, p2:t.p2Name })),
};

// Standings as they stood going INTO round 11, so chart 1 can play the round
// before it plays the division swap.
{
  const b10 = standingsThrough(10);
  const r11 = (t) => t.weekly.find(w => w.round === 11);
  const mk = (rows, finalRows) => rows.map((t,i) => {
    const f = finalRows.find(x => x.name === t.name);
    const w = r11(f);
    return { name:t.name, pos:i+1, pts:t.pts, role:role(t.name),
      r11Score: w?.matchupScore ?? null, r11Opp: w?.oppName ?? null,
      r11Won: w?.won ?? null, r11Earned: w?.earned ?? 0 };
  });
  c1.beforeChamp  = mk(b10.champ,  final.champ);
  c1.beforeSecond = mk(b10.second, final.second);
}

// ---- 2. El Camino near miss: what each R11 winner earned ----
const r11id = D.races.find(r=>r.round===11).id;
const c2 = {
  winners: final.champ.map(t => ({ t, w: t.weekly.find(w=>w.round===11) }))
    .filter(x => x.w.won === true)
    .sort((a,b) => b.w.matchupScore - a.w.matchupScore)
    .map(x => ({ name:x.t.name, score:x.w.matchupScore, earned:x.w.earned, opp:x.w.oppName,
                 boxBox:x.w.bb, role: role(x.t.name) })),
  line: final.champ.slice(0,10).map((t,i)=>({name:t.name,pos:i+1,pts:t.pts,avg:t.avg,role:role(t.name)})),
  elCamino: { pts: final.champ.find(t=>t.name==="El Camino Rapido").pts, avg: final.champ.find(t=>t.name==="El Camino Rapido").avg },
  garra:    { pts: final.champ.find(t=>t.name==="Garra Dynamics").pts,   avg: final.champ.find(t=>t.name==="Garra Dynamics").avg },
  peloton:  { avg: final.second.find(t=>t.name==="Peloton Aubergine").avg },
};

// ---- 3 & 4. cumulative points by round, both divisions ----
const series = {};
D.teams.forEach(t => series[t.name] = { name:t.name, division:t.division||"second", pts:[], pos:[] });
for (let r = 1; r <= 11; r++) {
  const s = standingsThrough(r);
  ["champ","second"].forEach(k => s[k].forEach((t,i) => { series[t.name].pts.push(t.pts); series[t.name].pos.push(i+1); }));
}
const c3 = Object.values(series).filter(s=>s.division==="championship");
const c4 = Object.values(series).filter(s=>s.division!=="championship");

// ---- 5. box box: hit rate + full no-BB season ----
const bbRows = D.teams.map(t => {
  const st = [...final.champ,...final.second].find(x=>x.id===t.id);
  const hits = st.weekly.filter(w=>w.bb>0).length;
  const side = st.weekly.map(w => {
    const m = D.schedule.find(x=>x.race_id===w.raceId && (x.home_team_id===t.id||x.away_team_id===t.id));
    return m ? (m.home_team_id===t.id ? "OVER" : "UNDER") : null;
  });
  return { name:t.name, division:t.division||"second", hits, played:st.weekly.length,
           pct:Math.round(100*hits/st.weekly.length), overs:side.filter(x=>x==="OVER").length, role:role(t.name) };
}).sort((a,b)=>b.pct-a.pct);

let flipped = [];
[...final.champ,...final.second].forEach(t => t.weekly.forEach(w => {
  if (w.oppScore==null) return;
  const opp = [...final.champ,...final.second].find(x=>x.id===w.oppId);
  const ow = opp?.weekly.find(x=>x.raceId===w.raceId);
  const meNo = w.matchupScore - w.bb, oppNo = w.oppScore - (ow?.bb||0);
  if ((w.matchupScore>w.oppScore) !== (meNo>oppNo) && w.matchupScore>w.oppScore)
    flipped.push({ round:w.round, winner:t.name, loser:w.oppName, score:`${w.matchupScore}-${w.oppScore}`,
                   without:`${meNo}-${oppNo}`, bb:w.bb });
}));

// Corrected counterfactual: nobb.mjs applies the tie-splitting rule that
// TeamStandings.jsx uses. Without it the no-BOX-BOX totals were a few points out
// on most teams, which mattered because removing the line creates more ties.
const nbb = nobbSeason(false);
const c5 = { hitRate:bbRows, flipped:flipped.sort((a,b)=>a.round-b.round),
  totalMatchups:132, flippedCount:flipped.length,
  real:{ champ:final.champ.map((t,i)=>({name:t.name,pos:i+1,pts:t.pts})), second:final.second.map((t,i)=>({name:t.name,pos:i+1,pts:t.pts})) },
  without:{ champ:nbb.champ.map((t,i)=>({name:t.name,pos:i+1,pts:t.pts})), second:nbb.second.map((t,i)=>({name:t.name,pos:i+1,pts:t.pts})) } };

// ---- 6. top 12 by average, with and without box box, vs next-half membership ----
const nextChamp = new Set([...final.champ.filter(t=>!DOWN.includes(t.name)).map(t=>t.name), ...UP]);
const avgWith = [...final.champ,...final.second].map(t=>({name:t.name, avg:t.avg, division:t.division, role:role(t.name)}));
const avgNo = [...nbb.champ,...nbb.second].map(t=>({name:t.name, avg:t.avg, division:t.division, role:role(t.name)}));
const c6 = {
  withBB: avgWith.sort((a,b)=>b.avg-a.avg).map((t,i)=>({...t, rank:i+1, inNextChamp:nextChamp.has(t.name)})),
  withoutBB: avgNo.sort((a,b)=>b.avg-a.avg).map((t,i)=>({...t, rank:i+1, inNextChamp:nextChamp.has(t.name)})),
  nextChamp:[...nextChamp],
};

// ---- 7. wins vs average ----
const c7 = [...final.champ,...final.second].map(t=>({ name:t.name, wins:t.wins, avg:t.avg,
  pts:t.pts, division:t.division, role:role(t.name), p1:t.p1Name, p2:t.p2Name }));

// ---- 8. partner agreement ----
const c8 = D.teams.map(t => {
  let n=0, identical=0, shared=0;
  D.races.filter(r=>r.round<=11).forEach(r => {
    const a=D.picks.find(p=>p.player_id===t.player1_id&&p.race_id===r.id);
    const b=D.picks.find(p=>p.player_id===t.player2_id&&p.race_id===r.id);
    if(!a||!b||!a.finishing_order||!b.finishing_order) return;
    n++;
    const A=new Set(a.finishing_order), B=new Set(b.finishing_order);
    shared += [...A].filter(x=>B.has(x)).length;
    if(JSON.stringify(a.finishing_order)===JSON.stringify(b.finishing_order)) identical++;
  });
  const st=[...final.champ,...final.second].find(x=>x.id===t.id);
  return { name:t.name, overlap:+(100*shared/(n*5)).toFixed(1), identical, rounds:n,
           avg:st.avg, wins:st.wins, division:t.division||"second", role:role(t.name),
           p1:t.player1_name, p2:t.player2_name };
}).sort((a,b)=>b.overlap-a.overlap);

// ---- 9. submission timing ----
const dl = Object.fromEntries(D.races.map(r=>[r.id, r.pick_deadline?new Date(r.pick_deadline):null]));
const c9 = D.picks.filter(p=>p.submitted_at&&dl[p.race_id]).map(p=>{
  const hrs = (dl[p.race_id]-new Date(p.submitted_at))/3600000;
  const s = D.scores.find(x=>x.player_id===p.player_id&&x.race_id===p.race_id);
  return { player:p.player_name, round:roundOf[p.race_id], hours:+hrs.toFixed(1),
           late: hrs<0, score: s? base(s):null, total: s? (s.total_pts||0):null };
}).filter(x=>x.score!==null);

// ---- 10. team success vs individual ----
const c10 = D.players.map(pl => {
  const t = D.teams.find(t=>t.player1_id===pl.id||t.player2_id===pl.id);
  const st = t ? [...final.champ,...final.second].find(x=>x.id===t.id) : null;
  const mine = D.scores.filter(s=>s.player_id===pl.id);
  const indiv = mine.reduce((a,s)=>a+(s.total_pts||0)+(s.weekly_bonus_pts||0),0);
  const contrib = mine.reduce((a,s)=>a+base(s),0);
  return { player:pl.name, team:t?.name, division:t?.division||"second",
           indiv:+indiv.toFixed(1), contrib, teamPts:st?.pts??0, teamWins:st?.wins??0, role: t?role(t.name):"stay" };
}).sort((a,b)=>b.indiv-a.indiv).map((p,i)=>({...p, indivRank:i+1}));

const logos = Object.fromEntries(D.teams.map(t=>[t.name, t.logo_url||null]));
const out = { logos, meta:{ generated:D.exported_at, rounds:11, teams:24, players:48 },
  c1,c2,c3,c4,c5,c6,c7,c8,c9,c10 };
writeFileSync(new URL("./chart-data.json", import.meta.url), JSON.stringify(out));
console.log("chart-data.json written");
console.log(`  1 swaps: ${UP.length} up, ${DOWN.length} down`);
console.log(`  2 El Camino ${c2.elCamino.pts} vs Garra ${c2.garra.pts}, avg ${c2.elCamino.avg} vs Peloton ${c2.peloton.avg}`);
console.log(`  3/4 series: ${c3.length} champ, ${c4.length} second, 11 rounds each`);
console.log(`  5 box box: ${c5.flippedCount} of 132 matchups flip; hit rate range ${bbRows[bbRows.length-1].pct}-${bbRows[0].pct}%`);
console.log(`  6 top12 with BB in next champ: ${c6.withBB.slice(0,12).filter(t=>t.inNextChamp).length}/12; without: ${c6.withoutBB.slice(0,12).filter(t=>t.inNextChamp).length}/12`);
console.log(`  7 scatter: ${c7.length} teams`);
console.log(`  8 overlap: ${c8[0].name} ${c8[0].overlap}% -> ${c8[c8.length-1].name} ${c8[c8.length-1].overlap}%`);
console.log(`  9 timing: ${c9.length} picks, ${c9.filter(x=>x.late).length} late`);
console.log(` 10 players: ${c10.length}`);
console.log("\nNO-BOX-BOX SEASON, top of each division:");
console.log("  champ:", nbb.champ.slice(0,4).map(t=>`${t.name} ${t.pts}`).join(" | "));
console.log("  second:", nbb.second.slice(0,6).map(t=>`${t.name} ${t.pts}`).join(" | "));
