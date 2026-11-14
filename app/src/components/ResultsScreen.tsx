import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useZusammenfassung } from "../hooks/useZusammenfassung";
import type { Contestant } from "../types";
import { HeroLogo } from "./Logo";

function highlightValues(text: string, values: string[]): ReactNode {
  if (values.length === 0) return text;
  const escaped = values.map((v) => v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  // Whole words only, case-sensitive. \b is ASCII-only, so umlauts need Unicode lookarounds.
  const pattern = new RegExp(
    `(?<![\\p{L}\\p{N}])(${escaped.join("|")})(?![\\p{L}\\p{N}])`,
    "gu",
  );
  // split() puts the captured matches at the odd indices
  return text
    .split(pattern)
    .map((part, i) =>
      i % 2 === 1 ? (
        <mark key={i} className="value-highlight">{part}</mark>
      ) : (
        part
      )
    );
}

interface ResultsScreenProps {
  testId?: string;
  firstName?: string | null;
  results: Contestant[];
}

export function ResultsScreen({
  testId,
  firstName,
  results,
}: ResultsScreenProps) {
  const top5 = results.slice(0, 5);
  const { zusammenfassung, timedOut } = useZusammenfassung(testId ?? null);

  return (
    <>
      <div className="results-header">
        <HeroLogo />
        <h1>Deine Top 5 Werte</h1>
        <p>
          {firstName
            ? `Das sind deine persönlichen Werte, ${firstName}.`
            : "Das sind die Werte, die dir am wichtigsten sind."}
        </p>
      </div>
      <div className="screen active step-results">
        <div className="results-container">
          <div className="results-body">
            <div className="results-values">
              {top5.map((contestant, i) => (
                <div
                  key={contestant.name}
                  className={`result-item rank-${i + 1}`}
                >
                  <div className="result-rank">
                    {["🥇", "🥈", "🥉"][i] ?? i + 1}
                  </div>
                  <div className="result-value">{contestant.name}</div>
                </div>
              ))}
            </div>
            <div className="results-summary">
              <div className="chat-message">
                <div className="chat-avatar">
                  <img src="/logo.svg" alt="" />
                </div>
                <div className="chat-bubble-wrap">
                  <span className="chat-sender">
                    {!zusammenfassung && !timedOut
                      ? "Werte Kompass schreibt…"
                      : "Werte Kompass"}
                  </span>
                  {zusammenfassung ? (
                    <div className="chat-bubble summary-text">
                      {firstName ? <p>Hallo {firstName},</p> : null}
                      {zusammenfassung.split("\n\n").map((paragraph, i) => (
                        <p key={i}>{highlightValues(paragraph, top5.map((c) => c.name))}</p>
                      ))}
                    </div>
                  ) : timedOut ? (
                    <div className="chat-bubble summary-text">
                      {firstName ? <p>Hallo {firstName},</p> : <p>Hallo!</p>}
                      <p>
                        Ich brauche noch ein paar Minuten, um deine persönliche
                        Zusammenfassung zu schreiben. 🙈
                      </p>
                      <p>
                        Schau später einfach noch einmal unter diesem Link vorbei.
                      </p>
                    </div>
                  ) : (
                    <div className="typing-bubble">
                      <span className="typing-dot" />
                      <span className="typing-dot" />
                      <span className="typing-dot" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="intro-footer">
            <Link to="/" className="btn btn-primary">
              Neuen Test starten
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
