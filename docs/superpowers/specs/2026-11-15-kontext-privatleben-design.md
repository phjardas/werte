# Kontexte und Kontext Privatleben

Issues: #2 (Epic), #10 (Privatleben)

## Absicht

Der Werte Kompass soll neben dem Berufsleben weitere Lebensbereiche abdecken. Wer einen Test startet, wählt zuerst einen Kontext aus. Szenarien und Zusammenfassung passen sich an diesen Kontext an, die Werteliste bleibt dieselbe. Den Anfang macht Privatleben. Danach sollen fünf bis sechs weitere Kontexte folgen (#9, #11 bis #16), jeweils mit möglichst wenig Aufwand.

## Ziele

- Auswahlseite unter `/tests` mit einer Karte je Kontext (Titel, kurze Beschreibung, Icon). Ein Klick auf eine Karte legt den Test an und startet ihn.
- Kontexte Berufsleben und Privatleben.
- Szenario- und Zusammenfassungs-Prompt als eine gemeinsame Vorlage mit Bausteinen je Kontext.
- Statistik getrennt nach Kontext und zusätzlich als Gesamtstatistik.
- Ein weiterer Kontext braucht nur einen Eintrag mit Textbausteinen im Backend und eine Karte im Frontend.

## Nicht-Ziele

- Eigene Wertelisten je Kontext. Privatleben nutzt die bestehenden 120 Werte, deren Beschreibungen neutral umformuliert werden (siehe unten). Ob Berufsorientierung (#12) eine eigene Liste braucht, wird dort geklärt.
- Die weiteren Kontexte aus #2. Sie kommen in eigenen Issues.
- Teamwerte (#17, verworfen).
- Erhalt der bisher gecachten Szenarien und Zusammenfassungen. Der Berufs-Prompt darf sich beim Umbau ändern, damit entfallen der Cache und die Votes für die alten Prompt-Versionen.

## Anti-Ziele

- Ein Privatleben-Szenario, das im Büro spielt, oder umgekehrt. Die Abgrenzung zwischen den Kontexten muss im Prompt ausdrücklich stehen, so wie heute "nicht im Privat- oder Familienleben".
- Laufende Tests, die nach dem Deployment brechen. Tests ohne Kontext gelten als Berufsleben.
- Eine vermischte Statistik, in der man nicht erkennt, aus welchem Kontext eine Rangliste stammt.

## Rahmenbedingungen

- Bedrock-Kosten: Jeder Kontext hat eigene Cache-Einträge. Der Cache wird also pro Kontext neu aufgebaut, und der Tagesbudgetschutz (`TAGESBUDGET_USD`) gilt weiterhin für alle zusammen.
- Die API darf über CloudFront nie 403 liefern (siehe CLAUDE.md). Ein unbekannter Kontext gibt 400 zurück.
- Kein neues Routing in CloudFront nötig. Query-Parameter reicht API Gateway bereits durch.

## Ansätze

1. **Eine Vorlage mit Bausteinen je Kontext (gewählt).** Die Regeln für gute Szenarien und Zusammenfassungen stehen einmal im Code. Je Kontext gibt es nur die Texte, die sich unterscheiden. Ein Kontext, der eigene Regeln braucht, bekommt einen optionalen zusätzlichen Regelbaustein.
2. **Ein vollständiger Prompt je Kontext.** Maximale Freiheit je Kontext, aber bei acht geplanten Kontexten stünden etwa 60 Zeilen Regeln achtmal im Code, und jede Verbesserung müsste überall nachgezogen werden.

Gewählt wurde Ansatz 1, weil fünf bis sechs weitere Kontexte geplant sind und die Regeln für ein gutes Szenario in allen Kontexten dieselben sind. Der Erhalt des Caches war kein Kriterium.

## Entscheidungen

### Kontextmodell im Backend

Neues Domänenmodul `backend/src/domain/kontext.ts`:

```ts
export type KontextId = "beruf" | "privat";
export const STANDARD_KONTEXT: KontextId = "beruf";

export interface Kontext {
  id: KontextId;
  /** Wer den Test macht, z.B. "Berufstätige". */
  zielgruppe: string;
  /** Wo die Szenen spielen, mit Beispielen für beteiligte Personen. */
  szenenort: string;
  /** Wovon die Szene sich abgrenzt, z.B. "nicht im Privat- oder Familienleben". */
  abgrenzung: string;
  /** Vollständiges Beispiel (gedanke, szenario, antworten) für Aktivität vs. Ruhe in diesem Kontext. */
  beispiel: { gedanke: string; szenario: string; antworten: [string, string] };
  /** Wo sich die Werte in der Zusammenfassung zeigen und worauf sich die Tipps beziehen. */
  zusammenfassungsbereich: string;
  tippbeispiele: string;
  /** Optional: zusätzliche Regeln nur für diesen Kontext. */
  zusatzregeln?: string;
}

export const KONTEXTE: Record<KontextId, Kontext>;
export function istKontext(id: unknown): id is KontextId;
```

Die Feldnamen sind ein Vorschlag. Maßgeblich ist, dass alle kontextabhängigen Stellen der heutigen Prompts als Felder abgebildet sind. Für Berufsleben werden die Texte aus den heutigen Prompts übernommen.

Für Privatleben: Zielgruppe sind Erwachsene in ihrem Alltag außerhalb der Arbeit. Szenen spielen mit Freunden, Nachbarn, Partner oder Partnerin, in der Freizeit, beim Wohnen, beim Umgang mit Geld oder Zeit. Abgrenzung: nicht am Arbeitsplatz und nicht in der Rolle als Mutter oder Vater (dafür gibt es den Eltern Werte Kompass). Die Texte formuliert der Umsetzer und legt sie mit Beispielszenarien zur Durchsicht vor (siehe "Beispielszenarien vor dem Merge").

### Neutrale Werte-Beschreibungen

Die Prompts enthalten die vollständige `beschreibung` jedes Werts aus `backend/src/werte.json`. 49 der 120 Beschreibungen beziehen sich auf die Arbeit, manche schon in der Definition (etwa "Autonomie": "die Art und Weise der eigenen Arbeit selbst bestimmen"). Diese Beschreibungen werden so umformuliert, dass sie in jedem Lebensbereich tragen. Der Bezug zum Lebensbereich kommt ausschließlich aus den Bausteinen des Kontexts. Sätze wie "Im Arbeitsleben zeigt sich …" werden allgemein gefasst oder entfallen. Der Kern jedes Werts und die Abgrenzung zu ähnlichen Werten bleiben erhalten, weil die Szenario-Regeln sich darauf stützen.

Die umformulierten Beschreibungen werden zur Durchsicht vorgelegt, bevor die Prompt-Arbeit darauf aufbaut. Betroffene Einträge findet man z.B. mit einer Suche nach `arbeit|beruf|team|kolleg|vorgesetzt|kund` in `beschreibung`. `synonyme` und `definition` gehen nicht in die Prompts und bleiben unverändert.

Dadurch ändern sich auch die Berufsszenarien. Das ist akzeptiert.

### Beispielszenarien vor dem Merge

Neues Skript `backend/scripts/beispielszenarien.ts`, aufrufbar z.B. mit `pnpm beispielszenarien privat 12`. Es wählt zufällig N Wertepaare (optional feste Paare per Argument), rendert die Prompts für den angegebenen Kontext und ruft Bedrock direkt auf, ohne Cache und ohne Tagesbudget-Buchung. Ausgabe als lesbarer Text je Paar: Werte, Szenario, beide Antworten. Optional erzeugt es zusätzlich eine Zusammenfassung für eine zufällige Top 5. Es nutzt die lokalen AWS-Credentials und dieselben Domänenklassen wie die Lambdas, damit die Ausgabe genau dem entspricht, was später live erzeugt wird.

Ablauf: Die Privatleben-Bausteine und die neutralen Beschreibungen werden mit einer Auswahl Beispielszenarien vorgelegt, bevor der Branch auf `main` gemergt wird. Die Auswahl soll gezielt Werte enthalten, deren Beschreibung vorher auf die Arbeit bezogen war. Das Skript bleibt im Repo und dient für jeden weiteren Kontext.

### Prompts

`SzenarioService` und `ZusammenfassungService` bauen den System-Prompt aus der Vorlage und dem Kontext. `getOrCreate` bekommt den Kontext als zusätzlichen Parameter (Standard `beruf`).

Cache-Schlüssel: Die Prompt-Version ist heute ein Hash aus System- und User-Prompt (Szenario) bzw. nur System-Prompt (Zusammenfassung). Weil der System-Prompt je Kontext unterschiedlich ist, unterscheiden sich die Versionen automatisch. Der Partition Key (`{wert1}_{wert2}` bzw. die Top 5) bleibt deshalb unverändert. `recordVote` funktioniert weiter, weil der Vote an der Version hängt. Der Hash muss den tatsächlich gerenderten System-Prompt verwenden, nicht mehr die Konstante.

### Test-Session

- `TestSession` bekommt `kontext?: KontextId`. Fehlt das Feld, gilt `beruf`.
- `POST /tests` nimmt `{ "kontext": "privat" }` im Body. Fehlender Body oder fehlendes Feld ergibt `beruf`. Ein unbekannter Wert ergibt 400.
- `GET /tests/{testId}` liefert `kontext` mit (immer gefüllt, Fallback `beruf`).

### Szenarien

- `GET /szenarien/{wert1}/{wert2}?kontext=privat`. Ohne Parameter gilt `beruf`, ein unbekannter Wert ergibt 400. Der Kontext kommt aus dem Query-Parameter und nicht aus dem Test, weil die Route keine `testId` kennt.
- Vorwärmen: `updateTestState` liest den Kontext aus der gespeicherten Session und gibt ihn an `prewarmSzenarien` weiter (Payload `{ testId, werte, kontext }`). Dafür muss `TestRepository.updateState` die Session bzw. den Kontext zurückgeben, oder der Handler liest die Session vorher. Das entscheidet der Umsetzer.
- Votes brauchen keinen Kontext.

### Zusammenfassung

`completeTest` liest den Kontext aus der Session (`testRepository.complete` liefert sie bereits) und gibt ihn an die Step Function weiter (`{ testId, werte, kontext }`). `generateTestZusammenfassung` reicht ihn an den Service. Die Wiederherstellung in `getTest` gibt ebenfalls den Kontext mit.

### Statistik

- Die Zähler liegen weiterhin in der Tabelle `{project}-statistik`, ein Item je Kontext. Das bestehende Item `pk = "werte"` bleibt das Item für Berufsleben, damit die bisherigen Tests ohne Migration als Berufsleben zählen. Weitere Kontexte bekommen `pk = "werte#{kontextId}"`.
- `StatistikRepository.recordTest(kontext, werte)` und `get(kontext)`.
- `GET /statistik?kontext=privat` liefert die Statistik eines Kontexts. Ohne Parameter liefert die Route die Gesamtstatistik: Tests und Platzierungen aller Kontext-Items werden beim Lesen addiert, danach wird `berechneStatistik` wie bisher angewendet. Ein unbekannter Kontext ergibt 400.
- Die Statistikseite bekommt eine Umschaltung zwischen "Gesamt" und den Kontexten. Standard ist "Gesamt". Die Form der Umschaltung entscheidet der Umsetzer, passend zum bestehenden Stil.

### Frontend

- `/tests` (`FreePage`) legt keinen Test mehr sofort an, sondern zeigt die Auswahlseite nach Variante A aus der Abstimmung: Überschrift "Worum soll es gehen?", Untertitel "Die Szenarien und deine Auswertung passen sich an.", darunter je Kontext eine Karte mit Icon, Titel und Beschreibung. Ein Klick legt den Test mit dem Kontext an und leitet auf `/tests/$testId` weiter, während der Spinner wie bisher erscheint.
- Unter den Kontexten steht eine gestrichelte Karte "Als Mutter oder Vater ↗", die auf den Eltern Werte Kompass verlinkt (neuer Tab, gleiche URL wie im Teaser auf der Ergebnisseite).
- Die Liste der Kontexte (ID, Titel, Beschreibung, Icon) steht in einer Datei im Frontend, z.B. `app/src/kontexte.ts`. Die IDs müssen mit dem Backend übereinstimmen.
- Entwürfe für die Kartentexte:
  - Berufsleben: "Was dir bei der Arbeit wichtig ist: im Team, mit Vorgesetzten und mit Kundschaft."
  - Privatleben: "Was dir außerhalb der Arbeit wichtig ist: mit Freunden, in der Freizeit, beim Wohnen und beim Geld."
- `fetchSzenario` hängt `?kontext=` an. Der Kontext kommt aus dem geladenen Test.
- Die Landing Page ist auf `main` bereits auf Lebensbereiche umgestellt und bleibt unverändert. Sie nennt Partnerschaft als Beispiel, obwohl dieser Kontext erst mit #9 kommt. In sichtbaren Texten heißt ein Kontext "Lebensbereich". Die Auswahlseite übernimmt diese Bezeichnung, wo sie das Wort braucht.
- `ComparisonIntroStep` nennt heute "Berufsleben" und setzt künftig den Kontext ein, z.B. "in deinem Privatleben".
- Die Ergebnisseite zeigt, in welchem Kontext der Test gemacht wurde, z.B. als kleine Zeile unter der Überschrift.

### Infrastruktur

Keine neuen Ressourcen. Der Step-Function-Input bekommt das Feld `kontext`. Die State Machine reicht ihren Input unverändert an `generateTestZusammenfassung` durch, eine Anpassung der Definition ist nicht nötig.

## Offen für den Umsetzer

- Genaue Formulierung der Prompt-Vorlage und der Privatleben-Bausteine.
- Icons für die Karten (Emoji wie im Entwurf oder SVG).
- Wie `updateTestState` an den Kontext kommt.
- Form der Statistik-Umschaltung.
- Tests: Die bestehenden Vitest-Suites für Szenario, Zusammenfassung, Statistik und die Lambdas werden um den Kontext erweitert, inklusive Fallback auf `beruf` bei fehlendem Feld.
