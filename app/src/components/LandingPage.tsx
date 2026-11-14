import { Link } from "@tanstack/react-router";
import { HeroLogo } from "./Logo";

export function LandingPage() {
  return (
    <div className="screen active step-intro">
      <header className="header">
        <HeroLogo />
        <h1>Werte Kompass</h1>
      </header>
      <div className="intro-content">
        <p>
          Der Werte Kompass hilft dir, deine persönlichen Werte zu entdecken. In
          wenigen Minuten findest du heraus, was dir in deinem Berufsleben
          wirklich wichtig ist.
        </p>
        <p>So funktioniert's:</p>
        <ol>
          <li>
            <strong>Werte auswählen:</strong> Du siehst eine Liste von Werten
            und wählst alle aus, die dich ansprechen.
          </li>
          <li>
            <strong>Werte vergleichen:</strong> In kurzen Szenarien entscheidest
            du dich jeweils zwischen zwei Werten. So entsteht ein klares
            Ranking.
          </li>
          <li>
            <strong>Ergebnis:</strong> Am Ende erhältst du deine persönlichen
            Top-5-Werte mit einer individuellen Auswertung.
          </li>
        </ol>
        <p>Der Test ist kostenlos und braucht keine Anmeldung.</p>
      </div>
      <div className="intro-footer">
        <Link to="/tests" className="btn btn-primary">
          Los geht's
        </Link>
      </div>
    </div>
  );
}
