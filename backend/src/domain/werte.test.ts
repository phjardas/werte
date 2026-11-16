import { describe, expect, it } from "vitest";
import werteData from "../werte.json" with { type: "json" };
import { KONTEXT_IDS, type KontextId } from "./kontext.js";
import { FARBEN, type Farbe, MAX_FINALE_WERTE, WerteService } from "./werte.js";

// Word starts only, so that "Zusammenarbeit" or "Verarbeitung" do not count.
const arbeitsbezug = /\b(arbeit|beruf|kolleg|vorgesetzt|kundschaft|kunde|job\b|büro|mitarbeiter|führungskr)/i;

describe("werte.json", () => {
  it("describes every value without reference to work", () => {
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

  it("gives every value a short description without reference to work", () => {
    const fehlerhaft = werteData.werte
      .filter((w) => !("kurzbeschreibung" in w) || !w.kurzbeschreibung || w.kurzbeschreibung.length > 140 || /[–—]/.test(w.kurzbeschreibung) || arbeitsbezug.test(w.kurzbeschreibung))
      .map((w) => w.name);
    expect(fehlerhaft).toEqual([]);
  });

  it("relates every value to four to six other known values", () => {
    const namen = new Set(werteData.werte.map((w) => w.name));
    const fehlerhaft = werteData.werte
      .filter((w) => {
        const verwandt = "verwandt" in w ? w.verwandt : [];
        return (
          verwandt.length < 4 ||
          verwandt.length > 6 ||
          new Set(verwandt).size !== verwandt.length ||
          verwandt.some((v) => v === w.name || !namen.has(v))
        );
      })
      .map((w) => w.name);
    expect(fehlerhaft).toEqual([]);
  });

  it("gives every value one of the four colours", () => {
    const fehlerhaft = werteData.werte.filter((w) => !FARBEN.includes(w.farbe as Farbe)).map((w) => w.name);
    expect(fehlerhaft).toEqual([]);
  });
});
