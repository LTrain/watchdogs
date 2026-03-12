import QrCodeImg from "../components/QrCodeImg";

export default function AboutPage() {
  const aboutPath = "/about";

  return (
    <main className="container">
      <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <img
          src="/k9-logo.png"
          alt="K9.0 Robotics logo"
          style={{ width: 88, height: 88, objectFit: "contain" }}
        />
        <div>
          <h1 className="h1" style={{ marginBottom: 4 }}>About Watchdogs</h1>
          <p className="sub" style={{ marginBottom: 0 }}>
            A scouting assignment system built for FRC teams that need balanced human-scout coverage,
            per-scout mobile pages, QR sharing, and stateless links.
          </p>
        </div>
      </div>

      <div className="aboutGrid" style={{ marginTop: 20 }}>
        <section className="card cardPad">
          <h2 style={{ marginTop: 0 }}>How to Use Watchdogs</h2>
          <div className="stepFlow">
            <div className="stepCard">
              <div className="stepBadge">1</div>
              <div>
                <div style={{ fontWeight: 800 }}>Enter an event code</div>
                <div className="small">Example: <span className="mono">2025mifer</span>. Watchdogs downloads the qualification schedule from The Blue Alliance.</div>
              </div>
            </div>
            <div className="stepCard">
              <div className="stepBadge">2</div>
              <div>
                <div style={{ fontWeight: 800 }}>Set scout and observation constraints</div>
                <div className="small">Choose number of scouts, observations per team, spread, max consecutive matches, excluded teams, and schedule spread bounds.</div>
              </div>
            </div>
            <div className="stepCard">
              <div className="stepBadge">3</div>
              <div>
                <div style={{ fontWeight: 800 }}>Name your scouts</div>
                <div className="small">Scout names are saved in the URL so the whole setup stays shareable and stateless.</div>
              </div>
            </div>
            <div className="stepCard">
              <div className="stepBadge">4</div>
              <div>
                <div style={{ fontWeight: 800 }}>Compute assignments</div>
                <div className="small">Watchdogs spreads coverage across the event and builds per-scout assignment pages with QR codes.</div>
              </div>
            </div>
          </div>
        </section>

        <section className="card cardPad">
          <h2 style={{ marginTop: 0 }}>About Page QR</h2>
          <p className="small" style={{ marginTop: 0 }}>
            Use this QR code on a pit display or handout so students and mentors can quickly open the About page.
          </p>
          <div style={{ display: "grid", placeItems: "center", gap: 12 }}>
            <QrCodeImg value={aboutPath} size={180} />
            <div className="mono small">{aboutPath}</div>
          </div>
        </section>
      </div>

      <section className="card cardPad" style={{ marginTop: 20 }}>
        <h2 style={{ marginTop: 0 }}>How the Assignment Algorithm Works</h2>
        <p className="small" style={{ marginTop: 0 }}>
          Watchdogs balances randomness with spread so teams are not all scouted early and scouts do not get overloaded.
        </p>

        <div className="stepFlow">
          <div className="stepCard">
            <div className="stepBadge">A</div>
            <div>
              <div style={{ fontWeight: 800 }}>Download and normalize the match schedule</div>
              <div className="small">Qualification matches are loaded from TBA, team appearances are indexed, and feasibility checks are run.</div>
            </div>
          </div>
          <div className="stepCard">
            <div className="stepBadge">B</div>
            <div>
              <div style={{ fontWeight: 800 }}>Choose spread-out observation targets</div>
              <div className="small">For each team, Watchdogs picks desired observation points across the full schedule using bucketed match positions and seed-based jitter.</div>
            </div>
          </div>
          <div className="stepCard">
            <div className="stepBadge">C</div>
            <div>
              <div style={{ fontWeight: 800 }}>Apply bounds and pacing</div>
              <div className="small">Early/late/span bounds and per-match pacing prevent all assignments from getting front-loaded.</div>
            </div>
          </div>
          <div className="stepCard">
            <div className="stepBadge">D</div>
            <div>
              <div style={{ fontWeight: 800 }}>Assign scouts match by match</div>
              <div className="small">The solver respects one-team-per-scout, spread gaps, and max consecutive limits while favoring urgent and desired observations.</div>
            </div>
          </div>
          <div className="stepCard">
            <div className="stepBadge">E</div>
            <div>
              <div style={{ fontWeight: 800 }}>Generate outputs for the team</div>
              <div className="small">You get assignments by match, coverage by team, per-scout schedules, mobile links, QR codes, and CSV export.</div>
            </div>
          </div>
        </div>
      </section>

      <section className="card cardPad" style={{ marginTop: 20 }}>
        <h2 style={{ marginTop: 0 }}>What Makes Watchdogs Useful</h2>
        <ul>
          <li>It keeps the whole setup stateless and shareable through URL parameters.</li>
          <li>It gives every scout a clean personal schedule page for phone use.</li>
          <li>It reduces front-loaded scouting and improves late-event data quality.</li>
          <li>It was built to support real FRC event workflows.</li>
        </ul>
      </section>
    </main>
  );
}
