import { mulberry32, randInt, shuffleInPlace } from "./rng";
import type { Assignment, Match, Params, SolveResult } from "./types";

type ScoutState = {
  lastAssigned: number; // match index
  consecutive: number;
};

function normalizeParams(p: Params) {
  return {
    ...p,
    scouts: Math.max(1, Math.min(50, Math.trunc(p.scouts))),
    obs: Math.max(0, Math.trunc(p.obs)),
    spread: Math.max(0, Math.trunc(p.spread)),
    cap: Math.max(1, Math.trunc(p.cap)),
    seed: (p.seed >>> 0) || 0,
    maxFirstPct: Math.max(0, Math.min(100, Math.trunc(p.maxFirstPct ?? 45))),
    minLastPct: Math.max(0, Math.min(100, Math.trunc(p.minLastPct ?? 65))),
    minSpanPct: Math.max(0, Math.min(100, Math.trunc(p.minSpanPct ?? 35))),
  };
}

function buildTeamAppearances(matches: Match[], excludeTeam?: number) {
  const teamToMatchIdxs = new Map<number, number[]>();
  matches.forEach((m, mi) => {
    const all = [...m.red, ...m.blue];
    for (const t of all) {
      if (excludeTeam && t === excludeTeam) continue;
      const arr = teamToMatchIdxs.get(t) ?? [];
      arr.push(mi);
      teamToMatchIdxs.set(t, arr);
    }
  });
  const teams = [...teamToMatchIdxs.keys()].sort((a, b) => a - b);
  // sort appearances
  for (const [t, arr] of teamToMatchIdxs.entries()) {
    arr.sort((a, b) => a - b);
    teamToMatchIdxs.set(t, arr);
  }
  return { teams, teamToMatchIdxs };
}

function canAssignScout(state: ScoutState, matchIdx: number, spread: number, cap: number) {
  const gap = matchIdx - state.lastAssigned;
  if (state.lastAssigned >= 0 && gap < spread) return false;
  const isConsecutive = state.lastAssigned >= 0 && matchIdx === state.lastAssigned + 1;
  if (isConsecutive && state.consecutive >= cap) return false;
  return true;
}

function pickScoutForTeam(
  scouts: ScoutState[],
  matchIdx: number,
  spread: number,
  cap: number,
  usedThisMatch: boolean[],
  rand: () => number
): number | null {
  const elig: { i: number; score: number }[] = [];
  for (let i = 0; i < scouts.length; i++) {
    if (usedThisMatch[i]) continue;
    if (!canAssignScout(scouts[i], matchIdx, spread, cap)) continue;

    const gap = scouts[i].lastAssigned < 0 ? 999999 : matchIdx - scouts[i].lastAssigned;
    const score = gap * 10 - scouts[i].consecutive * 5 + (rand() - 0.5);
    elig.push({ i, score });
  }
  if (elig.length === 0) return null;
  elig.sort((a, b) => b.score - a.score);
  return elig[0].i;
}

function computePacedMaxThisMatch(
  hardCap: number,
  remainingDemand: number,
  remainingMatches: number
) {
  const pace = Math.ceil(remainingDemand / Math.max(1, remainingMatches));
  const slack = 2; // allow a bit of burstiness
  return Math.min(hardCap, pace + slack);
}

function checkBoundsForTeam(chosen: number[], totalMatches: number, maxFirstIdx: number, minLastIdx: number, minSpan: number, obs: number) {
  if (obs <= 0) return true;
  if (chosen.length < obs) return false;

  const earliest = chosen[0];
  const latest = chosen[chosen.length - 1];

  // Must include an early and late observation when obs >= 2
  if (obs >= 2) {
    const hasEarly = chosen.some((mi) => mi <= maxFirstIdx);
    const hasLate = chosen.some((mi) => mi >= minLastIdx);
    if (!hasEarly || !hasLate) return false;

    if ((latest - earliest) < minSpan) return false;
  } else {
    // obs==1: just ensure it's not impossible; allow anywhere
    return true;
  }
  return true;
}

