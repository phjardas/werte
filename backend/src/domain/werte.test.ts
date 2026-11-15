import { describe, expect, it } from "vitest";
import werteData from "../werte.json" with { type: "json" };

describe("werte.json", () => {
  it("describes every value without reference to work", () => {
    // Word starts only, so that "Zusammenarbeit" or "Verarbeitung" do not count.
    const arbeitsbezug = /\b(arbeit|beruf|kolleg|vorgesetzt|kundschaft|kunde|job\b|büro|mitarbeiter|führungskr)/i;
    const treffer = werteData.werte.filter((w) => arbeitsbezug.test(w.beschreibung.join(" "))).map((w) => w.name);
    expect(treffer).toEqual([]);
  });
});
