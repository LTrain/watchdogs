"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Match, Params, SolveResult } from "@/lib/types";
import { clampInt, parseParams, paramsToSearchParams } from "@/lib/url";
import { solve } from "@/lib/solver";
import QRCode from "qrcode";

function makeSeed() {
  return (Math.floor(Math.random() * 2 ** 31) >>> 0);
}

function QrCodeImg({ value, size = 120 }: { value: string; size?: number }) {
  const [src, setSrc] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(value, { margin: 1, width: size })
      .then((url) => {
        if (!cancelled) setSrc(url);
      })
      .catch(() => {
        if (!cancelled) setSrc("");
      });
    return () => {
      cancelled = true;
    };
  }, [value, size]);

  if (!src) {
    return (
      <div
        style={{
          width: size,
          height: size,
          border: "1px solid #ddd",
          borderRadius: 12,
          display: "grid",
          placeItems: "center",
          color: "#888",
          fontSize: 12,
          background: "#fff",
        }}
      >
        QR…
      </div>
    );
  }

  return (
    <img
      src={src}
      alt="QR code"
      width={size}
      height={size}
      style={{ borderRadius: 12, border: "1px solid #ddd", background: "#fff" }}
    />
  );
}
function formatMatchTimeUnixSeconds(t?: number | null) {
  if (!t || !Number.isFinite(t)) return "—";
  try {
    const d = new Date(t * 1000);
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  } catch {
    return "—";
  }
}



function ensureNamesLength(names: string[], scouts: number) {
  const out = [...names];
  while (out.length < scouts) out.push(`Scout ${out.length + 1}`);
  return out.slice(0, scouts);
}

function scoutColorStyle(index: number) {
  // deterministic, distinct-ish colors using HSL
  const hue = (index * 47) % 360;
  return {
    background: `hsl(${hue} 70% 92%)`,
    border: `1px solid hsl(${hue} 45% 65%)`,
  } as const;
}

