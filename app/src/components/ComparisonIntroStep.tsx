import type { ReactNode } from "react";
import { kontextInfo, type KontextId } from "../kontexte";

interface ComparisonIntroStepProps {
  /** The progress bar, shown below the heading. */
  fortschritt: ReactNode;
  kontext: KontextId;
  valueCount: number;
  onNext: () => void;
}

export function ComparisonIntroStep({
  kontext,
  valueCount,
  onNext,
  fortschritt,
}: ComparisonIntroStepProps) {
  return (
    <div className="screen active step-intro">
      <header className="header">
        <h1>Jetzt wird's spannend!</h1>
      </header>
      {fortschritt}
      <div className="intro-content">
        <p>
          Du hast <strong>{valueCount} Werte</strong> ausgewählt. Jetzt
          vergleichen wir sie miteinander, um herauszufinden, welche dir{" "}
          {kontextInfo(kontext).imLebensbereich} am wichtigsten sind.
        </p>
        <p>
          Du bekommst jeweils zwei Werte in einer konkreten Alltagssituation
          präsentiert. Entscheide dich einfach für die Reaktion, die sich für
          dich stimmiger anfühlt. Es gibt kein Richtig oder Falsch.
        </p>
        <p>
          Am Ende erhältst du dein persönliches Ranking und deine individuelle
          Analyse.
        </p>
      </div>
      <div className="intro-footer">
        <button className="btn btn-primary" onClick={onNext}>
          Vergleiche starten
        </button>
      </div>
    </div>
  );
}
