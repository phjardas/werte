import type { ReactNode } from "react";
import type { WertInfo } from "../types";
import { ValueChip } from "./ValueChip";

interface SuggestionStepProps {
  /** The progress bar, shown below the heading. */
  fortschritt: ReactNode;
  vorschlaege: WertInfo[];
  selected: string[];
  onToggle: (value: string) => void;
  onBack: () => void;
  onNext: () => void;
}

export function SuggestionStep({
  vorschlaege,
  selected,
  onToggle,
  onBack,
  onNext,
  fortschritt,
}: SuggestionStepProps) {
  return (
    <div className="screen active">
      <header className="header">
        <h1>Noch etwas vergessen?</h1>
        <p>
          Diese Werte passen gut zu deiner bisherigen Auswahl. Vielleicht ist
          beim ersten Durchgehen einer untergegangen, der dir auch wichtig ist.
        </p>
      </header>
      {fortschritt}
      <div className="values-grid">
        {vorschlaege.map((w) => (
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
        <span className="counter">{selected.length} ausgewählt (min. 5)</span>
        <div className="bottom-bar-buttons">
          <button className="btn btn-secondary" onClick={onBack}>
            Zurück
          </button>
          <button
            className="btn btn-primary"
            disabled={selected.length < 5}
            onClick={onNext}
          >
            Weiter
          </button>
        </div>
      </div>
    </div>
  );
}
