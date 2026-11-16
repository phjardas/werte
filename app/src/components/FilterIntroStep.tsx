import type { ReactNode } from "react";
import { kontextInfo, type KontextId } from "../kontexte";

interface FilterIntroStepProps {
  /** The progress bar, shown below the heading. */
  fortschritt: ReactNode;
  kontext: KontextId;
  valueCount: number;
  onBack: () => void;
  onNext: () => void;
}

export function FilterIntroStep({
  kontext,
  valueCount,
  onBack,
  onNext,
  fortschritt,
}: FilterIntroStepProps) {
  return (
    <div className="screen active step-intro">
      <header className="header">
        <h1>Jetzt wird es eng</h1>
      </header>
      {fortschritt}
      <div className="intro-content">
        <p>
          Du hast <strong>{valueCount} Werte</strong> gesammelt. Bisher ging es
          darum, nichts zu übersehen. Ab jetzt geht es ums Verzichten.
        </p>
        <p>
          Im nächsten Schritt behältst du <strong>höchstens 10 Werte</strong>,
          nämlich die, die dir {kontextInfo(kontext).imLebensbereich} am
          wichtigsten sind. Alle anderen fallen weg. Das darf ruhig
          schwerfallen.
        </p>
      </div>
      <div className="intro-footer bottom-bar-buttons">
        <button className="btn btn-secondary" onClick={onBack}>
          Zurück
        </button>
        <button className="btn btn-primary" onClick={onNext}>
          Auf 10 reduzieren
        </button>
      </div>
    </div>
  );
}
