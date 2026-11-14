#!/usr/bin/env node
// Run from backend/ after building: node scripts/validate-szenario.js

import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import chalk from "chalk";
import { readFileSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { WerteService } from "../dist/src/domain/werte.js";
import { SzenarioService } from "../dist/src/domain/szenario.js";
import { BedrockAIService } from "../dist/src/infrastructure/bedrock.js";
import { DynamoDBCache } from "../dist/src/infrastructure/dynamodb-cache.js";

const VALIDATION_MODEL = "eu.anthropic.claude-opus-4-6-v1";

const { werte } = JSON.parse(readFileSync(new URL("../werte.json", import.meta.url), "utf-8"));
const werteService = new WerteService(werte);
const werteNames = werteService.getNames();
const szenarioService = new SzenarioService(
  new BedrockAIService(),
  new DynamoDBCache(process.env.DYNAMODB_TABLE ?? ""),
  werteService,
);

const { values: args, positionals } = parseArgs({
  options: {
    count: { type: "string", short: "n", default: "5" },
    output: { type: "string", short: "o", default: "validation-results.json" },
    help: { type: "boolean", short: "h", default: false },
  },
  allowPositionals: true,
});

if (args.help) {
  console.log(`Usage: validate-szenario.js [options] [wert1 wert2 ...]

Options:
  -n, --count <N>      Number of random pairs to validate (default: 5)
  -o, --output <file>  Output JSON file (default: validation-results.json)
  -h, --help           Show this help

Positional arguments:
  Pairs of values to validate (must be even number).
  If none given, random pairs are picked.

Examples:
  node scripts/validate-szenario.js -n 10
  node scripts/validate-szenario.js Freiheit Ordnung Kreativität Ruhe`);
  process.exit(0);
}

const bedrock = new BedrockRuntimeClient({ region: "eu-central-1" });

async function invoke(modelId, systemPrompt, userPrompt, maxTokens) {
  const res = await bedrock.send(
    new InvokeModelCommand({
      modelId,
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify({
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    }),
  );

  const body = JSON.parse(new TextDecoder().decode(res.body));
  const text = body.content?.[0]?.text;
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/```json\s*([\s\S]*?)```/);
    if (match) {
      try {
        return JSON.parse(match[1]);
      } catch {
        return null;
      }
    }
    return text;
  }
}

function pickRandomPair() {
  const a = Math.floor(Math.random() * werte.length);
  let b;
  do {
    b = Math.floor(Math.random() * werte.length);
  } while (b === a);
  return [werteNames[a], werteNames[b]];
}

function buildPairs() {
  if (positionals.length > 0) {
    if (positionals.length % 2 !== 0) {
      console.error(chalk.red("Positional arguments must be pairs (even number)."));
      process.exit(1);
    }
    const pairs = [];
    for (let i = 0; i < positionals.length; i += 2) {
      const w1 = positionals[i];
      const w2 = positionals[i + 1];
      if (!werteNames.includes(w1)) { console.error(chalk.red(`Unknown value: "${w1}"`)); process.exit(1); }
      if (!werteNames.includes(w2)) { console.error(chalk.red(`Unknown value: "${w2}"`)); process.exit(1); }
      pairs.push([w1, w2]);
    }
    return pairs;
  }

  const count = parseInt(args.count, 10);
  return Array.from({ length: count }, () => pickRandomPair());
}

const VALIDATION_SYSTEM_PROMPT = `Du bist ein Qualitätsprüfer für Quiz-Fragen eines Werte-Tests für Berufstätige. Du bekommst ein Szenario mit zwei Antwortmöglichkeiten und die zwei Werte mit ihren Beschreibungen. Deine Aufgabe: Prüfe, ob das Szenario als Quiz-Frage für eine berufstätige Person funktioniert.

**Perspektive: Beurteile aus der Sicht einer berufstätigen Person, die dieses Quiz macht – nicht aus philosophischer oder akademischer Sicht. Die Frage ist: Würde eine berufstätige Person intuitiv verstehen, welcher Wert hinter welcher Antwort steht?**

Prüfe folgende Kriterien:

1. **Wertekonflikt**: Erzeugt das Szenario eine nachvollziehbare Entscheidungssituation, in der die beiden Werte in Spannung geraten? Sind beide Optionen vertretbar? Bewerte positiv, wenn eine berufstätige Person den Konflikt intuitiv als Spannung zwischen diesen Werten verstehen würde. Bewerte negativ nur, wenn der Konflikt die Werte offensichtlich verfehlt, eine Antwort klar unverantwortlich wirkt, oder beide Antworten denselben Wert ausdrücken.
2. **Antwortzuordnung**: Würde eine berufstätige Person intuitiv verstehen, dass Antwort 1 eher Wert 1 und Antwort 2 eher Wert 2 entspricht? Bewerte positiv, wenn die Zuordnung für Laien nachvollziehbar ist. Bewerte negativ nur, wenn eine Antwort offensichtlich dem falschen Wert zugeordnet ist oder gar keinen erkennbaren Bezug zu ihrem Wert hat.
3. **Sprache**: Ist das Szenario in korrektem, natürlichem Deutsch geschrieben? Wird die lesende Person als "du" angesprochen?
4. **Zielgruppe**: Spielt das Szenario im beruflichen Kontext (Situation aus dem Arbeitsalltag) und ist es branchenübergreifend nachvollziehbar?
5. **Format**: Besteht das Szenario aus höchstens 3 Sätzen (1–2 Situationssätze + 1 "Würdest du eher…"-Frage)? Werden die Werte nicht explizit beim Namen genannt und auch keine offensichtlichen Synonyme verwendet? Hinweis: Die Antworten sind kurze Button-Beschriftungen (maximal 6 Wörter) – bewerte sie nicht als "zu knapp".

Antworte als JSON mit folgendem Format:
{
  "wertekonflikt": { "ok": true/false, "kommentar": "..." },
  "antwortzuordnung": { "ok": true/false, "kommentar": "..." },
  "sprache": { "ok": true/false, "kommentar": "..." },
  "zielgruppe": { "ok": true/false, "kommentar": "..." },
  "format": { "ok": true/false, "kommentar": "..." },
  "bestanden": true/false
}

Setze "bestanden" nur auf true, wenn alle fünf Kriterien ok sind.`;

async function validatePair(wert1, wert2, index, total) {
  const label = chalk.dim(`[${index + 1}/${total}]`) + ` ${chalk.bold(wert1)} vs ${chalk.bold(wert2)}`;
  console.log(`${label}: ${chalk.cyan("Generiere…")}`);

  let szenario;
  try {
    szenario = await szenarioService.getOrCreate(wert1, wert2, true);
  } catch (err) {
    console.error(`${label}: ${chalk.red("✗ Generierung fehlgeschlagen")}`);
    console.error(chalk.red(err.message ?? err));
    return { wert1, wert2, error: "generation_failed" };
  }
  if (!szenario) {
    console.error(`${label}: ${chalk.red("✗ Generierung fehlgeschlagen: leere Antwort")}`);
    return { wert1, wert2, error: "generation_failed" };
  }

  console.log(`${label}: ${chalk.cyan("Validiere…")}`);
  const [sortedW1, sortedW2] = szenario.werte;
  const w1Data = werteService.get(sortedW1);
  const w2Data = werteService.get(sortedW2);
  const validationPrompt = `Wert 1: "${sortedW1}"
Beschreibung: ${w1Data?.beschreibung?.slice(0, 2).join(" ") ?? ""}

Wert 2: "${sortedW2}"
Beschreibung: ${w2Data?.beschreibung?.slice(0, 2).join(" ") ?? ""}

Szenario: ${szenario.szenario}

Antwort 1: ${szenario.antworten[0]}
Antwort 2: ${szenario.antworten[1]}`;

  let validation;
  try {
    validation = await invoke(VALIDATION_MODEL, VALIDATION_SYSTEM_PROMPT, validationPrompt, 1024);
  } catch (err) {
    console.error(`${label}: ${chalk.red("✗ Validierung fehlgeschlagen")}`);
    console.error(chalk.red(err.message ?? err));
    return { wert1, wert2, szenario, error: "validation_failed" };
  }

  if (!validation) {
    console.error(`${label}: ${chalk.red("✗ Validierung fehlgeschlagen: leere Antwort")}`);
    return { wert1, wert2, szenario, error: "validation_failed" };
  }

  console.log(`${label}: ${validation.bestanden ? chalk.green("✓ BESTANDEN") : chalk.red("✗ NICHT BESTANDEN")}`);
  return { wert1, wert2, szenario, validation };
}

const pairs = buildPairs();
console.log(chalk.bold(`Validiere ${pairs.length} Paar(e)…\n`));

const results = await Promise.all(pairs.map(([w1, w2], i) => validatePair(w1, w2, i, pairs.length)));

const passed = results.filter((r) => r.validation?.bestanden).length;
const failed = results.filter((r) => r.validation && !r.validation.bestanden).length;
const errors = results.filter((r) => r.error).length;

const summary = { timestamp: new Date().toISOString(), total: results.length, passed, failed, errors, results };

writeFileSync(args.output, JSON.stringify(summary, null, 2) + "\n");

console.log(chalk.bold(`\n=== Zusammenfassung ===`));
console.log(
  `Gesamt: ${chalk.bold(results.length)} | ` +
    `Bestanden: ${chalk.green.bold(passed)} | ` +
    `Nicht bestanden: ${failed > 0 ? chalk.red.bold(failed) : chalk.bold(failed)} | ` +
    `Fehler: ${errors > 0 ? chalk.red.bold(errors) : chalk.bold(errors)}`,
);
console.log(`Ergebnisse: ${chalk.underline(args.output)}`);

process.exit(failed + errors > 0 ? 1 : 0);
