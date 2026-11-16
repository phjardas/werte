import type { ReactNode } from "react";
import type { WertInfo } from "../types";
import { ValueChip } from "./ValueChip";

interface SelectionStepProps {
  /** The progress bar, shown below the heading. */
  fortschritt: ReactNode;
  seite: WertInfo[];
  page: number;
  selected: string[];
  /** False on the last page while too few values are selected and there is nothing to suggest. */
  canContinue: boolean;
  onToggle: (value: string) => void;
  onBack: () => void;
  onNext: () => void;
}

export function SelectionStep({
  seite,
  page,
  selected,
  canContinue,
  onToggle,
  onBack,
  onNext,
  fortschritt,
}: SelectionStepProps) {
  return (
    <div className="screen active">
      <header className="header">
        <h1>Entdecke deine Werte</h1>
        <p>
          Wähle die Werte aus, die dich ansprechen. Denk nicht lange nach,
          entscheide einfach aus dem Bauch heraus. Es gibt keine Obergrenze. Bei
          einem unbekannten Begriff hilft dir das kleine i.
        </p>
      </header>
      {fortschritt}
      <div className="values-grid">
        {seite.map((w) => (
          <ValueChip
            key={w.name}
            value={w.name}
            beschreibung={w.kurzbeschreibung}
            selected={selected.includes(w.name)}
            onClick={() => onToggle(w.name)}
          />
        ))}
      </div>
      <div className="bottom-bar">
        {!canContinue && (
          <span className="counter">Wähle mindestens 5 Werte aus.</span>
        )}
        <div className="bottom-bar-buttons">
          {page > 0 && (
            <button className="btn btn-secondary" onClick={onBack}>
              Zurück
            </button>
          )}
          <button
            className="btn btn-primary"
            disabled={!canContinue}
            onClick={onNext}
          >
            Weiter
          </button>
        </div>
      </div>
    </div>
  );
}
