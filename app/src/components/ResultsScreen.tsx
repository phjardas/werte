import { Link } from "@tanstack/react-router";
import { useState, type FormEvent, type ReactNode } from "react";
import { sendEmail, type SendEmailResult } from "../api";
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

function EmailForm({
  testId,
  emailGesendet,
}: {
  testId: string;
  emailGesendet: boolean;
}) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<SendEmailResult | "idle" | "sending">(
    emailGesendet ? "already_sent" : "idle",
  );

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setStatus(await sendEmail(testId, email));
  }

  if (status === "sent") {
    return <p className="email-form-note">Die E-Mail ist unterwegs. ✉️</p>;
  }
  if (status === "already_sent") {
    return (
      <p className="email-form-note">
        Das Ergebnis dieses Tests wurde bereits per E-Mail verschickt.
      </p>
    );
  }

  return (
    <form className="email-form" onSubmit={handleSubmit}>
      <label htmlFor="email-input">Ergebnis per E-Mail schicken</label>
      <div className="email-form-row">
        <input
          id="email-input"
          type="email"
          required
          autoComplete="email"
          placeholder="deine@adresse.de"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={status === "sending"}
        />
        <button
          type="submit"
          className="btn btn-secondary"
          disabled={status === "sending"}
          aria-busy={status === "sending"}
        >
          {status === "sending" ? (
            <>
              <span className="spinner spinner-sm" aria-hidden="true" />
              Wird gesendet…
            </>
          ) : (
            "Senden"
          )}
        </button>
      </div>
      <p className="email-form-note">
        {status === "error"
          ? "Das hat leider nicht geklappt. Bitte versuche es noch einmal."
          : "Wir verwenden deine Adresse nur für diese eine E-Mail und speichern sie nicht. Pro Test ist ein Versand möglich."}
      </p>
    </form>
  );
}

interface ResultsScreenProps {
  testId?: string;
  results: Contestant[];
  emailGesendet?: boolean;
}

export function ResultsScreen({
  testId,
  results,
  emailGesendet = false,
}: ResultsScreenProps) {
  const top5 = results.slice(0, 5);
  const { zusammenfassung, timedOut } = useZusammenfassung(testId ?? null);

  return (
    <>
      <div className="results-header">
        <HeroLogo />
        <h1>Deine Top 5 Werte</h1>
        <p>Das sind die Werte, die dir am wichtigsten sind.</p>
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
                      {zusammenfassung.split("\n\n").map((paragraph, i) => (
                        <p key={i}>{highlightValues(paragraph, top5.map((c) => c.name))}</p>
                      ))}
                    </div>
                  ) : timedOut ? (
                    <div className="chat-bubble summary-text">
                      <p>Hallo!</p>
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
          {testId && zusammenfassung ? (
            <EmailForm testId={testId} emailGesendet={emailGesendet} />
          ) : null}
          <div className="intro-footer">
            <Link to="/tests" className="btn btn-primary">
              Neuen Test starten
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
