"use client";

import { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "watchdogs-hide-readme";

const instructions = [
  "Enter your TBA event key, like 2026miket.",
  "Set the number of scouts available for the event.",
  "Set how many observations per team you want.",
  "Adjust spread and max consecutive assignments to balance workload.",
  "Optionally exclude a team if needed.",
  "Click Compute to generate assignments.",
  "Use Copy Share Link to send the exact setup to others.",
  "Switch to Mobile view to display one scout’s schedule at a time.",
  "Export CSV if you want a spreadsheet copy.",
];

export default function ReadmeDialog() {
  const [open, setOpen] = useState(false);
  const [neverShowAgain, setNeverShowAgain] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    try {
      const hidden = localStorage.getItem(STORAGE_KEY) === "1";
      setNeverShowAgain(hidden);
      if (!hidden) setOpen(true);
    } catch {
      setOpen(true);
    }
  }, []);

  const closeDialog = () => {
    try {
      if (neverShowAgain) {
        localStorage.setItem(STORAGE_KEY, "1");
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // ignore storage errors
    }
    setOpen(false);
  };

  const reopen = () => setOpen(true);

  if (!mounted) return null;

  return (
    <>
<button type="button" onClick={reopen} className="navLink">
  Help / Readme
</button>

      {open && (
        <div className="modalOverlay" role="dialog" aria-modal="true" aria-labelledby="readme-title">
          <div className="modalCard">
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start" }}>
              <div>
                <h2 id="readme-title" style={{ margin: 0 }}>How to Use Watchdogs</h2>
                <p className="small" style={{ marginTop: 8 }}>
                  Watchdogs generates scouting assignments from The Blue Alliance match schedule.
                </p>
              </div>
              <button type="button" onClick={closeDialog} aria-label="Close instructions">
                ✕
              </button>
            </div>

            <div style={{ marginTop: 14 }}>
              <ol style={{ margin: 0, paddingLeft: 20, display: "grid", gap: 8 }}>
                {instructions.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ol>
            </div>

            <div className="notice" style={{ marginTop: 16 }}>
              <b>Tip:</b> The share link stores the current setup in the URL, so anyone opening it can reproduce the same assignment run.
            </div>

            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginTop: 16,
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={neverShowAgain}
                onChange={(e) => setNeverShowAgain(e.target.checked)}
                style={{ width: 18, height: 18 }}
              />
              <span>Never show this again</span>
            </label>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}>
              <button type="button" className="btnPrimary" onClick={closeDialog}>
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}