# Werteauswahl in Seiten

## Absicht

Die Auswahl aus 120 Werten auf einer einzigen, gemischten Seite überfordert und ist unangenehm zu bedienen. Die Auswahl wird deshalb auf Seiten mit je 20 Werten verteilt, die man nacheinander durchgeht. Unbekannte Begriffe lassen sich über eine Kurzbeschreibung erklären. Eine letzte Seite schlägt Werte vor, die zur bisherigen Auswahl passen, damit beim Durchgehen übersehene Werte noch eine Chance bekommen. Danach folgt das Reduzieren auf höchstens 10 Werte, das sich klar als anderer Schritt zu erkennen gibt.

## Ziele

- Auswahl in Seiten zu je 20 Werten, bei 120 Werten also sechs Seiten, mit Vor und Zurück.
- Zu jedem Wert eine Kurzbeschreibung, die man auf Wunsch öffnet, auch auf dem Handy.
- Eine Vorschlagsseite nach der letzten Werteseite mit Werten, die mit der Auswahl verwandt, aber nicht gewählt sind.
- Ein deutlich abgesetzter Schritt zum Reduzieren auf 10, eingeleitet von einer eigenen Erklärseite.
- Ein Test lässt sich mitten in der Auswahl über seine URL fortsetzen, auf derselben Seite und mit derselben Auswahl.

## Nicht-Ziele

- Gruppierung der Werte nach Themen. Die Reihenfolge bleibt zufällig.
- Vorschläge, die den Kontext berücksichtigen oder begründen, warum ein Wert passt.
- Inhaltliche Arbeit an der Werteliste. Die Liste wird gerade separat überarbeitet. Kurzbeschreibungen und Verwandtschaften werden erst erzeugt, wenn sie feststeht.

## Anti-Ziele

- Ein Reduzierschritt, der wie eine weitere Auswahlseite aussieht. Wer dort ankommt, muss merken, dass jetzt verzichtet statt gesammelt wird.
- Laufende Tests, die nach dem Deployment brechen.
- Eine Erklärung, die nur per Hover erreichbar ist.

## Rahmenbedingungen

- Keine Bedrock-Aufrufe zur Laufzeit für Beschreibungen oder Vorschläge.
- Die Szenario- und Zusammenfassungs-Prompts nutzen weiter `beschreibung`. Die neuen Felder fließen nicht in die Prompts ein, der Cache bleibt also gültig.
- `updateTestState` reagiert nur auf `step === "comparison-intro"`. Neue Zwischenstände des Frontends kann es unverändert speichern.

## Ansätze

1. **Feste Verwandtschaften in `werte.json` (gewählt).** Jeder Wert bekommt eine Liste von etwa fünf verwandten Werten, einmalig generiert und von Hand geprüft. Kostet nichts, antwortet sofort und ist in jedem Kontext gleich. Die Vorschläge beruhen auf Ähnlichkeit und kennen den Kontext nicht.
2. **Vorschläge live über Bedrock.** Kontextbezogen und begründbar, aber langsamer, mit Kosten pro Test, Last auf dem Tagesbudget und einer neuen gedrosselten Route.
3. **Gemeinsame Auswahl aus bisherigen Tests.** Verworfen, weil die Statistik nur Ranglisten speichert und die ursprüngliche Auswahl fehlt. Es würde erst nach Monaten tragen.

## Entscheidungen

### Daten

`werte.json` bekommt zwei neue Felder pro Wert:

- `kurzbeschreibung`: ein Satz, höchstens etwa 120 Zeichen, ohne Bezug zur Arbeit (wie bei `beschreibung`, `werte.test.ts` prüft das künftig auch hierfür).
- `verwandt`: Namen von etwa fünf verwandten Werten, die alle in der Liste existieren.

Ein Skript im Backend erzeugt beide Felder über Bedrock, wie `beispielszenarien`. Das Ergebnis wird von Hand geprüft und eingecheckt. Ein Test stellt sicher, dass jeder Wert beide Felder hat und `verwandt` nur bekannte Werte enthält. Das Skript läuft erst, wenn die neue Werteliste feststeht.

`GET /werte` liefert statt einer Namensliste Objekte `{ name, kurzbeschreibung, verwandt }`. Das Frontend wird im selben Deployment angepasst. Weil Frontend und API gemeinsam ausgerollt werden, ist keine Übergangsform nötig.

### Ablauf

Die Schritte werden zu `selection → suggestions → filter-intro → filter → comparison-intro → comparison`.

- **selection**: Beim ersten Laden werden die Werte gemischt und die Reihenfolge im Teststand gespeichert (`order`). Die Seitenzahl steht als `page` im Teststand. Jeder Seitenwechsel speichert über `useStateSync` die Auswahl und die Seite. Eine Fortschrittsanzeige zeigt „Seite 3 von 6“. Weiter geht es ohne Mindestauswahl pro Seite. Die Mindestzahl von 5 gilt erst am Ende der Vorschlagsseite.
- **suggestions**: Für jeden nicht gewählten Wert wird gezählt, wie oft er in `verwandt` eines gewählten Werts vorkommt. Gezeigt werden bis zu 12 Werte mit der höchsten Zahl, bei Gleichstand in der gespeicherten Reihenfolge. Sind es keine (etwa bei sehr kleiner Auswahl), wird die Seite übersprungen.
- **filter-intro** und **filter**: Nur bei mehr als 10 gewählten Werten, wie heute. Die Zwischenseite erklärt, dass jetzt nicht mehr gesammelt, sondern auf 10 verzichtet wird. Der Reduzierschritt zeigt zehn sichtbare Plätze, die sich beim Auswählen füllen, statt der Chip-Wolke allein.

Ältere Teststände ohne `order` oder `page` starten die Auswahl auf Seite 1 mit ihren bisherigen `selectedValues`. Ein gespeicherter `step: "filter"` bleibt gültig. Ändert sich die Werteliste zwischen zwei Besuchen, werden unbekannte Werte aus `order` entfernt und neue Werte hinten angehängt. „Zurück“ im Reduzierschritt führt zur Vorschlagsseite, falls sie gezeigt wurde, sonst zur letzten Werteseite.

### Kurzbeschreibung am Chip

Ein `<button>` darf keinen weiteren Button enthalten. Der Chip wird deshalb ein Container mit zwei nebeneinanderliegenden Buttons: dem Wert selbst (`aria-pressed` für den Auswahlzustand) und einem kleinen ⓘ-Button (`aria-label="Was bedeutet Ehrlichkeit?"`). Das ⓘ öffnet die Kurzbeschreibung über das native `popover`-Attribut mit `popovertarget`, ohne eigene Bibliothek. Damit funktionieren Schließen per Escape oder Tippen daneben von selbst. Das Popover erscheint als schmales Feld am unteren Bildschirmrand, damit es ohne Anchor Positioning in allen Browsern sauber aussieht.

## Dem Umsetzenden überlassen

- Optik der Seitenanzeige, des ⓘ und der zehn Plätze im Reduzierschritt, passend zum bestehenden Stil.
- Texte der Vorschlagsseite und der Zwischenseite vor dem Reduzieren.
- Ob die Werteseiten bei einem Seitenwechsel nach oben scrollen (vermutlich ja).