function downloadText(filename: string, text: string, mime = "text/plain") {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function toCsvCell(v: string) {
  const s = String(v ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

type ViewMode = "all" | "mobile";

export default function AssignPage() {
  const sp = useSearchParams();
  const router = useRouter();

  const parsed = useMemo(() => parseParams(new URLSearchParams(sp.toString())), [sp]);

  const [event, setEvent] = useState(parsed.event || "");
  const [scouts, setScouts] = useState(parsed.scouts);
  const [obs, setObs] = useState(parsed.obs);
  const [spread, setSpread] = useState(parsed.spread);
  const [cap, setCap] = useState(parsed.cap);
  const [exclude, setExclude] = useState(parsed.excludeTeam ?? 0);
  const [seed, setSeed] = useState(parsed.seed || 0);

  const [maxFirstPct, setMaxFirstPct] = useState<number>(parsed.maxFirstPct ?? 45);
  const [minLastPct, setMinLastPct] = useState<number>(parsed.minLastPct ?? 65);
  const [minSpanPct, setMinSpanPct] = useState<number>(parsed.minSpanPct ?? 35);

  const [scoutNames, setScoutNames] = useState<string[]>(ensureNamesLength(parsed.scoutNames ?? [], parsed.scouts));

  const [viewMode, setViewMode] = useState<ViewMode>((sp.get("view") as ViewMode) || "all");
  const [showAllMatches, setShowAllMatches] = useState<boolean>(sp.get("showAll") === "1");
  const [mobileScoutIndex, setMobileScoutIndex] = useState<number>(clampInt(Number(sp.get("scout") ?? "1"), 1, 50) - 1);

  const [lastComputedKey, setLastComputedKey] = useState<string>("");

  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [result, setResult] = useState<SolveResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function fetchMatches(ev: string) {
    const r = await fetch(`/api/tba/matches?event=${encodeURIComponent(ev)}`);
    const j = await r.json();
    if (!r.ok) throw new Error(j?.error || "Failed to fetch matches");
    return j.matches as Match[];
  }

  function buildParams(nextSeed?: number): Params {
    const names = ensureNamesLength(scoutNames, scouts);
    return {
      showAll: showAllMatches,
      event: event.trim(),
      scouts,
      obs,
      spread,
      cap,
      excludeTeam: exclude > 0 ? exclude : undefined,
      seed: (nextSeed ?? seed) >>> 0,
      scoutNames: names,
      maxFirstPct,
      minLastPct,
      minSpanPct,
    };
  }

  
  function currentParams(nextSeed?: number): Params {
    return buildParams(nextSeed);
  }

function replaceUrl(p: Params, extra?: { view?: ViewMode; scout?: number }) {
    const next = paramsToSearchParams(p);
    if (extra?.view) next.set("view", extra.view);
    if (typeof extra?.scout === "number") next.set("scout", String(extra.scout + 1));
    router.replace(`/assign?${next.toString()}`);
  }

  // Ensure seed exists in URL (stateless share link)
  useEffect(() => {
    if (!seed) {
      const s = makeSeed();
      setSeed(s);
      const p = buildParams(s);
      replaceUrl(p, { view: viewMode, scout: mobileScoutIndex });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync UI from parsed URL
  useEffect(() => {
    setEvent(parsed.event || "");
    setScouts(parsed.scouts);
    setObs(parsed.obs);
    setSpread(parsed.spread);
    setCap(parsed.cap);
    setExclude(parsed.excludeTeam ?? 0);
    setSeed(parsed.seed || 0);

    setMaxFirstPct(parsed.maxFirstPct ?? 45);
    setMinLastPct(parsed.minLastPct ?? 65);
    setMinSpanPct(parsed.minSpanPct ?? 35);

    const names = ensureNamesLength(parsed.scoutNames ?? [], parsed.scouts);
    setScoutNames(names);

    // view params (not in parseParams)
    const view = (sp.get("view") as ViewMode) || "all";
    setViewMode(view);
    setMobileScoutIndex(clampInt(Number(sp.get("scout") ?? "1"), 1, 50) - 1);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsed.event, parsed.scouts, parsed.obs, parsed.spread, parsed.cap, parsed.excludeTeam, parsed.seed, sp]);

  // Keep names length synced with scout count
  useEffect(() => {
    setScoutNames((prev) => ensureNamesLength(prev, scouts));
    // keep mobile scout index in range
    setMobileScoutIndex((prev) => Math.max(0, Math.min(scouts - 1, prev)));
  }, [scouts]);

  async function computeWithParams(p: Params) {
    setError(null);
    setResult(null);

    const ev = p.event.trim();
    if (!ev) {
      setError("Enter an event key (example: 2026miket).");
      return;
    }

    setLoading(true);
    try {
      const m = await fetchMatches(ev);
      setMatches(m);

      const res = solve(m, p);
      setResult(res);
      if (!res.feasible) setError(res.message || "No feasible solution found.");
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  // Auto-compute when loaded with URL parameters
  useEffect(() => {
    const key = sp.toString();
    if (!parsed.event) return;
    if (!parsed.seed) return; // seed bootstrap handled elsewhere
    if (key === lastComputedKey) return;

    // Only auto-run when URL clearly specifies the configuration (including seed).
    setLastComputedKey(key);

    const p: Params = {
      event: parsed.event,
      scouts: parsed.scouts,
      obs: parsed.obs,
      spread: parsed.spread,
      cap: parsed.cap,
      excludeTeam: parsed.excludeTeam,
      seed: parsed.seed,
      scoutNames: ensureNamesLength(parsed.scoutNames ?? [], parsed.scouts),
    };

    computeWithParams(p);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp, parsed, lastComputedKey]);

  function onCompute() {
    const sSeed = seed || makeSeed();
    if (!seed) setSeed(sSeed);

    const p = buildParams(sSeed);
    replaceUrl(p, { view: viewMode, scout: mobileScoutIndex });
    setLastComputedKey(""); // allow auto-run to trigger for new URL
    computeWithParams(p);
  }

  function onRandomizeSeed() {
    const s = makeSeed();
    setSeed(s);
    const p = buildParams(s);
    replaceUrl(p, { view: viewMode, scout: mobileScoutIndex });
    setLastComputedKey("");
    computeWithParams(p);
  }

  function onRecomputeSeedPlusOne() {
    const nextSeed = ((seed || 0) + 1) >>> 0;
    setSeed(nextSeed);
    const p = buildParams(nextSeed);
    replaceUrl(p, { view: viewMode, scout: mobileScoutIndex });
    setLastComputedKey("");
    computeWithParams(p);
  }

  function onCopyLink() {
    navigator.clipboard.writeText(window.location.href).catch(() => {});
  }

  function onUpdateLinkOnly() {
    const p = buildParams();
    replaceUrl(p, { view: viewMode, scout: mobileScoutIndex });
  }

  const summary = useMemo(() => {
    if (!matches || !result) return null;
    const teams = result.teams;
    const capacityPerMatch = Math.min(scouts, 6);
    const demand = teams.length * obs;
    const capacity = matches.length * capacityPerMatch;

    let unmet = 0;
    for (const t of teams) {
      const got = result.teamCounts.get(t) ?? 0;
      if (got < obs) unmet += obs - got;
    }

    return { teamsCount: teams.length, matchCount: matches.length, demand, capacity, unmet };
  }, [matches, result, scouts, obs]);

  const workload = useMemo(() => {
    if (!result) return null;
    const names = ensureNamesLength(scoutNames, scouts);

    const counts = Array.from({ length: scouts }, () => 0);
    const maxConsec = Array.from({ length: scouts }, () => 0);
    const lastMatchIdx = Array.from({ length: scouts }, () => -999999);
    const consec = Array.from({ length: scouts }, () => 0);
    const gapsSum = Array.from({ length: scouts }, () => 0);
    const gapsCount = Array.from({ length: scouts }, () => 0);

    result.assignments.forEach((a, matchIdx) => {
      a.scoutToTeam.forEach((team, si) => {
        if (si >= scouts) return;
        if (team == null) return;

        counts[si]++;

        const gap = matchIdx - lastMatchIdx[si];
        if (lastMatchIdx[si] > -999000) {
          gapsSum[si] += gap;
          gapsCount[si] += 1;
        }

        if (matchIdx === lastMatchIdx[si] + 1) consec[si] += 1;
        else consec[si] = 1;

        if (consec[si] > maxConsec[si]) maxConsec[si] = consec[si];
        lastMatchIdx[si] = matchIdx;
      });
    });

    return names.map((name, i) => ({
      index: i,
      name,
      assignments: counts[i],
      maxConsecutive: maxConsec[i],
      avgGap: gapsCount[i] ? (gapsSum[i] / gapsCount[i]) : null,
    }));
  }, [result, scoutNames, scouts]);

  function exportCsv() {
    if (!matches || !result) return;

    const names = ensureNamesLength(scoutNames, scouts);

    // Assignments CSV
    let csv = "MatchNumber,MatchKey,Red,Blue";
    for (let i = 0; i < scouts; i++) csv += `,${toCsvCell(names[i])}`;
    csv += "\n";

    matches.forEach((m, idx) => {
      const a = result.assignments[idx];
      const row = [
        m.matchNumber,
        m.key,
        m.red.join(" "),
        m.blue.join(" "),
        ...a.scoutToTeam.slice(0, scouts).map((t) => (t == null ? "" : String(t))),
      ];
      csv += row.map((x) => toCsvCell(String(x))).join(",") + "\n";
    });

    // Coverage CSV appended
    csv += "\n";
    csv += "Team,Observed,Target\n";
    result.teams.forEach((t) => {
      const got = result.teamCounts.get(t) ?? 0;
      csv += `${t},${got},${obs}\n`;
    });

    downloadText(`scout-assignments-${event || "event"}.csv`, csv, "text/csv");
  }

  // Mobile view data (one scout per phone)
  const mobileRows = useMemo(() => {
    if (!matches || !result) return [];
    const si = Math.max(0, Math.min(scouts - 1, mobileScoutIndex));
    const name = ensureNamesLength(scoutNames, scouts)[si];

    const rows: { matchNumber: number; team: number; side: "R" | "B"; opponents: number[] }[] = [];

    matches.forEach((m, idx) => {
      const a = result.assignments[idx];
      const team = a?.scoutToTeam?.[si];
      if (team == null) return;

      const isRed = m.red.includes(team);
      const side: "R" | "B" = isRed ? "R" : "B";
      const opponents = isRed ? m.blue : m.red;

      rows.push({ matchNumber: m.matchNumber, team, side, opponents });
    });

    return rows.map((r) => ({ ...r, scoutName: name }));
  }, [matches, result, scouts, mobileScoutIndex, scoutNames]);

  return (
    <main className="container">
      <h1 className="h1">Watchdogs</h1>
      <p className="sub">
        Paste a share link (URL params) and it will auto-compute. Update inputs, then recompute & share again.
      </p>

      <div className="card cardPad"><div className="grid3" style={{ alignItems: "end" }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span>Event Code (TBA event key)</span>
          <input
            value={event}
            onChange={(e) => setEvent(e.target.value)}
            placeholder="e.g. 2025mifer"
            style={{ padding: 10, border: "1px solid #ccc", borderRadius: 8 }}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span>Number Of Scouts (1–50)</span>
          <input
            type="number"
            value={scouts}
            min={1}
            max={50}
            onChange={(e) => setScouts(clampInt(Number(e.target.value), 1, 50))}
            style={{ padding: 10, border: "1px solid #ccc", borderRadius: 8 }}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span>Number Of Observations (per team)</span>
          <input
            type="number"
            value={obs}
            min={0}
            onChange={(e) => setObs(Math.max(0, Math.trunc(Number(e.target.value))))}
            style={{ padding: 10, border: "1px solid #ccc", borderRadius: 8 }}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span>Spread Weight (min gap in matches)</span>
          <input
            type="number"
            value={spread}
            min={0}
            onChange={(e) => setSpread(Math.max(0, Math.trunc(Number(e.target.value))))}
            style={{ padding: 10, border: "1px solid #ccc", borderRadius: 8 }}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span>Max Consecutive Cap</span>
          <input
            type="number"
            value={cap}
            min={1}
            onChange={(e) => setCap(Math.max(1, Math.trunc(Number(e.target.value))))}
            style={{ padding: 10, border: "1px solid #ccc", borderRadius: 8 }}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span>Exclude Team (optional)</span>
          <input
            type="number"
            value={exclude}
            min={0}
            onChange={(e) => setExclude(Math.max(0, Math.trunc(Number(e.target.value))))}
            style={{ padding: 10, border: "1px solid #ccc", borderRadius: 8 }}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span>Seed (URL-stored)</span>
          <input
            type="number"
            value={seed}
            onChange={(e) => setSeed((Number(e.target.value) >>> 0) || 0)}
            style={{ padding: 10, border: "1px solid #ccc", borderRadius: 8 }}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span>View</span>
          <select
            value={viewMode}
            onChange={(e) => {
              const v = e.target.value as ViewMode;
              setViewMode(v);
              onUpdateLinkOnly();
            }}
            style={{ padding: 10, border: "1px solid #ccc", borderRadius: 8 }}
          >
            <option value="all">All Scouts</option>
            <option value="mobile">Mobile (one scout)</option>
          </select>
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span>Mobile Scout</span>
          <select
            value={mobileScoutIndex}
            onChange={(e) => {
              const idx = clampInt(Number(e.target.value), 0, Math.max(0, scouts - 1));
              setMobileScoutIndex(idx);
              onUpdateLinkOnly();
            }}
            disabled={viewMode !== "mobile"}
            style={{ padding: 10, border: "1px solid #ccc", borderRadius: 8 }}
          >
            {ensureNamesLength(scoutNames, scouts).map((n, i) => (
              <option key={i} value={i}>
                {i + 1}: {n}
              </option>
            ))}
          </select>
        </label>

        <div style={{ gridColumn: "1 / -1", display: "flex", gap: 10, alignItems: "center", flexWrap: "nowrap", minWidth: 0 }}>
          <button onClick={onCompute}
           style={{ flex: "0 1 auto" }}>
            {loading ? "Computing…" : "Compute"}
          </button>

          <button
            onClick={onRecomputeSeedPlusOne}
            disabled={loading}
            
          >
            Recompute (seed+1)
          </button>

          <button
            onClick={onRandomizeSeed}
            disabled={loading}
            
          >
            Randomize Seed
          </button>

          <button
            onClick={onUpdateLinkOnly}
            
          >
            Update Share Link
          </button>

          <button
            onClick={onCopyLink}
            
          >
            Copy Share Link
          </button>

          <button
            onClick={exportCsv}
            disabled={!result || !matches}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid #ccc",
              background: !result ? "#f7f7f7" : "#fff",
              cursor: !result ? "not-allowed" : "pointer",
            }}
          >
            Export CSV
          </button>
        </div>
      </div>
      </div>

      {/* Scout Names */}
      
      
      <section className="card cardPad">
        <h2 style={{ marginTop: 0 }}>Schedule Spread Bounds</h2>
        <p className="small" style={{ marginTop: 0 }}>
          These bounds force each team’s observations to include early and late matches, and to span a minimum portion of the schedule.
          Values are percentages of the qualification match list.
        </p>

        <div className="grid3">
          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ fontWeight: 700 }}>Max First Observation</span>
              <span className="pill">{maxFirstPct}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={maxFirstPct}
              onChange={(e) => {
                const v = Math.max(0, Math.min(100, Math.trunc(Number(e.target.value))));
                const v2 = Math.min(v, minLastPct);
                setMaxFirstPct(v2);
              }}
            />
            <div className="small">At least one observation per team must be at or before this % of matches.</div>
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ fontWeight: 700 }}>Min Last Observation</span>
              <span className="pill">{minLastPct}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={minLastPct}
              onChange={(e) => {
                const v = Math.max(0, Math.min(100, Math.trunc(Number(e.target.value))));
                const v2 = Math.max(v, maxFirstPct);
                setMinLastPct(v2);
              }}
            />
            <div className="small">At least one observation per team must be at or after this % of matches.</div>
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ fontWeight: 700 }}>Min Span</span>
              <span className="pill">{minSpanPct}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={minSpanPct}
              onChange={(e) => {
                const v = Math.max(0, Math.min(100, Math.trunc(Number(e.target.value))));
                setMinSpanPct(v);
              }}
            />
            <div className="small">
              Earliest→latest observation for a team must span at least this % of matches (only applies when observations ≥ 2).
            </div>
          </div>
        </div>

        <div className="noPrint" style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            onClick={() => {
              setMaxFirstPct(45);
              setMinLastPct(65);
              setMinSpanPct(35);
            }}
          >
            Reset Bounds
          </button>

          <button
            onClick={() => {
              replaceUrl(currentParams(), { view: viewMode, scout: mobileScoutIndex });
            }}
          >
            Update URL
          </button>
        </div>
      </section>



      <section className="card cardPad">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
          <h2 style={{ marginTop: 0, marginBottom: 0 }}>Scout Names</h2>
          <span className="pill">{scouts} scouts</span>
        </div>
        <p className="small" style={{ marginTop: 8 }}>
          Names are saved into the URL (<span className="mono">names=...</span>) so links and QR codes remain fully stateless.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 12,
          }}
        >
          {scoutNames.map((name, i) => (
            <label key={i} style={{ display: "grid", gap: 6 }}>
              <span style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontWeight: 700 }}>{`Scout ${i + 1}`}</span>
                <span className="pill" style={{ ...scoutColorStyle(i) }}>#{i + 1}</span>
              </span>
              <input
                value={name}
                onChange={(e) => {
                  const next = [...scoutNames];
                  next[i] = e.target.value;
                  setScoutNames(next);
                }}
                placeholder={`Scout ${i + 1}`}
              />
            </label>
          ))}
        </div>

        <div className="noPrint" style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            onClick={() => {
              setScoutNames(scoutNames.map((_, i) => `Scout ${i + 1}`));
            }}
          >
            Reset Names
          </button>

          <button
            onClick={() => {
              replaceUrl(currentParams(), { view: viewMode, scout: mobileScoutIndex });
            }}
          >
            Update URL
          </button>
        </div>
      </section>



      {error && (
        <div className="notice noticeError" style={{ marginTop: 16 }}>
          <b>Error:</b> {error}
        </div>
      )}

      {summary && (
        <div className="notice" style={{ marginTop: 16 }}>
          <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
            <div><b>Teams:</b> {summary.teamsCount}</div>
            <div><b>QM Matches:</b> {summary.matchCount}</div>
            <div><b>Demand:</b> {summary.demand}</div>
            <div><b>Capacity:</b> {summary.capacity}</div>
            <div><b>Unmet:</b> {summary.unmet}</div>
            <div><b>Attempts:</b> {result?.attemptsUsed}</div>
          </div>
        </div>
      )}

      {/* Workload Summary */}
      {workload && (
        <section style={{ marginTop: 18, border: "1px solid #ddd", borderRadius: 12, padding: 12 }}>
          <h2 style={{ marginTop: 0 }}>Per-Scout Workload Summary</h2>
          <div className="tableWrap">
            <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 700 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #ddd" }}>Scout</th>
                  <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #ddd" }}>Assignments</th>
                  <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #ddd" }}>Max Consecutive</th>
                  <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #ddd" }}>Avg Gap (matches)</th>
                </tr>
              </thead>
              <tbody>
                {workload.map((w) => (
                  <tr key={w.index}>
                    <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>
                      <span style={{ padding: "4px 10px", borderRadius: 999, ...scoutColorStyle(w.index) }}>
                        {w.name}
                      </span>
                    </td>
                    <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>{w.assignments}</td>
                    <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>{w.maxConsecutive}</td>
                    <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>
                      {w.avgGap == null ? "—" : w.avgGap.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Results */}
      {matches && result && viewMode === "all" && (
        <div style={{ marginTop: 18, display: "grid", gap: 18 }}>
          <section style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12 }}>
            <h2 style={{ marginTop: 0 }}>Assignments (by match)</h2>

            <div className="noPrint" style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginTop: 8 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={showAllMatches}
                  onChange={(e) => {
                    const v = e.target.checked;
                    setShowAllMatches(v);
                    replaceUrl(currentParams(), { view: viewMode, scout: mobileScoutIndex });
                  }}
                  style={{ width: 18, height: 18 }}
                />
                <span className="small">Show all matches (including unassigned)</span>
              </label>
            </div>

            <div className="tableWrap">
              <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 900 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #ddd" }}>QM</th>
                    <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #ddd" }}>Time</th>
                    <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #ddd" }}>Red</th>
                    <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #ddd" }}>Blue</th>
                    <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #ddd" }}>Scout Assignments</th>
                  </tr>
                </thead>
                <tbody>
                  {matches.map((m, i) => {
                    const a = result.assignments[i];
                    const names = ensureNamesLength(scoutNames, scouts);
                    const anyAssigned = a.scoutToTeam.some((t) => Boolean(t));
                    if (!showAllMatches && !anyAssigned) return null;
                    return (
                      <tr key={m.key}>
                        <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>{m.matchNumber}</td>
                        <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>{formatMatchTimeUnixSeconds(m.time)}</td>
                        <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>{m.red.join(", ")}</td>
                        <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>{m.blue.join(", ")}</td>
                        <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>
                          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                                                        {a.scoutToTeam
                              .slice(0, Math.min(scouts, 50))
                              .map((t, si) => ({ t, si }))
                              .filter((x) => Boolean(x.t))
                              .map(({ t, si }) => (
                              <span
                                key={si}
                                style={{
                                  padding: "4px 10px",
                                  borderRadius: 999,
                                  ...(scoutColorStyle(si)),
                                }}
                              >
                                {names[si] ?? `Scout ${si + 1}`}: {t}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          
          <section className="card cardPad">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
              <h2 style={{ marginTop: 0, marginBottom: 0 }}>Per‑Scout Schedule Links</h2>
              <span className="pill">QR + personal pages</span>
            </div>
            <p className="small" style={{ marginTop: 8 }}>
              Share each scout’s personal page (mobile view) via URL or QR. Each page is fully stateless and locked to the current parameters/seed.
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: 12,
              }}
            >
              {Array.from({ length: scouts }, (_, si) => {
                const name = scoutNames[si] ?? `Scout ${si + 1}`;

                const sp2 = paramsToSearchParams(currentParams());
                sp2.set("view", "mobile");
                sp2.set("scout", String(si + 1));
                const path = `/assign?${sp2.toString()}`;
                const fullUrl =
                  typeof window !== "undefined" ? `${window.location.origin}${path}` : path;

                const rows = result.assignments
                  .map((a, mi) => {
                    const team = a.scoutToTeam[si];
                    return team ? { matchNumber: matches[mi].matchNumber, time: matches[mi].time, team } : null;
                  })
                  .filter((x): x is { matchNumber: number; time?: number | null; team: number } => x !== null);

                return (
                  <div key={si} className="card" style={{ padding: 12, display: "grid", gap: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                      <div>
                        <div style={{ fontWeight: 800, letterSpacing: -0.2 }}>{name}</div>
                        <div className="small">Scout {si + 1}</div>
                      </div>
                      <span className="pill" style={{ ...scoutColorStyle(si), color: "rgba(255,255,255,0.92)" }}>
                        {rows.length} matches
                      </span>
                    </div>

                    <div className="noPrint" style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                      <a
                        href={path}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          padding: "10px 12px",
                          borderRadius: 12,
                          border: "1px solid rgba(255,255,255,0.14)",
                          textDecoration: "none",
                          background: "rgba(255,255,255,0.06)",
                        }}
                      >
                        Open Scout Page
                      </a>

                      <button
                        onClick={() => navigator.clipboard.writeText(fullUrl).catch(() => {})}
                      >
                        Copy URL
                      </button>
                    </div>

                    <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
                      <QrCodeImg value={fullUrl} size={120} />

                      <div style={{ minWidth: 160, flex: 1 }}>
                        <div className="small" style={{ marginBottom: 6 }}>Assigned matches</div>
                        <div style={{ maxHeight: 180, overflow: "auto", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: 10, background: "rgba(0,0,0,0.18)" }}>
                          {rows.length === 0 ? (
                            <div className="small" style={{ color: "rgba(255,255,255,0.55)" }}>No assignments.</div>
                          ) : (
                            <div style={{ display: "grid", gap: 8 }}>
                              {rows.map((r) => (
                                <div key={`${r.matchNumber}-${r.team}`} style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                                  <span>
                                    QM {r.matchNumber}{" "}
                                    <span className="small">({formatMatchTimeUnixSeconds(r.time)})</span>
                                  </span>
                                  <span style={{ fontWeight: 800 }}>{r.team}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>



          <section style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12 }}>
            <h2 style={{ marginTop: 0 }}>Coverage (per team)</h2>
            <div className="tableWrap">
              <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 600 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #ddd" }}>Team</th>
                    <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #ddd" }}>Observed</th>
                    <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #ddd" }}>Target</th>
                    <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #ddd" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {result.teams.map((t) => {
                    const got = result.teamCounts.get(t) ?? 0;
                    const ok = got >= obs;
                    return (
                      <tr key={t}>
                        <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>{t}</td>
                        <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>{got}</td>
                        <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>{obs}</td>
                        <td style={{ padding: 8, borderBottom: "1px solid #eee", color: ok ? "green" : "crimson" }}>
                          {ok ? "OK" : "SHORT"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* Mobile view */}
      {matches && result && viewMode === "mobile" && (
        <section style={{ marginTop: 18, border: "1px solid #ddd", borderRadius: 12, padding: 14 }}>
          <h2 style={{ marginTop: 0 }}>
            Mobile View:{" "}
            <span style={{ padding: "4px 10px", borderRadius: 999, ...scoutColorStyle(mobileScoutIndex) }}>
              {ensureNamesLength(scoutNames, scouts)[mobileScoutIndex] ?? `Scout ${mobileScoutIndex + 1}`}
            </span>
          </h2>
          <p style={{ color: "#555", marginTop: 6 }}>
            This view shows only the matches where this scout has an assignment — ideal for one phone per scout.
          </p>

          {mobileRows.length === 0 ? (
            <div style={{ padding: 10, background: "#fafafa", borderRadius: 10, border: "1px solid #eee" }}>
              No assignments for this scout under current constraints.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {mobileRows.map((r, idx) => (
                <div
                  key={`${r.matchNumber}-${idx}`}
                  style={{
                    padding: 12,
                    borderRadius: 14,
                    border: "1px solid #ddd",
                    background: "#fff",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>QM {r.matchNumber}</div>
                    <div style={{ color: "#666" }}>
                      Watch: <b>{r.team}</b> ({r.side})
                    </div>
                  </div>
                  <div style={{ marginTop: 6, color: "#444" }}>
                    Opponents: {r.opponents.join(", ")}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </main>
  );
}
