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
            Watchdogs is a scouting assignment system built for FRC teams that need balanced human-scout coverage, 
            per-scout mobile pages, QR sharing, and stateless links. It was developed to help smaller teams that don’t have the resources to fully scout an event. 
            Watchdogs pairs targeted human observations with statistical tools like Statbotics, allowing teams to combine objective performance data with real-time qualitative insights from scouts.
          </p>
        </div>
      </div>

      
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

      <h2 style={{ marginTop: "48px" }}>FAQ</h2>

<div className="faq">

  <details>
    <summary>Why was Watchdogs created?</summary>
    <p>
      Watchdogs was designed for smaller FRC teams that cannot fully scout an
      event. Instead of attempting to watch every robot, Watchdogs helps teams
      assign scouts to key matches so they can combine human observations with
      statistical tools like Statbotics.
    </p>
  </details>

  <details>
    <summary>Does Watchdogs replace statistical scouting tools?</summary>
    <p>
      No. Watchdogs works best when paired with tools like Scouting Pass or Scout Radioz. Those
      tools provide powerful statistical analysis, while Watchdogs helps teams
      add qualitative observations from human scouts during matches.
    </p>
  </details>

  <details>
    <summary>Do scouts need to install an app?</summary>
    <p>
      No. Each scout gets a mobile web page that can be opened directly in a
      browser. QR codes make it easy to distribute these pages to the team.
    </p>
  </details>

  <details>
    <summary>What does “stateless” mean?</summary>
    <p>
      Watchdogs stores the assignment configuration in the URL. This means the
      system requires no server-side database and the same assignments can be
      shared simply by sending the link.
    </p>
  </details>

  <details>
    <summary>Where AI tools used to create Watchdogs?</summary>
    <p>
      Yes. As a small team with limited resources, we needed to develop tools that would help us work more efficiently during the upcoming FRC season. Watchdogs was an opportunity for us to explore whether modern AI tools could be used productively for rapid development to fill a real need. We used tools such as ChatGPT and Microsoft Copilot within Visual Studio Code to assist with coding, iteration, and problem solving. Like any engineering tool, these systems helped accelerate development, but the design, testing, and practical application of the system were driven by our team’s experience with robotics competitions and scouting.
    </p>
  </details>
  
    <details>
    <summary>Who is team 8280?</summary>
    <p>
    Team 8280, K9.0 Robotics, is a Detroit-based FIRST Robotics Competition team at The School at Marygrove that was relaunched just three years ago and has quickly become a driving force in the local robotics community, working to change the culture of STEM in Detroit while helping raise the competitive performance and collaboration of FIRST teams across the city.</p>
  </details>

</div>
    </main>
  );
}
