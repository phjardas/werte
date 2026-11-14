import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { fetchStatistik } from "../api";
import type { Statistik } from "../types";
import { HeroLogo } from "./Logo";

const RANGLISTE_LAENGE = 10;

export function StatistikPage() {
  const [statistik, setStatistik] = useState<Statistik>();
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchStatistik().then(setStatistik, () => setError(true));
  }, []);

  return (
    <div className="screen active step-intro">
      <header className="header">
        <HeroLogo />
        <h1>Statistik</h1>
      </header>
      <div className="intro-content">
        {error ? (
          <p>Die Statistik konnte nicht geladen werden.</p>
        ) : !statistik ? (
          <div className="spinner" />
        ) : (
          <>
            <p className="statistik-tests">
              <strong>{statistik.tests.toLocaleString("de-DE")}</strong>{" "}
              {statistik.tests === 1 ? "abgeschlossener Test" : "abgeschlossene Tests"}
            </p>
            {statistik.rangliste.length > 0 && (
              <>
                <h2>Die wichtigsten Werte</h2>
                <ol className="statistik-rangliste">
                  {statistik.rangliste.slice(0, RANGLISTE_LAENGE).map((e) => (
                    <li key={e.name}>
                      <span>{e.name}</span>
                      <span className="statistik-punkte">
                        {e.punkte.toLocaleString("de-DE")} Punkte
                      </span>
                    </li>
                  ))}
                </ol>
                <p className="statistik-hinweis">
                  Punkte je Platz im Ergebnis:{" "}
                  {statistik.punkteskala
                    .map((p, i) => `${i + 1}. Platz ${p}`)
                    .join(", ")}
                  .
                </p>
              </>
            )}
          </>
        )}
      </div>
      <div className="intro-footer">
        <Link to="/" className="btn btn-primary">
          Zur Startseite
        </Link>
      </div>
    </div>
  );
}
