import { HeroLogo } from "./Logo";

interface IntroStepProps {
  firstName?: string | null;
  onNext: () => void;
}

export function IntroStep({ firstName, onNext }: IntroStepProps) {
  return (
    <div className="screen active step-intro">
      <header className="header">
        <HeroLogo />
        {firstName && <p className="greeting">Hallo, {firstName}!</p>}
        <h1>Entdecke deine Werte</h1>
      </header>
      <div className="intro-content">
        <p>
          Dieser Test hilft dir, deine persönlichen Werte zu entdecken. In
          wenigen Minuten findest du heraus, was dir in deinem Berufsleben
          wirklich wichtig ist.
        </p>
        <p>So funktioniert's:</p>
        <ol>
          <li>
            <strong>Werte auswählen:</strong> Du siehst eine Liste von Werten
            und wählst alle aus, die dich ansprechen.
          </li>
          <li>
            <strong>Werte vergleichen:</strong> In kurzen Szenarien entscheidest
            du dich jeweils zwischen zwei Werten. So entsteht ein klares
            Ranking.
          </li>
          <li>
            <strong>Ergebnis:</strong> Am Ende erhältst du deine persönlichen
            Top-5-Werte mit einer individuellen Auswertung.
          </li>
        </ol>
      </div>
      <div className="intro-footer">
        <button className="btn btn-primary" onClick={onNext}>
          Los geht's!
        </button>
      </div>
    </div>
  );
}
