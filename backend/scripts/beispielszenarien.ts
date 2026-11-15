// Generates sample scenarios and one summary for a context, straight from Bedrock and without cache,
// so new prompt texts can be reviewed before they go live.
//
//   pnpm beispielszenarien <kontext> [anzahl] [Wert1:Wert2 ...]
//
// Uses the local AWS credentials, e.g. AWS_PROFILE=phjardas pnpm beispielszenarien privat.
// The daily budget is not checked or booked.
import type { Cache } from "../dist/domain/cache.js";
import { parseKontext } from "../dist/domain/kontext.js";
import { SzenarioService } from "../dist/domain/szenario.js";
import { WerteService } from "../dist/domain/werte.js";
import { ZusammenfassungService } from "../dist/domain/zusammenfassung.js";
import { BedrockAIService } from "../dist/infrastructure/bedrock.js";
import werteData from "../dist/werte.json" with { type: "json" };

// Values whose descriptions referred to work before they were rewritten. Half of the random pairs use one.
const ARBEITSNAHE_WERTE = [
  "Autonomie", "Balance", "Leistung", "Loyalität", "Familie", "Fokus",
  "Ruhe", "Sinnhaftigkeit", "Stabilität", "Wohlstand", "Gleichberechtigung", "Menschlichkeit",
];

process.env.AWS_REGION ??= "eu-central-1";

const [kontextArg, ...rest] = process.argv.slice(2);
const kontext = kontextArg ? parseKontext(kontextArg) : null;
if (!kontext) {
  console.error(`Unbekannter oder fehlender Kontext: ${kontextArg ?? ""}`);
  console.error("Aufruf: pnpm beispielszenarien <kontext> [anzahl] [Wert1:Wert2 ...]");
  process.exit(1);
}

const werteService = new WerteService(werteData.werte);
const namen = werteService.getNames();
const zufall = <T>(liste: readonly T[]): T => liste[Math.floor(Math.random() * liste.length)];

const explizit = rest.filter((a) => a.includes(":")).map((a) => a.split(":") as [string, string]);
for (const wert of explizit.flat()) {
  if (!werteService.has(wert)) {
    console.error(`Unbekannter Wert: ${wert}`);
    process.exit(1);
  }
}
const anzahl = Number(rest.find((a) => /^\d+$/.test(a)) ?? 12);

const paare: [string, string][] = [...explizit];
while (explizit.length === 0 && paare.length < anzahl) {
  const a = paare.length % 2 === 0 ? zufall(ARBEITSNAHE_WERTE.filter((w) => werteService.has(w))) : zufall(namen);
  const b = zufall(namen);
  if (a !== b) paare.push([a, b]);
}

const keinCache: Cache = { get: async () => null, put: async () => {}, increment: async () => {} };
const ai = new BedrockAIService();
const szenarien = new SzenarioService(ai, keinCache, werteService);
const zusammenfassungen = new ZusammenfassungService(ai, keinCache, werteService);

let kosten = 0;
const ergebnisse = await Promise.all(paare.map(([a, b]) => szenarien.getOrCreate(a, b, kontext, true)));
for (const [i, s] of ergebnisse.entries()) {
  console.log(`\n## ${paare[i][0]} vs. ${paare[i][1]}`);
  if (!s) {
    console.log("(Generierung fehlgeschlagen)");
    continue;
  }
  kosten += s.kosten;
  console.log(s.szenario);
  console.log(`  1) ${s.antworten[0]}   (${s.werte[0]})`);
  console.log(`  2) ${s.antworten[1]}   (${s.werte[1]})`);
}

const top5 = [...namen].sort(() => Math.random() - 0.5).slice(0, 5);
const z = await zusammenfassungen.getOrCreate(top5, kontext);
console.log(`\n## Zusammenfassung für ${top5.join(", ")}\n`);
console.log(z?.zusammenfassung ?? "(Generierung fehlgeschlagen)");
kosten += z?.kosten ?? 0;

console.log(`\nKosten: ${kosten.toFixed(4)} USD`);