function buildDesiredMatchesPerTeam(
  teams: number[],
  teamToMatchIdxs: Map<number, number[]>,
  obs: number,
  totalMatches: number,
  maxFirstPct: number,
  minLastPct: number,
  minSpanPct: number,
  rand: () => number
) {
  const desiredMatchIdxs = new Map<number, number[]>();
  const desiredByMatch = new Map<number, number[]>();

  const maxFirstIdx = Math.floor((totalMatches - 1) * (maxFirstPct / 100));
  const minLastIdx = Math.floor((totalMatches - 1) * (minLastPct / 100));
  const minSpan = Math.floor((totalMatches - 1) * (minSpanPct / 100));

  for (const t of teams) {
    const appearances = teamToMatchIdxs.get(t)!; // sorted
    const A = appearances.length;

    if (obs <= 0) {
      desiredMatchIdxs.set(t, []);
      continue;
    }

    // We try multiple times to pick obs appearances that satisfy bounds,
    // anchored to full-schedule bucket centers for spread.
    let best: number[] | null = null;
    let bestPenalty = Infinity;

    const TRIES = 40;
    for (let attempt = 0; attempt < TRIES; attempt++) {
      // bucket centers across WHOLE schedule
      const centers: number[] = [];
      for (let k = 0; k < obs; k++) {
        const c = Math.round(((k + 0.5) * (totalMatches - 1)) / obs);
        centers.push(c);
      }

      // jitter centers a bit (deterministic)
      const jitterRadius = Math.max(1, Math.floor(totalMatches / Math.max(1, obs * 6)));
      for (let i = 0; i < centers.length; i++) {
        const jmag = rand() < 0.65 ? randInt(rand, 0, jitterRadius) : 0;
        const jdir = rand() < 0.5 ? -1 : 1;
        centers[i] = Math.max(0, Math.min(totalMatches - 1, centers[i] + jdir * jmag));
      }

      // choose closest unused appearance to each center
      const used = new Set<number>();
      const chosen: number[] = [];

      for (const center of centers) {
        let bestMi: number | null = null;
        let bestDist = Infinity;

        for (const mi of appearances) {
          if (used.has(mi)) continue;
          const d = Math.abs(mi - center);
          if (d < bestDist) {
            bestDist = d;
            bestMi = mi;
          } else if (d === bestDist && rand() < 0.5) {
            bestMi = mi;
          }
        }

        if (bestMi !== null) {
          used.add(bestMi);
          chosen.push(bestMi);
        }
      }

      // fill remaining if needed
      if (chosen.length < obs) {
        const remaining = appearances.filter((mi) => !used.has(mi));
        shuffleInPlace(remaining, rand);
        for (const mi of remaining) {
          if (chosen.length >= obs) break;
          chosen.push(mi);
          used.add(mi);
        }
      }

      chosen.sort((a, b) => a - b);

      // score: bounds violations are huge penalty, otherwise prefer closeness to centers (already implicit)
      let penalty = 0;
      if (!checkBoundsForTeam(chosen, totalMatches, maxFirstIdx, minLastIdx, minSpan, obs)) {
        penalty += 1_000_000;
        // softer penalty to guide toward satisfying early/late/span
        if (obs >= 2) {
          const earliest = chosen[0];
          const latest = chosen[chosen.length - 1];
          const hasEarly = chosen.some((mi) => mi <= maxFirstIdx);
          const hasLate = chosen.some((mi) => mi >= minLastIdx);
          if (!hasEarly) penalty += (earliest - 0) * 10;
          if (!hasLate) penalty += ((totalMatches - 1) - latest) * 10;
          const span = latest - earliest;
          if (span < minSpan) penalty += (minSpan - span) * 50;
        }
      }

      // Add a tiny randomness so we don't always pick identical best
      penalty += rand() * 0.01;

      if (penalty < bestPenalty) {
        bestPenalty = penalty;
        best = chosen;
        if (bestPenalty < 0.5) break; // good enough
      }
    }

    const finalChosen = best ?? appearances.slice(0, Math.min(obs, A));
    desiredMatchIdxs.set(t, finalChosen);

    for (const mi of finalChosen) {
      const arr = desiredByMatch.get(mi) ?? [];
      arr.push(t);
      desiredByMatch.set(mi, arr);
    }
  }

  for (const [mi, list] of desiredByMatch.entries()) {
    shuffleInPlace(list, rand);
    desiredByMatch.set(mi, list);
  }

  return { desiredMatchIdxs, desiredByMatch };
}

function scoreResult(teams: number[], obs: number, teamCounts: Map<number, number>, spreadPenalty: number) {
  let unmet = 0;
  for (const t of teams) {
    const got = teamCounts.get(t) ?? 0;
    if (got < obs) unmet += (obs - got);
  }
  if (unmet > 0) return 1_000_000_000 + unmet * 1_000_000 + spreadPenalty;
  return spreadPenalty;
}

