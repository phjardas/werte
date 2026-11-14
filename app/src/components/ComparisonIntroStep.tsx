import { HeroLogo } from "./Logo";

interface ComparisonIntroStepProps {
  firstName?: string | null;
  valueCount: number;
  onNext: () => void;
}

export function ComparisonIntroStep({
  firstName,
  valueCount,
  onNext,
}: ComparisonIntroStepProps) {
  return (
    <div className="screen active step-intro">
      <header className="header">
        <HeroLogo />
        <h1>
          Jetzt wird's spannend{firstName ? `, ${firstName}` : ""}!
        </h1>
      </header>
      <div className="intro-content">
        <p>
          Du hast <strong>{valueCount} Werte</strong> ausgewählt. Jetzt
          vergleichen wir sie miteinander, um herauszufinden, welche dir in
          deiner Elternschaft am wichtigsten sind.
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
