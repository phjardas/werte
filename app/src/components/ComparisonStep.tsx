import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { fetchSzenario, voteSzenario } from "../api";
import { funken } from "../funken";
import type { UseTournamentResult } from "../hooks/useTournament";
import type { KontextId } from "../kontexte";
import type { Contestant, Szenario } from "../types";

const WARTEZEIT_MS = 500;

interface ComparisonStepProps {
  /** The progress bar, shown below the heading. */
  fortschritt: ReactNode;
  kontext: KontextId;
  tournament: UseTournamentResult;
}

export function ComparisonStep({
  kontext,
  tournament,
  fortschritt,
}: ComparisonStepProps) {
  const { currentMatch, vote } = tournament;
  const [szenario, setSzenario] = useState<Szenario | null>(null);
  const [loading, setLoading] = useState(false);
  const [voted, setVoted] = useState<"up" | "down" | null>(null);
  // The card just chosen. The vote waits a moment so the sparks can play before the next scenario replaces the cards.
  const [gewaehlt, setGewaehlt] = useState<0 | 1 | null>(null);

  useEffect(() => {
    if (!currentMatch) return;

    const [a, b] = currentMatch;
    setLoading(true);
    setSzenario(null);
    setVoted(null);

    fetchSzenario(a.name, b.name, kontext).then((s) => {
      setSzenario(s);
      setLoading(false);
    });
  }, [currentMatch, kontext]);

  if (!currentMatch) return null;

  const [a, b] = currentMatch;

  const answerA = getAnswer(szenario, a);
  const answerB = getAnswer(szenario, b);

  function waehle(index: 0 | 1, x: number, y: number) {
    if (gewaehlt !== null) return;
    setGewaehlt(index);
    funken(x, y);
    setTimeout(() => {
      vote(index);
      setGewaehlt(null);
    }, WARTEZEIT_MS);
  }

  function handleVoteSzenario(v: "up" | "down") {
    if (voted || !szenario) return;
    setVoted(v);
    voteSzenario(a.name, b.name, v, szenario.version);
  }

  return (
    <div className="screen active step-comparison">
      <h1>Wertevergleich</h1>
      {fortschritt}
      <div className="comparison-prompt">
        {loading ? (
          <>
            <span className="spinner" />
            Szenario wird erstellt…
          </>
        ) : szenario ? (
          szenario.szenario
        ) : (
          "Welcher Wert ist dir wichtiger?"
        )}
      </div>
      {szenario && !loading && (
        <div className="szenario-vote">
          <span className="szenario-vote-label">
            {voted
              ? "Danke für dein Feedback!"
              : "War dieses Szenario hilfreich?"}
          </span>
          <div className="szenario-vote-buttons">
            <button
              className={`szenario-vote-btn${voted === "up" ? " active" : ""}`}
              onClick={() => handleVoteSzenario("up")}
              disabled={voted !== null}
              aria-label="Hilfreich"
            >
              👍
            </button>
            <button
              className={`szenario-vote-btn${voted === "down" ? " active" : ""}`}
              onClick={() => handleVoteSzenario("down")}
              disabled={voted !== null}
              aria-label="Nicht hilfreich"
            >
              👎
            </button>
          </div>
        </div>
      )}
      <div
        className={`comparison-cards${loading ? " comparison-loading" : ""}`}
      >
        <div
          className={`comparison-card${gewaehlt === 0 ? " gewaehlt" : ""}`}
          onClick={(e) => waehle(0, e.clientX, e.clientY)}
        >
          <div>
            {answerA ? (
              <span className="comparison-card-answer">
                {answerA} <small>{a.name}</small>
              </span>
            ) : (
              a.name
            )}
          </div>
        </div>
        <div className="vs">oder</div>
        <div
          className={`comparison-card${gewaehlt === 1 ? " gewaehlt" : ""}`}
          onClick={(e) => waehle(1, e.clientX, e.clientY)}
        >
          <div>
            {answerB ? (
              <span className="comparison-card-answer">
                {answerB} <small>{b.name}</small>
              </span>
            ) : (
              b.name
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function getAnswer(
  szenario: Szenario | null,
  contestant: Contestant,
): string | null {
  if (!szenario) return null;
  const index = szenario.werte.indexOf(contestant.name);
  return index >= 0 ? szenario.antworten[index] : null;
}