function solveOnce(matches: Match[], params: Params) {
  const p = normalizeParams(params);
  const rand = mulberry32(p.seed);

  const { teams, teamToMatchIdxs } = buildTeamAppearances(matches, p.excludeTeam);

  const remaining = new Map<number, number>();
  for (const t of teams) remaining.set(t, p.obs);

  const { desiredMatchIdxs, desiredByMatch } = buildDesiredMatchesPerTeam(
    teams,
    teamToMatchIdxs,
    p.obs,
    matches.length,
    p.maxFirstPct ?? 45,
    p.minLastPct ?? 65,
    p.minSpanPct ?? 35,
    rand
  );

  const scouts: ScoutState[] = Array.from({ length: p.scouts }, () => ({ lastAssigned: -1, consecutive: 0 }));

  const assignments: Assignment[] = matches.map((m) => ({
    matchKey: m.key,
    matchNumber: m.matchNumber,
    scoutToTeam: Array.from({ length: p.scouts }, () => null),
  }));

  let spreadPenalty = 0;

  function assignMatch(matchIdx: number, preferredTeamsFirst: number[]) {
    const usedThisMatch = Array.from({ length: p.scouts }, () => false);

    const matchTeams = [...matches[matchIdx].red, ...matches[matchIdx].blue].filter(
      (t) => !(p.excludeTeam && t === p.excludeTeam)
    );

    const candidates = matchTeams.filter((t) => (remaining.get(t) ?? 0) > 0);

    const desiredNowSet = new Set<number>(preferredTeamsFirst);

    candidates.sort((a, b) => {
      const aDesiredNow = desiredNowSet.has(a) ? 1 : 0;
      const bDesiredNow = desiredNowSet.has(b) ? 1 : 0;
      if (aDesiredNow !== bDesiredNow) return bDesiredNow - aDesiredNow;

      const ar = remaining.get(a) ?? 0;
      const br = remaining.get(b) ?? 0;
      if (ar !== br) return br - ar;

      // urgency: nearer desired match gets priority
      const aDesired = desiredMatchIdxs.get(a) ?? [];
      const bDesired = desiredMatchIdxs.get(b) ?? [];
      const aNext = aDesired.find((d) => d >= matchIdx) ?? Infinity;
      const bNext = bDesired.find((d) => d >= matchIdx) ?? Infinity;
      if (aNext !== bNext) return aNext - bNext;

      return a - b;
    });

    // small chance to shuffle to increase randomness without destroying spread
    if (candidates.length > 2 && rand() < 0.35) shuffleInPlace(candidates, rand);

    const hardCap = Math.min(p.scouts, 6);

    let remainingDemand = 0;
    for (const v of remaining.values()) remainingDemand += Math.max(0, v);
    const maxThisMatch = computePacedMaxThisMatch(hardCap, remainingDemand, matches.length - matchIdx);

    let assignedCount = 0;

    for (const team of candidates) {
      if (assignedCount >= maxThisMatch) break;

      const si = pickScoutForTeam(scouts, matchIdx, p.spread, p.cap, usedThisMatch, rand);
      if (si === null) continue;

      assignments[matchIdx].scoutToTeam[si] = team;
      usedThisMatch[si] = true;
      assignedCount++;

      remaining.set(team, (remaining.get(team) ?? 0) - 1);

      // soft spread penalty
      const gap = scouts[si].lastAssigned < 0 ? 999999 : matchIdx - scouts[si].lastAssigned;
      if (gap < Math.max(1, p.spread)) spreadPenalty += (Math.max(1, p.spread) - gap);

      const isConsec = scouts[si].lastAssigned >= 0 && matchIdx === scouts[si].lastAssigned + 1;
      scouts[si].consecutive = isConsec ? scouts[si].consecutive + 1 : 1;
      scouts[si].lastAssigned = matchIdx;
    }
  }

  // pass 1: desired-first
  for (let mi = 0; mi < matches.length; mi++) {
    const desiredTeams = desiredByMatch.get(mi) ?? [];
    assignMatch(mi, desiredTeams);
  }

  // repair pass: fill any remaining needs, still paced
  for (let loop = 0; loop < 2; loop++) {
    let progress = false;

    for (let mi = 0; mi < matches.length; mi++) {
      const matchTeams = [...matches[mi].red, ...matches[mi].blue].filter(
        (t) => !(p.excludeTeam && t === p.excludeTeam)
      );

      const stillNeed = matchTeams.filter((t) => (remaining.get(t) ?? 0) > 0);
      if (stillNeed.length === 0) continue;

      stillNeed.sort((a, b) => (remaining.get(b) ?? 0) - (remaining.get(a) ?? 0));
      const usedThisMatch = assignments[mi].scoutToTeam.map((v) => v !== null);

      const hardCap = Math.min(p.scouts, 6);
      let remainingDemand = 0;
      for (const v of remaining.values()) remainingDemand += Math.max(0, v);
      const maxThisMatch = computePacedMaxThisMatch(hardCap, remainingDemand, matches.length - mi);

      let currentlyAssigned = usedThisMatch.filter(Boolean).length;

      for (const team of stillNeed) {
        if (currentlyAssigned >= maxThisMatch) break;

        const si = pickScoutForTeam(scouts, mi, p.spread, p.cap, usedThisMatch, rand);
        if (si === null) continue;

        assignments[mi].scoutToTeam[si] = team;
        usedThisMatch[si] = true;
        currentlyAssigned++;

        remaining.set(team, (remaining.get(team) ?? 0) - 1);
        progress = true;

        const gap = scouts[si].lastAssigned < 0 ? 999999 : mi - scouts[si].lastAssigned;
        if (gap < Math.max(1, p.spread)) spreadPenalty += (Math.max(1, p.spread) - gap);

        const isConsec = scouts[si].lastAssigned >= 0 && mi === scouts[si].lastAssigned + 1;
        scouts[si].consecutive = isConsec ? scouts[si].consecutive + 1 : 1;
        scouts[si].lastAssigned = mi;
      }
    }

    if (!progress) break;
  }

  const teamCounts = new Map<number, number>();
  for (const t of teams) teamCounts.set(t, 0);

  for (const a of assignments) {
    for (const team of a.scoutToTeam) {
      if (team === null) continue;
      teamCounts.set(team, (teamCounts.get(team) ?? 0) + 1);
    }
  }

  return { assignments, teamCounts, spreadPenalty, teams, teamToMatchIdxs };
}

