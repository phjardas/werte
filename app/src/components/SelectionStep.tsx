import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchWerte } from "../api";
import type { KontextId } from "../kontexte";
import { HeroLogo } from "./Logo";
import { shuffle } from "../utils";
import { ValueChip } from "./ValueChip";

interface SelectionStepProps {
  kontext: KontextId;
  onNext: (selected: string[]) => void;
}

export function SelectionStep({ kontext, onNext }: SelectionStepProps) {
  const [allValues, setAllValues] = useState<string[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const shuffledValues = useMemo(() => shuffle(allValues), [allValues]);

  useEffect(() => {
    fetchWerte(kontext)
      .then(setAllValues)
      .catch(() =>
        setError(
          "Werte konnten nicht geladen werden. Bitte versuche es später erneut.",
        ),
      );
  }, [kontext]);

  const toggle = useCallback((value: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(value)) {
        next.delete(value);
      } else {
        next.add(value);
      }
      return next;
    });
  }, []);

  const handleNext = useCallback(() => {
    onNext([...selected]);
  }, [onNext, selected]);

  if (error) {
    return (
      <div className="screen active">
        <div className="header">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="screen active">
        <header className="header">
          <HeroLogo />
          <h1>Entdecke deine Werte</h1>
          <p>
            Wähle die Werte aus, die dich ansprechen. Denk nicht lange nach,
            entscheide einfach aus dem Bauch heraus. Es gibt keine Obergrenze.
          </p>
        </header>
        <div className="values-grid">
          {shuffledValues.length === 0 ? (
            <p>Werte werden geladen…</p>
          ) : (
            shuffledValues.map((value) => (
              <ValueChip
                key={value}
                value={value}
                selected={selected.has(value)}
                onClick={() => toggle(value)}
              />
            ))
          )}
        </div>
        <div className="bottom-bar">
          <span className="counter">{selected.size} ausgewählt (min. 5)</span>
          <button
            className="btn btn-primary"
            disabled={selected.size < 5}
            onClick={handleNext}
          >
            Weiter
          </button>
        </div>
      </div>
    </>
  );
}
