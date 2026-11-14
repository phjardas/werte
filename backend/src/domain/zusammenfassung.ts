import { createHash } from "node:crypto";
import type { AIService } from "./ai.js";
import type { Cache } from "./cache.js";
import type { Wert, WerteService } from "./werte.js";

export interface ZusammenfassungResult {
  werte: string[];
  zusammenfassung: string;
}

const ZUSAMMENFASSUNG_SYSTEM_PROMPT = `Du schreibst eine persönliche Zusammenfassung für eine berufstätige Person, die gerade einen Werte-Test gemacht hat. Sie hat ihre fünf wichtigsten Werte ermittelt, geordnet nach Priorität (der erste Wert ist der wichtigste).

## Regeln

- Schreibe in der zweiten Person ("du").
- Schreibe 3 bis 4 kurze Absätze.
- Beschreibe zuerst, was diese Wertekombination über die Person aussagt und wie sich diese Werte im Berufsalltag zeigen könnten, etwa in der Zusammenarbeit, bei Entscheidungen oder im Umgang mit Druck.
- Gehe besonders auf das Zusammenspiel der Werte ein – wie sie sich gegenseitig verstärken oder auch Spannungen erzeugen können.
- Schreibe anschließend 2–3 konkrete, alltagstaugliche Tipps, wie die Person ihre Werte aktiv in ihren Arbeitsalltag einbringen kann. Die Tipps sollen praktisch und unmittelbar umsetzbar sein (z.B. Gesprächsimpulse im Team, Prioritäten bei Entscheidungen, kleine Arbeitsgewohnheiten).
- Formuliere wertschätzend und ermutigend, aber nicht übertrieben.
- Verwende keine Aufzählungen oder Überschriften.
- Benenne die Werte beim Namen, aber baue sie natürlich in den Fließtext ein.
- Schreibe grammatikalisch korrektes, natürliches Deutsch.
- Gib nur den Text aus, ohne JSON, Markdown oder sonstige Formatierung.`;

const PROMPT_VERSION = createHash("sha256")
  .update(ZUSAMMENFASSUNG_SYSTEM_PROMPT)
  .digest("hex")
  .slice(0, 12);

export class ZusammenfassungService {
  constructor(
    private readonly ai: AIService,
    private readonly cache: Cache,
    private readonly werteService: WerteService,
  ) {}

  async getOrCreate(
    werteNames: string[],
  ): Promise<ZusammenfassungResult | null> {
    const key = werteNames.join("_");
    const version = PROMPT_VERSION;

    const cached = await this.cache.get(key, version);
    if (cached) {
      console.log(
        JSON.stringify({ event: "cache_hit", fn: "getZusammenfassung", key }),
      );
      return {
        werte: cached["werte"] as string[],
        zusammenfassung: cached["zusammenfassung"] as string,
      };
    }

    const werteData = werteNames.map((name) => this.werteService.get(name)!);
    const userPrompt = buildPrompt(werteData);
    const t0 = Date.now();
    let zusammenfassung: string;
    try {
      zusammenfassung = await this.ai.invokeText(
        ZUSAMMENFASSUNG_SYSTEM_PROMPT,
        userPrompt,
        4096,
      );
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
    };

    await this.cache.put(key, version, {
      werte: result.werte,
      zusammenfassung: result.zusammenfassung,
    });
    return result;
  }
}

function buildPrompt(werteData: Wert[]): string {
  const werteList = werteData
    .map((w, i) => {
      const desc = w.beschreibung.join("\n");
      return `### Platz ${i + 1}: "${w.name}"\n\n${desc}`;
    })
    .join("\n\n");

  return `Die folgenden fünf Werte sind die wichtigsten Werte dieser Person, geordnet nach Priorität:

${werteList}

Schreibe eine persönliche Zusammenfassung, die diese Wertekombination würdigt und beschreibt, was sie über die Person im Berufsleben aussagt.`;
}
