import type { ReactNode } from "react";
import { useState } from "react";
import type { WertInfo } from "../types";
import { ValueChip } from "./ValueChip";

interface SynonymStepProps {
  /** The progress bar, shown below the heading. */
  fortschritt: ReactNode;
  /** Groups of selected values that mean almost the same. */
  gruppen: string[][];
  werte: WertInfo[];
  onBack: () => void;
  /** Called with the values to drop, i.e. every value of a group except the one picked. */
  onNext: (weglassen: string[]) => void;
}

export function SynonymStep({
  gruppen,
  werte,
  onBack,
  onNext,
  fortschritt,
}: SynonymStepProps) {
  const [gewaehlt, setGewaehlt] = useState<(string | undefined)[]>([]);
  const beschreibung = (name: string) =>
    werte.find((w) => w.name === name)?.kurzbeschreibung;
  const fertig = gruppen.every((_, i) => gewaehlt[i]);

  return (
    <div className="screen active">
      <header className="header">
        <h1>Fast dasselbe</h1>
        <p>
          Einige deiner Werte bedeuten beinahe dasselbe. Zwischen ihnen müsstest
          du dich im Vergleich nicht wirklich entscheiden, deshalb fassen wir
          sie zusammen. Wähle jeweils den Begriff, der für dich am besten passt.
          Ab hier geht es nur mit diesem weiter.
        </p>
      </header>
      {fortschritt}
      <div className="synonym-karten">
        {gruppen.map((gruppe, i) => (
          <section key={gruppe.join()} className="synonym-karte">
            <h2>Welcher Begriff passt besser zu dir?</h2>
            <div className="values-grid">
              {gruppe.map((name) => (
                <ValueChip
                  key={name}
                  value={name}
                  beschreibung={beschreibung(name)}
                  selected={gewaehlt[i] === name}
                  onClick={() =>
                    setGewaehlt((prev) => {
                      const next = [...prev];
                      next[i] = name;
                      return next;
                    })
                  }
                />
              ))}
            </div>
          </section>
        ))}
      </div>
      <div className="bottom-bar">
        <span className="counter">
          {gewaehlt.filter(Boolean).length} von {gruppen.length} gewählt
        </span>
        <div className="bottom-bar-buttons">
          <button className="btn btn-secondary" onClick={onBack}>
            Zurück
          </button>
          <button
            className="btn btn-primary"
            disabled={!fertig}
            onClick={() =>
              onNext(
                gruppen.flatMap((g, i) => g.filter((n) => n !== gewaehlt[i])),
              )
            }
          >
            Weiter
          </button>
        </div>
      </div>
    </div>
  );
}
