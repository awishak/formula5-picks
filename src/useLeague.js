import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { buildTeamTable, rankByAverage, FIRST_H2_ROUND } from "./teamTable";
import { buildPlayerTable, placesBy } from "./playerTable";
import { displayOf, shortOf, codeOf } from "./teams";

// The week, for real. Everything the Home page needs about the next race, who
// you are playing, and whether the picks are in.
//
// It returns the same shape the hardcoded snapshot had, so the components that
// read it did not have to change. What it does not return is what the snapshot
// invented: the running order, the lap count, the F1 points table and the
// circuit's character. Those have no source, and a page that makes them up is
// worse than a page that leaves them out.

// home_team_id IS the OVER seat. Home carries no other meaning.
const sideOf = (fixture, teamId) => (fixture.home_team_id === teamId ? "OVER" : "UNDER");

export function useLeague(currentUser, { round = null } = {}) {
  const [state, setState] = useState({ loading: true });

  useEffect(() => {
    if (currentUser === null) { setState({ loading: true, skipped: true }); return; }
    let alive = true;
    (async () => {
      try {
        const [players, teams, races, scores, schedule] = await Promise.all([
          supabase.from("players").select("id,name,photo_url"),
          supabase.from("teams").select("*"),
          supabase.from("races").select("*").order("round"),
          supabase.from("scores").select("*"),
          supabase.from("schedule").select("*"),
        ]).then(rs => rs.map(r => r.data || []));

        // The stop itself, once it has happened.
        const results = (await supabase.from("results").select("race_id,pit_stop_time")).data || [];

        // The championship, refreshed by the Monday cron. Empty is fine: the
        // driver cards fall back to a dash rather than a made-up number.
        const standings = (await supabase.from("driver_standings")
          .select("driver,points").order("position")).data || [];

        // The next race is the earliest whose deadline has not passed. Once it
        // has, this is still the race being run, so the page keeps showing that round.
        const now = new Date().toISOString();
        const upcoming = races.find(r => r.pick_deadline && r.pick_deadline > now);
        const scored = new Set(scores.map(s => s.race_id));
        // A pinned round is for looking at a week that has already been played.
        const race = round != null
          ? races.find(r => r.round === round)
          : (upcoming || races.filter(r => !scored.has(r.id))[0] || races[races.length - 1]);

        const me = players.find(p => p.name === currentUser) || null;
        const myTeamRow = me ? teams.find(t => t.player1_id === me.id || t.player2_id === me.id) : null;
        const mateId = myTeamRow ? [myTeamRow.player1_id, myTeamRow.player2_id].find(id => id !== me.id) : null;
        const teammate = mateId ? players.find(p => p.id === mateId) || null : null;

        // Season table for the form numbers, second-half table for the points.
        const db = { teams, races, scores, schedule };
        const season = buildTeamTable(db, { fromRound: 1, toRound: 99 });
        const half = buildTeamTable(db, { fromRound: FIRST_H2_ROUND, toRound: 99 });
        const avgRank = Object.fromEntries(rankByAverage(season).map(r => [r.id, r.avgRank]));
        // Each player's own scoring average, for the two names on a team card.
        const playerTable = buildPlayerTable({ players, teams, races, scores });
        const byPlayer = Object.fromEntries(playerTable.map(r => [r.id, r]));
        // Rank on scoring average across all 48, the same as the player
        // standings, so a rank shown here means what it means there.
        const playerRank = placesBy(playerTable, r => r.avg);
        const seasonOf = Object.fromEntries(season.map(r => [r.id, r]));
        const halfOf = Object.fromEntries(half.map(r => [r.id, r]));
        // Places share on level points, the same as the team standings page,
        // so the two never disagree. Everybody on nought is everybody in first.
        const placeOf = {};
        ["championship", "second"].forEach(div => {
          const list = half.filter(r => r.division === div);
          list.forEach((r, i) => {
            placeOf[r.id] = (i > 0 && list[i - 1].pts === r.pts) ? placeOf[list[i - 1].id] : i + 1;
          });
        });

        const fixture = myTeamRow
          ? schedule.find(m => m.race_id === race.id &&
              (m.home_team_id === myTeamRow.id || m.away_team_id === myTeamRow.id))
          : null;
        const oppRow = fixture
          ? teams.find(t => t.id === (fixture.home_team_id === myTeamRow.id
              ? fixture.away_team_id : fixture.home_team_id))
          : null;

        const teamShape = (row) => {
          if (!row) return null;
          const s = seasonOf[row.id], h = halfOf[row.id];
          const [p1, p2] = [row.player1_id, row.player2_id].map(id => players.find(p => p.id === id));
          return {
            id: row.id,
            name: displayOf(row.name),
            short: shortOf(row.name),
            code: codeOf(row.name),
            division: row.division_h2 || row.division,
            champPts: h ? h.pts : 0,
            place: placeOf[row.id] || null,
            record: s ? (s.d > 0 ? `${s.w}-${s.l}-${s.d}` : `${s.w}-${s.l}`) : "0-0",
            avg: s ? s.avg : 0,
            avgRank: avgRank[row.id] || null,
            logo: row.logo_url || null,
            players: [p1, p2].filter(Boolean).map(p => ({
              name: p.name, photo: p.photo_url || null,
              avg: byPlayer[p.id] ? byPlayer[p.id].avg : 0,
              rank: playerRank[p.id] || null,
            })),
          };
        };

        // Who has actually submitted for this race.
        const teamIds = [myTeamRow, oppRow].filter(Boolean).flatMap(t => [t.player1_id, t.player2_id]);
        const picks = teamIds.length
          ? (await supabase.from("picks").select("*").eq("race_id", race.id).in("player_id", teamIds)).data || []
          : [];
        const pickOf = Object.fromEntries(picks.map(p => [p.player_id, p]));
        // What each player put on the board this round. The four parts are the
        // ones that count toward the matchup; the needle and the weekly bonus
        // are the individual game and are not in here.
        const scoreOf = {};
        scores.filter(x => x.race_id === race.id).forEach(x => {
          scoreOf[x.player_id] = {
            top: x.top_pick_pts || 0,
            mid: x.midfield_pts || 0,
            best: x.best_finish_bonus || 0,
            order: x.order_bonus || 0,
            boxBox: x.pit_matchup_pts || 0,
          };
          const v = scoreOf[x.player_id];
          v.total = v.top + v.mid + v.best + v.order;
        });
        // A picks row is stored as top_pick / finishing_order / best_finish /
        // pit_guess; the page was written against the snapshot's shape. Map it
        // once here rather than teach every component both names.
        const asPick = (row) => row && ({
          topPick: row.top_pick,
          order: row.finishing_order || [],
          bestFinish: row.best_finish,
          pitGuess: Number(row.pit_guess),
        });

        const locked = race.pick_deadline ? race.pick_deadline <= now : false;

        if (!alive) return;
        setState({
          loading: false,
          me: currentUser,
          playerId: me ? me.id : null,
          myTeam: teamShape(myTeamRow),
          // Ten weeks of form for the opponent card, oldest first.
          oppWeeks: oppRow && seasonOf[oppRow.id] ? seasonOf[oppRow.id].weeks : [],
          teammate: teammate ? teammate.name : null,
          opp: teamShape(oppRow),
          side: fixture && myTeamRow ? sideOf(fixture, myTeamRow.id) : null,
          race: {
            id: race.id, round: race.round, name: race.race_name,
            date: race.race_date, deadline: race.pick_deadline,
            pitQuestion: race.pit_stop_question || null,
          },
          pools: {
            top: race.top_drivers || [],
            mid: race.mid_drivers || [],
          },
          myPick: me ? asPick(pickOf[me.id]) || null : null,
          matePick: mateId ? asPick(pickOf[mateId]) || null : null,
          // The four seats in this matchup, in team order. Picks are only
          // filled in once the deadline has gone: before that nobody outside
          // your own team can see them, which is the same rule PickIntel uses.
          teamBoxBox: {
            mine: myTeamRow && scoreOf[myTeamRow.player1_id] ? scoreOf[myTeamRow.player1_id].boxBox : 0,
            theirs: oppRow && scoreOf[oppRow.player1_id] ? scoreOf[oppRow.player1_id].boxBox : 0,
          },
          seats: [myTeamRow, oppRow].filter(Boolean).flatMap(t =>
            [t.player1_id, t.player2_id].filter(Boolean).map(id => {
              const p = players.find(x => x.id === id);
              const own = myTeamRow && t.id === myTeamRow.id;
              const visible = own || locked;
              return {
                id, name: p ? p.name : "?", photo: p ? p.photo_url : null,
                mine: Boolean(me && id === me.id),
                ours: Boolean(own),
                team: displayOf(t.name),
                picked: Boolean(pickOf[id]),
                pick: visible ? asPick(pickOf[id]) || null : null,
                score: visible ? scoreOf[id] || null : null,
              };
            })),
          picksIn: {
            me: Boolean(me && pickOf[me.id]),
            mate: Boolean(mateId && pickOf[mateId]),
          },
          f1Points: Object.fromEntries(standings.map(d => [d.driver, d.points])),
          // What each driver paid this round. driver_pts is written per player
          // but a driver is worth the same to everyone who has him, so the four
          // cards merge into one map. Stored as a JSON string, so it is parsed
          // before use.
          driverPts: (() => {
            const out = {};
            scores.filter(x => x.race_id === race.id).forEach(x => {
              let d = x.driver_pts;
              if (typeof d === "string") { try { d = JSON.parse(d); } catch { d = null; } }
              if (d) Object.entries(d).forEach(([k, v]) => { out[k] = v; });
            });
            return out;
          })(),
          // The order the rooting board reads down. Before a race there is no
          // grid to use, because nothing here has qualifying, so it is the
          // championship: the nearest thing to a form guide the app has.
          order: standings.map(d => d.driver),
          orderIs: "championship",
          // How many of each side picked each driver. Two means both teammates
          // have him and he scores twice for that team. Only meaningful once
          // the deadline has gone and the other side's picks are visible.
          counts: (() => {
            const mine = {}, theirs = {};
            const add = (bag, pick) => (pick ? pick.finishing_order || [] : [])
              .forEach(d => { bag[d] = (bag[d] || 0) + 1; });
            if (myTeamRow) [myTeamRow.player1_id, myTeamRow.player2_id].forEach(id => add(mine, pickOf[id]));
            if (oppRow && locked) [oppRow.player1_id, oppRow.player2_id].forEach(id => add(theirs, pickOf[id]));
            return { mine, theirs };
          })(),
          // The needle. The constructor comes out of the question itself, which
          // is the only place it is written down.
          boxBox: {
            line: (() => {
              const g = [myTeamRow, oppRow].filter(Boolean)
                .flatMap(t => [t.player1_id, t.player2_id])
                .map(id => pickOf[id] && Number(pickOf[id].pit_guess))
                .filter(v => typeof v === "number" && !Number.isNaN(v));
              return g.length ? Math.round((g.reduce((a, b) => a + b, 0) / g.length) * 100) / 100 : null;
            })(),
            // How many of the four have not been entered. The line is an
            // average, so it is not final while anyone is missing.
            waitingOn: [myTeamRow, oppRow].filter(Boolean)
              .flatMap(t => [t.player1_id, t.player2_id])
              .filter(id => id && !pickOf[id]).length,
            // The real stop, when there is one. Anything past the dial's top
            // end is pinned there: 8.2 seconds is still just "way over".
            stop: (() => {
              const r = results.find(x => x.race_id === race.id);
              const t = r && r.pit_stop_time != null ? Number(r.pit_stop_time) : null;
              return t == null || Number.isNaN(t) ? null : t;
            })(),
            side: fixture && myTeamRow ? sideOf(fixture, myTeamRow.id) : null,
            team: (race.pit_stop_question || "").replace(/['\u2019]s?\s+first pit stop.*$/i, "") || null,
            guesses: {},
          },
          // Before the deadline nobody's picks are public, so an opponent's
          // BOX BOX guesses cannot be shown. PickIntel gates on the same thing.
          locked,
        });
      } catch (e) {
        console.error(e);
        if (alive) setState({ loading: false, error: true });
      }
    })();
    return () => { alive = false; };
  }, [currentUser, round]);

  return state;
}
