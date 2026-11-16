import { Link } from "@tanstack/react-router";

export function DatenschutzPage() {
  return (
    <div className="screen active step-intro">
      <header className="header">
        <h1>Datenschutz</h1>
      </header>
      <div className="intro-content">
        <p>
          Der Werte Kompass kommt ohne Anmeldung, Cookies und Tracking aus. Wir
          speichern deine Antworten, damit du einen Test über seinen Link
          fortsetzen kannst, können sie aber keiner Person zuordnen. Im
          Folgenden steht, welche Daten dabei anfallen und wer sie verarbeitet.
        </p>

        <h2>Verantwortlicher</h2>
        <p>
          Philipp Jardas, Berliner Str. 27, 63571 Gelnhausen,{" "}
          <a href="mailto:philipp@jardas.de">philipp@jardas.de</a>
        </p>

        <h2>Testdaten</h2>
        <p>
          Zu jedem Test speichern wir die ausgewählten Werte, deine
          Entscheidungen in den Vergleichen, das Ergebnis, die Auswertung und
          die Kosten der KI-Anfragen. Der Test ist nur über seine zufällig
          erzeugte Kennung im Link erreichbar. Wer den Link kennt, kann den Test
          ansehen. Die Testdaten werden nach zwölf Monaten automatisch gelöscht.
          Auf Anfrage löschen wir einen Test früher, wenn du uns seinen Link
          schickst.
        </p>
        <p>
          Abgeschlossene Tests fließen zusätzlich in die öffentliche Statistik
          ein. Dort werden nur Zähler pro Wert und Rang erhöht, ein Bezug zum
          einzelnen Test bleibt nicht erhalten.
        </p>
        <p>
          Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO, weil die Speicherung
          für die Durchführung des Tests nötig ist, den du startest.
        </p>

        <h2>Generierte Szenarien und Auswertung</h2>
        <p>
          Die Szenarien und die Auswertung erzeugt das Sprachmodell Claude von
          Anthropic über den Dienst Amazon Bedrock. Die Anfragen werden in
          Rechenzentren innerhalb der EU verarbeitet. An das Modell gehen nur
          die Namen und Beschreibungen der Werte, keine Angaben zu deiner
          Person. Nach Angaben von AWS werden die Anfragen weder gespeichert
          noch an Anthropic weitergegeben oder zum Training verwendet.
        </p>

        <h2>Ergebnis per E-Mail</h2>
        <p>
          Wenn du dir dein Ergebnis per E-Mail schickst, übergeben wir die
          Adresse zusammen mit deinem Ergebnis an Amazon Simple Email Service
          zum Versand. Wir speichern die Adresse nicht, sondern nur den
          Zeitpunkt des Versands, damit pro Test nur eine E-Mail verschickt
          wird. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO.
        </p>

        <h2>Hosting und Protokolle</h2>
        <p>
          Die Anwendung läuft bei Amazon Web Services (Amazon Web Services EMEA
          SARL, Luxemburg) in der Region Frankfurt. Beim Aufruf der Seite
          verarbeitet AWS technisch notwendig deine IP-Adresse. Zugriffsprotokolle
          von CloudFront und API Gateway sind nicht aktiviert. Die Anwendung
          schreibt Betriebsprotokolle, etwa zu Fehlern oder zum Cache der
          Szenarien, die keine IP-Adressen oder anderen Angaben zu deiner
          Person enthalten. Sie werden nach 30 Tagen gelöscht. AWS ist nach dem EU-US Data Privacy Framework
          zertifiziert. Rechtsgrundlage ist unser berechtigtes Interesse an
          einem sicheren und funktionierenden Betrieb nach Art. 6 Abs. 1 lit. f
          DSGVO.
        </p>

        <h2>Deine Rechte</h2>
        <p>
          Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung
          der Verarbeitung, Datenübertragbarkeit und Widerspruch. Schreib dafür
          an <a href="mailto:philipp@jardas.de">philipp@jardas.de</a>. Weil wir
          Tests keiner Person zuordnen können, brauchen wir dafür den Link zum
          Test. Außerdem kannst du dich bei einer Datenschutzaufsichtsbehörde
          beschweren, zum Beispiel beim Hessischen Beauftragten für Datenschutz
          und Informationsfreiheit.
        </p>
      </div>
      <div className="intro-footer">
        <Link to="/" className="btn btn-primary">
          Zur Startseite
        </Link>
      </div>
    </div>
  );
}
