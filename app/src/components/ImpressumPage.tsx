import { Link } from "@tanstack/react-router";
import { HeroLogo } from "./Logo";

export function ImpressumPage() {
  return (
    <div className="screen active step-intro">
      <header className="header">
        <HeroLogo />
        <h1>Impressum</h1>
      </header>
      <div className="intro-content">
        <p>Werte Kompass wird kostenlos bereitgestellt von:</p>
        <p>
          Philipp Jardas
          <br />
          Berliner Str. 27
          <br />
          63571 Gelnhausen
        </p>
        <p>
          Kontakt: <a href="mailto:philipp@jardas.de">philipp@jardas.de</a>
        </p>
        <p>
          Quellen frei zugänglich:{" "}
          <a href="https://github.com/phjardas/werte">
            github.com/phjardas/werte
          </a>
        </p>
      </div>
      <div className="intro-footer">
        <Link to="/" className="btn btn-primary">
          Zur Startseite
        </Link>
      </div>
    </div>
  );
}
