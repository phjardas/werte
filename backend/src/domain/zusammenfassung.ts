import { createHash } from "node:crypto";
import type { AIService } from "./ai.js";
import type { Cache } from "./cache.js";
import { KONTEXTE, type KontextId, STANDARD_KONTEXT } from "./kontext.js";
import type { Wert, WerteService } from "./werte.js";

export interface ZusammenfassungResult {
  werte: string[];
  zusammenfassung: string;
  /** Gross Bedrock cost in USD for generating this summary (also reported for cache hits). */
  kosten: number;
}

export function zusammenfassungSystemPrompt(kontextId: KontextId): string {
  const k = KONTEXTE[kontextId];
  return `Du schreibst eine persönliche Zusammenfassung für ${k.person}, die gerade einen Werte-Test gemacht hat. Sie hat ihre fünf wichtigsten Werte ermittelt, geordnet nach Priorität (der erste Wert ist der wichtigste).

## Regeln

- Die Person ist erwachsen. Beispiele und Tipps müssen zum Leben erwachsener Menschen passen.
- Schreibe in der zweiten Person ("du").
- Schreibe 3 bis 4 kurze Absätze.
- Beschreibe zuerst, was diese Wertekombination über die Person aussagt und wie sich diese Werte ${k.zusammenfassungsbereich}.
- Gehe besonders auf das Zusammenspiel der Werte ein – wie sie sich gegenseitig verstärken oder auch Spannungen erzeugen können.
- Schreibe anschließend 2–3 konkrete, alltagstaugliche Tipps, wie die Person ihre Werte aktiv in ihren ${k.alltag} einbringen kann. Die Tipps sollen praktisch und unmittelbar umsetzbar sein (${k.tippbeispiele}).
- Formuliere wertschätzend und ermutigend, aber nicht übertrieben.
- Verwende keine Aufzählungen oder Überschriften.
- Benenne die Werte beim Namen, aber baue sie natürlich in den Fließtext ein.
- Schreibe grammatikalisch korrektes, natürliches Deutsch.
- Gib nur den Text aus, ohne JSON, Markdown oder sonstige Formatierung.`;
}

function promptVersion(systemPrompt: string): string {
  return createHash("sha256").update(systemPrompt).digest("hex").slice(0, 12);
}

export class ZusammenfassungService {
  constructor(
    private readonly ai: AIService,
    private readonly cache: Cache,
    private readonly werteService: WerteService,
  ) {}

  async getOrCreate(
    werteNames: string[],
    kontext: KontextId = STANDARD_KONTEXT,
  ): Promise<ZusammenfassungResult | null> {
    const key = werteNames.join("_");
    const systemPrompt = zusammenfassungSystemPrompt(kontext);
    const version = promptVersion(systemPrompt);

    const cached = await this.cache.get(key, version);
    if (cached) {
      console.log(
        JSON.stringify({ event: "cache_hit", fn: "getZusammenfassung", key }),
      );
      return {
        werte: cached["werte"] as string[],
        zusammenfassung: cached["zusammenfassung"] as string,
        kosten: (cached["kosten"] as number | undefined) ?? 0,
      };
    }

    const werteData = werteNames.map((name) => this.werteService.get(name)!);
    const userPrompt = buildPrompt(werteData, kontext);
    const t0 = Date.now();
    let zusammenfassung: string;
    let kosten: number;
    try {
      ({ result: zusammenfassung, kosten } = await this.ai.invokeText(
        systemPrompt,
        userPrompt,
        4096,
      ));
    } catch (err) {
      console.log(
        JSON.stringify({
          event: "gen_error",
          fn: "getZusammenfassung",
          key,
          error: (err as Error).message,
          generationMs: Date.now() - t0,
        }),
      );
      return null;
    }

    const generationMs = Date.now() - t0;
    console.log(
      JSON.stringify({
        event: "cache_miss",
        fn: "getZusammenfassung",
        key,
        generationMs,
      }),
    );

    const result: ZusammenfassungResult = {
      werte: werteNames,
      zusammenfassung,
      kosten,
    };

    await this.cache.put(key, version, {
      werte: result.werte,
      zusammenfassung: result.zusammenfassung,
      kosten: result.kosten,
    });
    return result;
  }
}

function buildPrompt(werteData: Wert[], kontext: KontextId): string {
  const werteList = werteData
    .map((w, i) => {
      const desc = w.beschreibung.join("\n");
      return `### Platz ${i + 1}: "${w.name}"\n\n${desc}`;
    })
    .join("\n\n");

  return `Die folgenden fünf Werte sind die wichtigsten Werte dieser Person, geordnet nach Priorität:

${werteList}

Schreibe eine persönliche Zusammenfassung, die diese Wertekombination würdigt und beschreibt, was sie über die Person ${KONTEXTE[kontext].lebensbereich} aussagt.`;
}
