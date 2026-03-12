# TBA Watchdogs Scout Assigner (Stateless)

A Next.js + TypeScript web app that:
- Fetches qualification match schedules from The Blue Alliance (TBA) for a given event key
- Generates deterministic (seeded) scouting assignments
- Enforces constraints:
  - 1 scout observes at most 1 team per match
  - Each team is observed `obs` times (if feasible)
  - Spread (minimum gap between assignments for a scout)
  - Max consecutive assignments per scout
  - Optional excluded team

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env.local`:
```bash
TBA_AUTH_KEY=your_tba_key_here
APP_USER_AGENT=K9ScoutAssigner/1.0 (contact: you@example.com)
```

3. Run:
```bash
npm run dev
```

Open: http://localhost:3000/assign

## URL Parameters (Stateless)

`/assign?event=2026miket&scouts=12&obs=6&spread=2&cap=3&exclude=0&seed=12345`
