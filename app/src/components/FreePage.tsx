import { useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { createTest } from "../api";
import { ELTERN_KOMPASS_URL, KONTEXTE, type KontextId } from "../kontexte";
import { HeroLogo } from "./Logo";

export function FreePage() {
  const navigate = useNavigate();
  const [wirdAngelegt, setWirdAngelegt] = useState(false);
  const laeuft = useRef(false);
  const [fehler, setFehler] = useState(false);

  function starten(kontext: KontextId) {
    // A ref, because a fast double click arrives before the re-render that hides the cards.
    if (laeuft.current) return;
    laeuft.current = true;
    setWirdAngelegt(true);
    setFehler(false);
    createTest(kontext).then(
      (testId) => navigate({ to: "/tests/$testId", params: { testId }, replace: true }),
      () => {
        laeuft.current = false;
        setWirdAngelegt(false);
        setFehler(true);
      },
    );
  }

  if (wirdAngelegt) {
    return (
      <div className="screen active step-pending">
        <div className="pending-container">
          <HeroLogo />
          <span className="spinner spinner-lg" />
          <p className="pending-message">Dein persönlicher Test wird vorbereitet…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="screen active step-intro">
      <header className="header">
        <HeroLogo />
        <h1>Worum soll es gehen?</h1>
        <p>Die Szenarien und deine Auswertung passen sich an.</p>
      </header>
      <div className="kontext-auswahl">
        {fehler && (
          <p className="kontext-fehler" role="alert">
            Der Test konnte nicht angelegt werden. Bitte versuch es noch einmal.
          </p>
        )}
        {KONTEXTE.map((k) => (
          <button key={k.id} type="button" className="kontext-karte" onClick={() => starten(k.id)}>
            <span className="kontext-icon" aria-hidden="true">
              {k.icon}
            </span>
            <span>
              <strong>{k.titel}</strong>
              <span className="kontext-beschreibung">{k.beschreibung}</span>
            </span>
          </button>
        ))}
        <a className="kontext-karte kontext-extern" href={ELTERN_KOMPASS_URL} target="_blank" rel="noopener">
          <span className="kontext-icon" aria-hidden="true">
            👪
          </span>
          <span>
            <strong>Als Mutter oder Vater ↗</strong>
            <span className="kontext-beschreibung">Dafür gibt es den eigenen Eltern Werte Kompass.</span>
          </span>
        </a>
      </div>
    </div>
  );
}