export function solve(matches: Match[], params: Params): SolveResult {
  const p = normalizeParams(params);

  const { teams, teamToMatchIdxs } = buildTeamAppearances(matches, p.excludeTeam);

  if (!p.event) {
    return { feasible: false, message: "Missing event key.", assignments: [], teamCounts: new Map(), teams: [], attemptsUsed: 0 };
  }

  for (const t of teams) {
    const A = teamToMatchIdxs.get(t)!.length;
    if (p.obs > A) {
      return {
        feasible: false,
        message: `Impossible: Team ${t} appears ${A} times but Number Of Observations = ${p.obs}.`,
        assignments: [],
        teamCounts: new Map(),
        teams,
        attemptsUsed: 0,
      };
    }
  }

  const capacityPerMatch = Math.min(p.scouts, 6);
  const demand = teams.length * p.obs;
  const capacity = matches.length * capacityPerMatch;

  if (demand > capacity) {
    return {
      feasible: false,
      message: `Impossible: demand ${demand} observations > capacity ${capacity} (matches=${matches.length} * min(scouts,6)=${capacityPerMatch}).`,
      assignments: [],
      teamCounts: new Map(),
      teams,
      attemptsUsed: 0,
    };
  }

  const ATTEMPTS = 200;
  let best: { score: number; assignments: Assignment[]; teamCounts: Map<number, number>; spreadPenalty: number } | null = null;

  for (let a = 0; a < ATTEMPTS; a++) {
    const attemptSeed = (p.seed + a * 1013904223) >>> 0;
    const once = solveOnce(matches, { ...p, seed: attemptSeed });

    const score = scoreResult(teams, p.obs, once.teamCounts, once.spreadPenalty);
    if (!best || score < best.score) {
      best = { score, assignments: once.assignments, teamCounts: once.teamCounts, spreadPenalty: once.spreadPenalty };
    }
    if (best.score === 0) break;
  }

  if (!best) {
    return { feasible: false, message: "No solution found.", assignments: [], teamCounts: new Map(), teams, attemptsUsed: ATTEMPTS };
  }

  let feasible = true;
  for (const t of teams) {
    const got = best.teamCounts.get(t) ?? 0;
    if (got < p.obs) {
      feasible = false;
      break;
    }
  }

  return {
    feasible,
    message: feasible ? undefined : "Could not satisfy all observation targets with current constraints.",
    assignments: best.assignments,
    teamCounts: best.teamCounts,
    teams,
    attemptsUsed: ATTEMPTS,
  };
}
