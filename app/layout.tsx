import "./globals.css";
import ReadmeDialog from "./components/ReadmeDialog";

export const metadata = {
  title: "Watchdogs",
  description: "Watchdogs scouting assignment generator for FRC using TBA schedules",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
<header className="header">
          <div className="headerInner">
            <a className="brand" href="/assign" aria-label="Go to Watchdogs">
              <img src="/k9-logo.png" alt="K9.0 logo" style={{ width: 40, height: 40, objectFit: "contain" }} />
              <div className="brandText">
                <b>Watchdogs</b>
                <span>Stateless • shareable • per-scout QR</span>
              </div>
            </a>

            <nav className="nav">
<a href="/assign" className="navLink">Assignments</a>
<a href="/about" className="navLink">About</a>
              <ReadmeDialog />
            </nav></div>
        </header>

        {children}

        <footer className="footer">
          <div className="footerInner">
            <span>Built by K9.0 Robotics FRC 8280 - Detroit</span>
            <span className="mono">Data: The Blue Alliance (TBA) API</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
