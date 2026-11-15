// Generates the short description and the related values of every value in werte.json and writes them back
// into src/werte.json. Run it after the list of values changes, then review the result by hand.
//
//   AWS_PROFILE=phjardas pnpm werteinfos [Wert ...]
//
// With names, only those values are generated again.
// The daily budget is not checked or booked.
import { readFileSync, writeFileSync } from "node:fs";
import { BedrockAIService } from "../dist/infrastructure/bedrock.js";

process.env.AWS_REGION ??= "eu-central-1";

const PFAD = new URL("../src/werte.json", import.meta.url);
const PAKETGROESSE = 20;

interface Wert {
  name: string;
  definition: string[];
  beschreibung: string[];
  kurzbeschreibung?: string;
  verwandt?: string[];
}

const daten: { werte: Wert[] } = JSON.parse(readFileSync(PFAD, "utf8"));
const namen = daten.werte.map((w) => w.name);

const systemPrompt = `Du hilfst bei einem Test, mit dem Erwachsene ihre persönlichen Werte entdecken. Sie wählen aus einer Liste von Werten diejenigen aus, die sie ansprechen.

Du bekommst einige Werte mit Definition und Beschreibung. Liefere für jeden Wert zwei Dinge:

1. "kurzbeschreibung": Ein einziger deutscher Satz mit höchstens 110 Zeichen, der erklärt, was der Wert bedeutet, für jemanden, der beim Begriff unsicher ist. Schlicht und alltagsnah, kein Fachjargon, kein Wörterbuchstil. Beschreibe, worum es einem Menschen geht, dem dieser Wert wichtig ist, zum Beispiel "Ehrlich sagen, was man denkt, und zu dem stehen, was man tut." Nicht mit dem Wert selbst beginnen und den Wert nicht mit sich selbst erklären. Keine Gedankenstriche. Kein Bezug zu Arbeit, Beruf, Kollegen, Kunden oder Büro, denn der Test wird auch für Privatleben, Partnerschaft und Ehrenamt genutzt.

2. "verwandt": Genau 5 andere Werte aus der erlaubten Liste, die jemand, dem dieser Wert wichtig ist, wahrscheinlich ebenfalls wichtig findet. Bevorzuge inhaltlich nahe Werte vor bloßen Synonymen. Nur exakte Namen aus der erlaubten Liste, keine anderen Wörter, nie der Wert selbst.

Erlaubte Werte: ${namen.join(", ")}

Antworte nur mit einem JSON-Objekt, dessen Schlüssel die Namen der Werte sind: {"Wert": {"kurzbeschreibung": "...", "verwandt": ["...", "...", "...", "...", "..."]}}`;

const auswahl = process.argv.slice(2);
const unbekannt = auswahl.filter((n) => !namen.includes(n));
if (unbekannt.length > 0) {
  console.error(`Unbekannte Werte: ${unbekannt.join(", ")}`);
  process.exit(1);
}
const zuErzeugen = auswahl.length > 0 ? daten.werte.filter((w) => auswahl.includes(w.name)) : daten.werte;

const ai = new BedrockAIService();
const pakete: Wert[][] = [];
for (let i = 0; i < zuErzeugen.length; i += PAKETGROESSE) pakete.push(zuErzeugen.slice(i, i + PAKETGROESSE));

let kosten = 0;
const ergebnisse = await Promise.all(
  pakete.map(async (paket) => {
    const userPrompt = paket
      .map((w) => `## ${w.name}\nDefinition: ${w.definition.join(" ")}\nBeschreibung: ${w.beschreibung.join(" ")}`)
      .join("\n\n");
    const antwort = await ai.invoke(systemPrompt, userPrompt, 4000);
    kosten += antwort.kosten;
    return antwort.result as Record<string, { kurzbeschreibung: string; verwandt: string[] }>;
  }),
);
const infos = Object.assign({}, ...ergebnisse);

for (const wert of zuErzeugen) {
  const info = infos[wert.name];
  if (!info) {
    console.error(`Keine Antwort für ${wert.name}`);
    continue;
  }
  wert.kurzbeschreibung = info.kurzbeschreibung;
  wert.verwandt = info.verwandt.filter((v) => v !== wert.name && namen.includes(v));
  console.log(`${wert.name}: ${wert.kurzbeschreibung}\n  → ${wert.verwandt.join(", ")}`);
}

writeFileSync(PFAD, JSON.stringify(daten, null, 2) + "\n");
console.log(`\nKosten: ${kosten.toFixed(4)} USD`);
