import { Link } from "@tanstack/react-router";
import { type CSSProperties, useEffect, useState } from "react";
import { fetchStatistik } from "../api";
import type { Statistik } from "../types";
import { HeroLogo } from "./Logo";

const RANGLISTE_LAENGE = 10;
const MEDAILLEN = ["🥇", "🥈", "🥉"];

type Eintrag = Statistik["rangliste"][number];

function platzierungenText(e: Eintrag): string {
  return e.platzierungen
    .map((anzahl, i) => (anzahl ? `${anzahl}× Platz ${i + 1}` : null))
    .filter(Boolean)
    .join(", ");
}

function Balken({ anteil }: { anteil: number }) {
  return (
    <div className="statistik-balken" aria-hidden="true">
      <div
        className="statistik-balken-fill"
        style={{ "--anteil": anteil } as CSSProperties}
      />
    </div>
  );
}

function Zeile({ e, rang, max }: { e: Eintrag; rang: number; max: number }) {
  return (
    <li
      className={`statistik-eintrag rank-${rang}`}
      style={{ "--i": rang } as CSSProperties}
      title={platzierungenText(e)}
    >
      <div className="result-rank">{MEDAILLEN[rang - 1] ?? rang}</div>
      <div className="statistik-eintrag-body">
        <div className="statistik-eintrag-kopf">
          <span className="result-value">{e.name}</span>
          <span className="statistik-punkte">
            {e.punkte.toLocaleString("de-DE")} Pkt.
          </span>
        </div>
        <Balken anteil={e.punkte / max} />
      </div>
    </li>
  );
}

export function StatistikPage() {
  const [statistik, setStatistik] = useState<Statistik>();
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchStatistik().then(setStatistik, () => setError(true));
  }, []);

  const rangliste = statistik?.rangliste.slice(0, RANGLISTE_LAENGE) ?? [];
  const max = rangliste[0]?.punkte ?? 1;

  return (
    <div className="screen active step-results">
      <div className="results-header">
        <HeroLogo />
        <h1>Statistik</h1>
        {statistik && (
          <p className="statistik-tests">
            <strong>{statistik.tests.toLocaleString("de-DE")}</strong>
            {statistik.tests === 1
              ? "abgeschlossener Test"
              : "abgeschlossene Tests"}
          </p>
        )}
      </div>
      <div className="statistik-container">
        {error ? (
          <p className="statistik-hinweis">
            Die Statistik konnte nicht geladen werden.
          </p>
        ) : !statistik ? (
          <div className="spinner" />
        ) : rangliste.length > 0 ? (
          <>
            <h2>Die häufigsten Werte</h2>
            <ol className="statistik-podium">
              {rangliste.slice(0, 3).map((e, i) => (
                <Zeile key={e.name} e={e} rang={i + 1} max={max} />
              ))}
            </ol>
            {rangliste.length > 3 && (
              <ol className="statistik-rest" start={4}>
                {rangliste.slice(3).map((e, i) => (
                  <Zeile key={e.name} e={e} rang={i + 4} max={max} />
                ))}
              </ol>
            )}
            <p className="statistik-hinweis">
              Punkte je Platz im Ergebnis:{" "}
              {statistik.punkteskala
                .map((p, i) => `${i + 1}. Platz ${p}`)
                .join(", ")}
              .
            </p>
          </>
        ) : null}
        <div className="intro-footer">
          <Link to="/" className="btn btn-primary">
            Zur Startseite
          </Link>
        </div>
      </div>
    </div>
  );
}
