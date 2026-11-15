import { describe, expect, it } from "vitest";
import { KONTEXT_IDS, KONTEXTE, parseKontext } from "./kontext.js";

describe("parseKontext", () => {
  it("parses missing values as beruf", () => {
    expect(parseKontext(undefined)).toBe("beruf");
    expect(parseKontext(null)).toBe("beruf");
    expect(parseKontext("")).toBe("beruf");
  });

  it("accepts known ids", () => {
    expect(parseKontext("privat")).toBe("privat");
    expect(parseKontext("beruf")).toBe("beruf");
    expect(parseKontext("fuehrung")).toBe("fuehrung");
    expect(parseKontext("ehrenamt")).toBe("ehrenamt");
    expect(parseKontext("partnerschaft")).toBe("partnerschaft");
  });

  it("rejects unknown ids", () => {
    expect(parseKontext("familie")).toBeNull();
    expect(parseKontext(42)).toBeNull();
    expect(parseKontext("toString")).toBeNull();
  });
});

describe("KONTEXTE", () => {
  it("has an entry for every id", () => {
    for (const id of KONTEXT_IDS) expect(KONTEXTE[id].id).toBe(id);
  });

  it("names the person so that both templates stay grammatical", () => {
    // The summary template says "für {person}, die … Sie hat ihre …" and the scenario template
    // uses it in the nominative, so the form must be feminine and the same in both cases.
    for (const id of KONTEXT_IDS) expect(KONTEXTE[id].person).toMatch(/^eine /);
  });
});
