import { createHash } from "node:crypto";
import type { AIService } from "./ai.js";
import type { Cache } from "./cache.js";
import type { Wert, WerteService } from "./werte.js";

export interface SzenarioResult {
  werte: [string, string];
  szenario: string;
  antworten: [string, string];
  version: string;
  /** Gross Bedrock cost in USD for generating this scenario (also reported for cache hits). */
  kosten: number;
}

export const SZENARIO_SYSTEM_PROMPT = `Du erstellst Quiz-Fragen für Berufstätige. Jede Frage beschreibt eine konkrete Situation aus dem Arbeitsalltag, in der zwei Werte miteinander in Konflikt geraten. Die Person muss sich für eine von zwei Handlungen entscheiden, die jeweils einem der beiden Werte entspricht.

## Aufbau

Das Szenario besteht aus 2–3 kurzen Sätzen:
1. **Situation** (1–2 kurze Sätze): Eine konkrete Szene aus dem Arbeitsalltag (z.B. mit Kolleginnen und Kollegen, im Team, mit Vorgesetzten, Kundschaft oder Geschäftspartnern).
2. **Frage** (1 Satz): "Würdest du eher … oder …?"

Maximal 3 Sätze insgesamt. Keine Einleitung, keine Erklärung, keine Moral, kein zusätzlicher Kontext.

## Regeln

- Die Szene muss im beruflichen Kontext spielen – nicht im Privat- oder Familienleben. Sie soll für Berufstätige in ganz unterschiedlichen Branchen und Rollen nachvollziehbar sein; vermeide Fachjargon und branchenspezifische Details.
- Beide Optionen müssen vernünftig und vertretbar sein. Keine Option darf offensichtlich falsch, unverantwortlich oder realitätsfern wirken. Eine berufstätige Person muss beide Optionen ernsthaft in Betracht ziehen können.
- Die beiden Antworten müssen sich in der **Handlung** klar unterscheiden – nicht nur in der Nuance oder Formulierung. Wenn beide Antworten im Kern dasselbe tun, fehlt der echte Konflikt.
- Der Konflikt muss **spezifisch** für die beiden genannten Werte sein. Teste gedanklich: Könnte dasselbe Szenario auch für ein anderes Wertepaar stehen? Dann ist es zu generisch. Stütze dich auf die Werte-Beschreibungen, um den **Kern** jedes Wertes zu treffen – nicht eine oberflächliche oder verwandte Bedeutung.
- Jede Antwort muss den Kern des zugeordneten Wertes widerspiegeln – nicht einen verwandten oder ähnlich klingenden Wert. Frage dich: Würde eine berufstätige Person intuitiv erkennen, welcher Wert hinter welcher Antwort steht?
- Wenn sich zwei Werte stark ähneln (z.B. Ausdauer/Fleiß, Aktivität/Leidenschaft), fokussiere auf den feinen Unterschied laut den Beschreibungen.
- Benenne die Werte nicht explizit und verwende auch keine Synonyme, Ableitungen oder offensichtlichen Umschreibungen – weder im Szenario noch in den Antworten. Beispiel: Bei "Nachhaltigkeit" nicht "nachhaltig", "ressourcenschonend" oder "umweltfreundlich" schreiben. Bei "Konsequenz" nicht "konsequent" verwenden. Bei "Präsenz" nicht "im Moment leben". Der Konflikt soll sich rein aus der Handlung ergeben.
- Verwende weder Belohnung noch Bestrafung.
- Schreibe grammatikalisch korrektes, natürliches Deutsch. Vermeide verschachtelte Nebensätze.
- Formuliere alles durchgehend mit "du" (nicht "ihr", "man" oder "Sie").

## Ausgabeformat

Gib die Antwort als JSON-Dokument aus mit folgenden Feldern:
- \`gedanke\`: Beantworte folgende Fragen in 4–6 Sätzen, BEVOR du das Szenario formulierst (dieses Feld wird nicht angezeigt, sondern dient der Qualitätssicherung):
  1. Was bedeutet Wert 1 laut seiner Beschreibung konkret? Mit welchem ähnlichen Wert könnte er verwechselt werden?
  2. Was bedeutet Wert 2 laut seiner Beschreibung konkret? Mit welchem ähnlichen Wert könnte er verwechselt werden?
  3. Worin liegt der Kernunterschied zwischen den beiden Werten? Welche Situation aus dem Arbeitsalltag erzwingt eine Wahl genau zwischen diesen beiden Werten (und keinem anderen Wertepaar)?
  4. Passt Antwort 1 ausschließlich zu Wert 1? Passt Antwort 2 ausschließlich zu Wert 2?
- \`szenario\`: Der Text des Szenarios (2–3 Sätze).
- \`antworten\`: Array mit genau zwei Strings – kurze Beschriftungen für zwei Buttons (maximal 6 Wörter pro Antwort). **Wichtig: Die erste Antwort muss immer Wert 1 entsprechen, die zweite Antwort immer Wert 2 – in exakt dieser Reihenfolge.**

## Beispiel

Eingabe:
- Wert 1: "Aktivität"
- Wert 2: "Ruhe"

\`\`\`json
{
  "gedanke": "Aktivität bedeutet aktives Handeln und Bewegung (verwechselbar mit Fleiß). Ruhe bedeutet bewusstes Innehalten und Stille (verwechselbar mit Gelassenheit). Der Kernunterschied: Aktivität drängt zur Bewegung, Ruhe zum Verweilen. Wer nach einem anstrengenden Projekt eine freie Stunde hat, muss zwischen Anpacken und Durchatmen wählen – das passt nur zu Aktivität vs. Ruhe. Antwort 1 (nächstes Thema anstoßen) ist ausschließlich Aktivität, Antwort 2 (Pause machen) ist ausschließlich Ruhe.",
  "szenario": "Dein Team hat gerade ein großes Projekt abgeschlossen und du hast unerwartet eine Stunde ohne Termine. Würdest du eher direkt das nächste Thema anstoßen, oder die Stunde für eine ruhige Pause nutzen?",
  "antworten": ["Nächstes Thema direkt anstoßen", "Eine ruhige Pause machen"]
}
\`\`\`

In diesem Beispiel entspricht "Nächstes Thema direkt anstoßen" dem Wert 1 ("Aktivität") und "Eine ruhige Pause machen" dem Wert 2 ("Ruhe").`;

