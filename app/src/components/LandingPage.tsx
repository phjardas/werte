import { Link } from "@tanstack/react-router";

const schritte = [
  {
    titel: "Lebensbereich wählen",
    text: "Du entscheidest, für welchen Bereich deines Lebens du den Test machst, zum Beispiel für den Beruf, das Privatleben oder deine Partnerschaft.",
  },
  {
    titel: "Werte auswählen",
    text: "Aus 120 Werten wählst du alle aus, die dich ansprechen. Hast du mehr als zehn markiert, grenzt du sie danach auf deine wichtigsten ein.",
  },
  {
    titel: "Werte vergleichen",
    text: "Je zwei deiner Werte treten gegeneinander an. Zu jedem Paar beschreibt eine kurze Situation aus dem gewählten Lebensbereich einen Konflikt, und du entscheidest, was dir wichtiger ist. Wie bei einem Schachturnier im Schweizer System entsteht so nach wenigen Runden eine klare Rangfolge.",
  },
  {
    titel: "Ergebnis erhalten",
    text: "Am Ende siehst du deine fünf wichtigsten Werte und eine persönliche Zusammenfassung, was sie für diesen Lebensbereich bedeuten. Die Situationen und die Zusammenfassung erstellt eine KI.",
  },
];

export function LandingPage() {
  return (
    <div className="screen active landing">
      <section className="landing-hero">
        <img src="/logo.svg" alt="" width={112} height={112} />
        <p className="landing-marke">Werte Kompass</p>
        <h1>Finde heraus, was dir wirklich wichtig ist</h1>
        <p className="landing-lead">
          In wenigen Minuten entdeckst du deine persönlichen Werte und bringst
          sie in eine klare Reihenfolge, ob im Beruf, im Privatleben oder in
          deiner Partnerschaft. Der Wertetest ist kostenlos und ohne Anmeldung.
        </p>
        <div className="landing-aktionen">
          <Link to="/tests" className="btn btn-primary">
            Los geht's
          </Link>
          <a href="#kompass" className="btn btn-secondary">
            So funktioniert's
          </a>
        </div>
      </section>

      <section className="landing-abschnitt">
        <h2>Warum Werte zählen</h2>
        <p className="landing-einleitung">
          Werte sind unsere Überzeugungen darüber, was im Leben wichtig ist. Sie
          wirken meist im Hintergrund, und wir bemerken sie oft erst, wenn etwas
          sie berührt: eine Aufgabe, die uns begeistert, oder eine Entscheidung,
          die uns schwerfällt.
        </p>

        <div className="landing-karten">
          <article className="landing-karte">
            <h3>Ein Kompass für Entscheidungen</h3>
            <p>
              Ob du ein Jobangebot annimmst oder mit deiner Partnerin oder deinem
              Partner zusammenziehst, eine objektiv richtige Antwort gibt es
              selten. Wer
              seine Werte kennt, hat einen Maßstab, an dem sich die Optionen
              messen lassen. Ein Kompass zeigt die Richtung an, den Weg wählst
              du selbst.
            </p>
          </article>
          <article className="landing-karte">
            <h3>Klarheit im Gespräch</h3>
            <p>
              Wenn du weißt, was dir wichtig ist, kannst du es auch benennen. Das
              hilft im Bewerbungsgespräch ebenso wie im Streit mit der Familie,
              denn hinter vielen Konflikten stehen unterschiedliche Werte.
            </p>
          </article>
          <article className="landing-karte">
            <h3>Jeder Bereich hat seine Werte</h3>
            <p>
              In der Partnerschaft stehen oft andere Werte im Vordergrund als im
              Job. Deshalb machst du den Test jeweils für einen Lebensbereich
              und kannst ihn für weitere wiederholen.
            </p>
          </article>
        </div>

        <aside className="landing-hinweis">
          <h3>Wenn Leben und Werte auseinanderlaufen</h3>
          <p>
            Wer über lange Zeit gegen die eigenen Werte handelt, zahlt dafür
            einen Preis. Das kann ein Job sein, in dem Ehrlichkeit wenig zählt,
            obwohl sie dir viel bedeutet, oder eine Beziehung, in der du deine
            Unabhängigkeit dauerhaft zurückstellst. Kurzfristig lässt sich das aushalten. Auf Dauer entsteht
            eine innere Spannung, die sich als Unzufriedenheit und Erschöpfung
            bemerkbar machen kann. Die Arbeitspsychologie bringt eine
            Diskrepanz zwischen eigenen Werten und dem Arbeitsumfeld mit
            Burnout in Verbindung, und anhaltende innere Konflikte gelten als
            ein Risikofaktor für Depressionen.
          </p>
          <p>
            Die eigenen Werte zu kennen, ist ein erster Schritt, um solche
            Spannungen früh zu erkennen und gegenzusteuern.
          </p>
          <p className="landing-klein">
            Fühlst du dich seit Wochen niedergeschlagen oder antriebslos, sprich
            bitte mit deiner Hausarztpraxis oder einer Psychotherapeutin bzw.
            einem Psychotherapeuten.
          </p>
        </aside>
      </section>

      <section className="landing-abschnitt" id="kompass">
        <h2>So funktioniert der Werte Kompass</h2>
        <ol className="landing-schritte">
          {schritte.map((s) => (
            <li key={s.titel}>
              <h3>{s.titel}</h3>
              <p>{s.text}</p>
            </li>
          ))}
        </ol>

        <p className="landing-datenschutz">
          Deine Antworten werden gespeichert, damit du den Test später über
          seinen Link fortsetzen kannst. Nach 12 Monaten wird der Test gelöscht.
          Persönliche Daten erfassen wir dabei nicht. Wenn du dir dein Ergebnis
          per E-Mail schickst, verwenden wir die Adresse nur für den Versand und
          speichern sie nicht.
        </p>

        <div className="landing-aktionen">
          <Link to="/tests" className="btn btn-primary">
            Jetzt Werte entdecken
          </Link>
        </div>
      </section>
    </div>
  );
}
