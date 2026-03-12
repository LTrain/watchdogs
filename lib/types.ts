export type Match = {
  key: string;
  matchNumber: number; // QM number
  time?: number | null; // scheduled/actual time as unix seconds (if provided by TBA)
  red: number[]; // 3 teams
  blue: number[]; // 3 teams
};

export type Params = {
  event: string; // TBA event key (ex: 2026miket)
  scouts: number; // 1..50
  obs: number; // 0..max appearances per team
  spread: number; // min gap between assignments for a scout (in matches)
  cap: number; // max consecutive assigned matches per scout
  excludeTeam?: number; // optional team number
  seed: number; // deterministic seed

  // UI-only (still URL-backed, keeps app stateless)
  scoutNames?: string[]; // optional; length should match scouts

  // Percent bounds to enforce spread across the schedule (0..100 integers)
  // maxFirstPct: at least one observation for a team must occur at or before this % of the schedule
  // minLastPct: at least one observation for a team must occur at or after this % of the schedule
  // minSpanPct: (latestObs - earliestObs) must span at least this % of the schedule (only applies when obs>=2)
  maxFirstPct?: number; // default 45
  minLastPct?: number;  // default 65
  minSpanPct?: number;  // default 35
  showAll?: boolean;
};

export type Assignment = {
  matchKey: string;
  matchNumber: number;
  scoutToTeam: (number | null)[];
};

export type SolveResult = {
  feasible: boolean;
  message?: string;
  assignments: Assignment[];
  teamCounts: Map<number, number>;
  teams: number[];
  attemptsUsed: number;
};
