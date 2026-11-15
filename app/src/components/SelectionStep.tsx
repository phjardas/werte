import type { WertInfo } from "../types";
import { HeroLogo } from "./Logo";
import { ValueChip } from "./ValueChip";

interface SelectionStepProps {
  seite: WertInfo[];
  page: number;
  pageCount: number;
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
  pageCount,
  selected,
  canContinue,
  onToggle,
  onBack,
  onNext,
}: SelectionStepProps) {
  const percent = ((page + 1) / pageCount) * 100;

  return (
    <div className="screen active">
      <header className="header">
        <HeroLogo />
        <h1>Entdecke deine Werte</h1>
        <p>
          Wähle die Werte aus, die dich ansprechen. Denk nicht lange nach, entscheide einfach aus dem Bauch heraus. Es
          gibt keine Obergrenze. Bei einem unbekannten Begriff hilft dir das kleine i.
        </p>
      </header>
      <div className="progress-bar-container selection-progress">
        <div className="progress-info">
          <span>
            Seite {page + 1} von {pageCount}
          </span>
          <span>{selected.length} ausgewählt</span>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${percent}%` }} />
        </div>
      </div>
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
        {!canContinue && <span className="counter">Wähle mindestens 5 Werte aus.</span>}
        <div className="bottom-bar-buttons">
          {page > 0 && (
            <button className="btn btn-secondary" onClick={onBack}>
              Zurück
            </button>
          )}
          <button className="btn btn-primary" disabled={!canContinue} onClick={onNext}>
            Weiter
          </button>
        </div>
      </div>
    </div>
  );
}
