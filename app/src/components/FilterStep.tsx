import { useCallback, useMemo, useState } from "react";
import { MAX_FINALE_WERTE } from "../auswahl";
import type { WertInfo } from "../types";
import { shuffle } from "../utils";
import { ValueChip } from "./ValueChip";

interface FilterStepProps {
  values: string[];
  werte: WertInfo[];
  onNext: (finalSelected: string[]) => void;
  onBack: () => void;
}

export function FilterStep({ values, werte, onNext, onBack }: FilterStepProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const shuffledValues = useMemo(() => shuffle(values), [values]);
  const beschreibung = useCallback((name: string) => werte.find((w) => w.name === name)?.kurzbeschreibung, [werte]);
  const voll = selected.length >= MAX_FINALE_WERTE;

  const toggle = useCallback((value: string) => {
    setSelected((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : prev.length < MAX_FINALE_WERTE ? [...prev, value] : prev,
    );
  }, []);

  return (
    <div className="screen active step-filter">
      <header className="header">
        <h1>Deine 10 wichtigsten Werte</h1>
        <p>
          Du hast {values.length} Werte gesammelt. Nimm jetzt nur die mit, auf die du am wenigsten verzichten könntest.
        </p>
      </header>
      <ol className="filter-slots" aria-label="Deine Auswahl">
        {Array.from({ length: MAX_FINALE_WERTE }, (_, i) => {
          const wert = selected[i];
          return (
            <li key={i} className={wert ? "filter-slot filled" : "filter-slot"}>
              {wert ? (
                <button type="button" onClick={() => toggle(wert)} aria-label={`${wert} entfernen`}>
                  {wert} <span aria-hidden="true">×</span>
                </button>
              ) : (
                <span className="filter-slot-number">{i + 1}</span>
              )}
            </li>
          );
        })}
      </ol>
      <div className="values-grid">
        {shuffledValues
          .filter((value) => !selected.includes(value))
          .map((value) => (
            <ValueChip
              key={value}
              value={value}
              beschreibung={beschreibung(value)}
              selected={false}
              disabled={voll}
              onClick={() => toggle(value)}
            />
          ))}
      </div>
      <div className="bottom-bar">
        <span className="counter">
          {selected.length} von {MAX_FINALE_WERTE} ausgewählt (min. 5)
        </span>
        <div className="bottom-bar-buttons">
          <button className="btn btn-secondary" onClick={onBack}>
            Zurück
          </button>
          <button className="btn btn-primary" disabled={selected.length < 5} onClick={() => onNext(selected)}>
            Weiter zum Vergleich
          </button>
        </div>
      </div>
    </div>
  );
}