export class SzenarioService {
  constructor(
    private readonly ai: AIService,
    private readonly cache: Cache,
    private readonly werteService: WerteService,
  ) {}

  get systemPrompt(): string {
    return SZENARIO_SYSTEM_PROMPT;
  }

  buildUserPrompt(wert1: Wert, wert2: Wert): string {
    return buildUserPrompt(wert1, wert2);
  }

  async getOrCreate(wert1Name: string, wert2Name: string, skipCache = false): Promise<SzenarioResult | null> {
    const sorted = [wert1Name, wert2Name].sort() as [string, string];
    const w1 = this.werteService.get(sorted[0])!;
    const w2 = this.werteService.get(sorted[1])!;
    const userPrompt = buildUserPrompt(w1, w2);
    const version = computeVersion(userPrompt);
    const pk = sorted.join("_");

    if (!skipCache) {
      const cached = await this.cache.get(pk, version);
      if (cached) {
        console.log(JSON.stringify({ event: "cache_hit", fn: "getSzenario", key: pk }));
        return {
          werte: cached["werte"] as [string, string],
          szenario: cached["szenario"] as string,
          antworten: cached["antworten"] as [string, string],
          version,
          kosten: (cached["kosten"] as number | undefined) ?? 0,
        };
      }
    }

    const t0 = Date.now();
    let generated: { szenario: string; antworten: [string, string] };
    let kosten: number;
    try {
      const res = await this.ai.invoke(SZENARIO_SYSTEM_PROMPT, userPrompt, 1024);
      generated = res.result as typeof generated;
      kosten = res.kosten;
    } catch (err) {
      console.log(JSON.stringify({ event: "gen_error", fn: "getSzenario", key: pk, error: (err as Error).message, generationMs: Date.now() - t0 }));
      return null;
    }

    const generationMs = Date.now() - t0;
    console.log(JSON.stringify({ event: "cache_miss", fn: "getSzenario", key: pk, generationMs }));

    const result: SzenarioResult = {
      werte: sorted,
      szenario: generated.szenario,
      antworten: generated.antworten,
      version,
      kosten,
    };

    if (!skipCache) {
      await this.cache.put(pk, version, {
        werte: result.werte,
        szenario: result.szenario,
        antworten: result.antworten,
        kosten: result.kosten,
      });
    }

    return result;
  }

  async recordVote(wert1Name: string, wert2Name: string, version: string, direction: "up" | "down"): Promise<void> {
    const pk = [wert1Name, wert2Name].sort().join("_");
    const field = direction === "up" ? "upvotes" : "downvotes";
    await this.cache.increment(pk, version, field);
  }
}

function computeVersion(userPrompt: string): string {
  return createHash("sha256")
    .update(SZENARIO_SYSTEM_PROMPT)
    .update(userPrompt)
    .digest("hex")
    .slice(0, 12);
}

function buildUserPrompt(wert1: Wert, wert2: Wert): string {
  return `Erstelle ein Szenario, in dem Wert 1 ("${wert1.name}") und Wert 2 ("${wert2.name}") in Konflikt geraten. Antwort 1 muss "${wert1.name}" entsprechen, Antwort 2 muss "${wert2.name}" entsprechen.

## Wert 1: "${wert1.name}"

${wert1.beschreibung.join("\n")}

## Wert 2: "${wert2.name}"

${wert2.beschreibung.join("\n")}`.trim();
}
