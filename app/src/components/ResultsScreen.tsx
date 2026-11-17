import { Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { fetchWerte, sendEmail, type SendEmailResult } from "../api";
import { FARBEN, farbVerteilung } from "../farben";
import { useZusammenfassung } from "../hooks/useZusammenfassung";
import type { Contestant, WertInfo } from "../types";
import { ELTERN_KOMPASS_URL, kontextInfo, type KontextId } from "../kontexte";

function highlightValues(text: string, values: string[]): ReactNode {
  if (values.length === 0) return text;
  const escaped = values.map((v) => v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  // Whole words only, case-sensitive. \b is ASCII-only, so umlauts need Unicode lookarounds.
  const pattern = new RegExp(
    `(?<![\\p{L}\\p{N}])(${escaped.join("|")})(?![\\p{L}\\p{N}])`,
    "gu",
  );
  // split() puts the captured matches at the odd indices
  return text.split(pattern).map((part, i) =>
    i % 2 === 1 ? (
      <mark key={i} className="value-highlight">
        {part}
      </mark>
    ) : (
      part
    ),
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

function FarbAuswertung({
  kontext,
  werte,
}: {
  kontext: KontextId;
  werte: string[];
}) {
  const [angebot, setAngebot] = useState<WertInfo[] | null>(null);
  useEffect(() => {
    // ponytail: no error state, the colours are an extra and simply stay hidden if the values fail to load
    fetchWerte(kontext).then(setAngebot, () => {});
  }, [kontext]);
  if (!angebot) return null;

  const verteilung = farbVerteilung(werte, angebot).filter((a) => a.anteil > 0);
  if (verteilung.length === 0) return null;

  return (
    <section className="farben">
      <h2>Deine Werte in vier Farben</h2>
      <p className="farben-intro">
        Das Vier-Farben-Modell ordnet Werte vier Grundmotiven zu. So verteilen
        sich deine {werte.length} wichtigsten Werte:
      </p>
      <div className="farben-balken" aria-hidden="true">
        {verteilung.map((a) => (
          <div
            key={a.farbe}
            className={`farbe-${a.farbe}`}
            style={{ flexGrow: a.anteil }}
          />
        ))}
      </div>
      <ul className="farben-liste">
        {verteilung.map((a) => (
          <li key={a.farbe}>
            <span className={`farben-punkt farbe-${a.farbe}`} />
            <div>
              <strong>
                {FARBEN[a.farbe].titel} {a.anteil} %
              </strong>
              <p>{FARBEN[a.farbe].beschreibung}</p>
              <p className="farben-werte">{a.werte.join(", ")}</p>
            </div>
          </li>
        ))}
      </ul>
      <p className="farben-quelle">
        Das Modell geht auf das DISG-Modell zurück und ist eine grobe
        Orientierung, keine Persönlichkeitsdiagnose.{" "}
        <a
          href="https://de.wikipedia.org/wiki/DISG"
          target="_blank"
          rel="noopener"
        >
          Mehr dazu bei Wikipedia
        </a>
      </p>
    </section>
  );
}

interface ResultsScreenProps {
  testId?: string;
  kontext: KontextId;
  results: Contestant[];
  emailGesendet?: boolean;
  ablaufAm?: string | null;
}

export function ResultsScreen({
  testId,
  kontext,
  results,
  emailGesendet = false,
  ablaufAm,
}: ResultsScreenProps) {
  const top5 = results.slice(0, 5);
  const { zusammenfassung, timedOut } = useZusammenfassung(testId ?? null);

  return (
    <>
      <div className="results-header">
        <h1>Deine Top 5 Werte</h1>
        <p>Das sind die Werte, die dir am wichtigsten sind.</p>
        <p className="results-kontext">
          Lebensbereich: {kontextInfo(kontext).titel}
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
                      {zusammenfassung.split("\n\n").map((paragraph, i) => (
                        <p key={i}>
                          {highlightValues(
                            paragraph,
                            top5.map((c) => c.name),
                          )}
                        </p>
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
                        Schau später einfach noch einmal unter diesem Link
                        vorbei.
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
          <FarbAuswertung kontext={kontext} werte={top5.map((c) => c.name)} />
          {testId && zusammenfassung ? (
            <EmailForm testId={testId} emailGesendet={emailGesendet} />
          ) : null}
          {ablaufAm ? (
            <p className="email-form-note">
              Unter diesem Link findest du dein Ergebnis bis zum{" "}
              {new Date(ablaufAm).toLocaleDateString("de-DE", {
                dateStyle: "long",
              })}
              . Danach wird der Test gelöscht.
            </p>
          ) : null}
          <a
            className="eltern-teaser"
            href={ELTERN_KOMPASS_URL}
            target="_blank"
            rel="noopener"
          >
            <img
              src="/eltern-werte-kompass.webp"
              alt=""
              width={96}
              height={96}
            />
            <div>
              <strong>Eltern Werte Kompass</strong>
              <p>
                Du möchtest deine Werte als Mutter oder Vater entdecken? Probier
                den speziell dafür entwickelten Eltern Werte Kompass aus.
              </p>
              <small>
                Disclaimer: Den Eltern Werte Kompass betreibt meine Frau. 😉
              </small>
            </div>
          </a>
          <div className="intro-footer">
            <Link to="/tests" className="btn btn-primary">
              Neuen Test starten
            </Link>
          </div>
          <div className="kofi">
            <p>
              Ich stelle den Werte Kompass kostenlos zur Verfügung. Wenn dir der
              Test gefallen hat, freue ich mich über einen Kaffee.
            </p>
            <div className="kofi-buttons">
              <a
                className="btn btn-secondary"
                href="https://ko-fi.com/phjardas"
                target="_blank"
                rel="noopener"
              >
                ☕ Spendier mir einen Kaffee
              </a>
              {"share" in navigator ? (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() =>
                    // Shares the landing page, not the personal result. Cancelling rejects with AbortError.
                    navigator
                      .share({
                        title: "Werte Kompass",
                        text: "Finde heraus, welche Werte dir wirklich wichtig sind.",
                        url: location.origin,
                      })
                      .catch(() => {})
                  }
                >
                  Werte Kompass teilen
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
