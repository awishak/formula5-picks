// No-BOX-BOX season, WITH the tie-splitting rule from TeamStandings.jsx.
import { readFileSync } from "node:fs";
export const D = JSON.parse(readFileSync(process.env.F5_DATA || (process.env.HOME + "/Downloads/formula5_data_2026-07-27.json"),"utf8"));
const TP=[25,18,15,12,10,8,6,4,2,1,0,0];
const sm={}; D.scores.forEach(s=>sm[s.player_id+"_"+s.race_id]=s);
const contrib = s => (s.top_pick_pts||0)+(s.midfield_pts||0)+(s.order_bonus||0)+(s.best_finish_bonus||0);

export function season(useBB){
  const T={}; D.teams.forEach(t=>T[t.id]={id:t.id,name:t.name,div:t.division||"second",pts:0,wins:0,ties:0,tot:0,n:0,weekly:[]});
  D.races.filter(r=>r.round<=11).sort((a,b)=>a.round-b.round).forEach(race=>{
    ["championship","second"].forEach(div=>{
      const rows=D.teams.filter(t=>(t.division||"second")===div).map(t=>{
        const s1=sm[t.player1_id+"_"+race.id], s2=sm[t.player2_id+"_"+race.id];
        if(!s1||!s2) return null;
        const bb = useBB ? (s1.pit_matchup_pts||0) : 0;
        const score = contrib(s1)+contrib(s2)+bb;
        const m=D.schedule.find(x=>x.race_id===race.id&&(x.home_team_id===t.id||x.away_team_id===t.id));
        let opp=null, oppName=null;
        if(m){
          const oid=m.home_team_id===t.id?m.away_team_id:m.home_team_id;
          const o=D.teams.find(x=>x.id===oid); oppName=o.name;
          const o1=sm[o.player1_id+"_"+race.id], o2=sm[o.player2_id+"_"+race.id];
          if(o1&&o2) opp = contrib(o1)+contrib(o2)+(useBB?(o1.pit_matchup_pts||0):0);
        }
        return {id:t.id,score,opp,oppName,round:race.round,bbCorrect: useBB && bb>0,
                won: opp==null?null: score>opp?true: score<opp?false:null};
      }).filter(Boolean);
      const w =rows.filter(r=>r.won===true ).sort((a,b)=>b.score-a.score);
      const ti=rows.filter(r=>r.won===null ).sort((a,b)=>(a.bbCorrect&&!b.bbCorrect)?-1:(!a.bbCorrect&&b.bbCorrect)?1:b.score-a.score);
      const l =rows.filter(r=>r.won===false).sort((a,b)=>b.score-a.score);
      const ranked=[...w,...ti,...l];
      let i=0;
      while(i<ranked.length){
        let end=i+1; const r=ranked[i];
        if(r.won===null) while(end<ranked.length && ranked[end].won===null && ranked[end].bbCorrect===r.bbCorrect) end++;
        const size=end-i;
        if(size>1 && r.won===null){
          let tot=0; for(let k=i;k<end;k++) tot += TP[k]??0;
          const split=tot/size;
          for(let k=i;k<end;k++){ const t=T[ranked[k].id]; t.pts+=split; t.earned=split; }
        } else {
          for(let k=i;k<end;k++){ const t=T[ranked[k].id]; t.pts += TP[k]??0; }
        }
        i=end;
      }
      ranked.forEach(r=>{ const t=T[r.id]; if(r.won===true)t.wins++; if(r.won===null)t.ties++; t.tot+=r.score; t.n++; t.weekly.push(r); });
    });
  });
  Object.values(T).forEach(t=>{ t.pts=Math.round(t.pts*10)/10; t.avg=+(t.tot/t.n).toFixed(1); });
  const by=d=>Object.values(T).filter(t=>t.div===d).sort((a,b)=>b.pts-a.pts||b.wins-a.wins||b.avg-a.avg);
  return {champ:by("championship"), second:by("second")};
}
