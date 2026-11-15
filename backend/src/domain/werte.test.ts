import { describe, expect, it } from "vitest";
import werteData from "../werte.json" with { type: "json" };
import { KONTEXT_IDS, type KontextId } from "./kontext.js";
import { MAX_FINALE_WERTE, WerteService } from "./werte.js";

describe("werte.json", () => {
  it("describes every value without reference to work", () => {
    // Word starts only, so that "Zusammenarbeit" or "Verarbeitung" do not count.
    const arbeitsbezug = /\b(arbeit|beruf|kolleg|vorgesetzt|kundschaft|kunde|job\b|büro|mitarbeiter|führungskr)/i;
    const treffer = werteData.werte.filter((w) => arbeitsbezug.test(w.beschreibung.join(" "))).map((w) => w.name);
    expect(treffer).toEqual([]);
  });

  it("restricts values only to known contexts", () => {
    const unbekannt = werteData.werte.flatMap((w) =>
      ("kontexte" in w ? w.kontexte : []).filter((k) => !KONTEXT_IDS.includes(k as KontextId)).map((k) => `${w.name}: ${k}`),
    );
    expect(unbekannt).toEqual([]);
  });

  it("offers enough values in every context", () => {
    const service = new WerteService(werteData.werte);
    for (const kontext of KONTEXT_IDS) expect(service.getNames(kontext).length).toBeGreaterThan(10 * MAX_FINALE_WERTE);
  });
});
