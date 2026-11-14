import { useCallback, useMemo, useState } from "react";
import { HeroLogo } from "./Logo";
import { shuffle } from "../utils";
import { ValueChip } from "./ValueChip";

interface FilterStepProps {
  values: string[];
  onNext: (finalSelected: string[]) => void;
  onBack: () => void;
}

export function FilterStep({ values, onNext, onBack }: FilterStepProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const shuffledValues = useMemo(() => shuffle(values), [values]);

  const toggle = useCallback((value: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(value)) {
        next.delete(value);
      } else if (next.size < 10) {
        next.add(value);
      }
      return next;
    });
  }, []);

  const handleNext = useCallback(() => {
    onNext([...selected]);
  }, [onNext, selected]);

  return (
    <div className="screen active">
      <header className="header">
        <HeroLogo />
        <h1>Top 10 auswählen</h1>
        <p>
          Wähle aus deinen Favoriten nun die für dich wichtisten 10 Werte aus.
        </p>
      </header>
      <div className="values-grid">
        {shuffledValues.map((value) => (
          <ValueChip
            key={value}
            value={value}
            selected={selected.has(value)}
            disabled={selected.size >= 10 && !selected.has(value)}
            onClick={() => toggle(value)}
          />
        ))}
      </div>
      <div className="bottom-bar">
        <button className="btn btn-secondary" onClick={onBack}>
          Zurück
        </button>
        <span className="counter">
          {selected.size} von 10 ausgewählt (min. 5)
        </span>
        <button
          className="btn btn-primary"
          disabled={selected.size < 5}
          onClick={handleNext}
        >
          Weiter zum Vergleich
        </button>
      </div>
    </div>
  );
}
