import { describe, expect, it } from "vitest";
import { WerteService } from "../domain/werte.js";
import { createHandler } from "./getWerte.js";

const handler = createHandler(
  new WerteService([
    { name: "Ruhe", synonyme: [], definition: [], beschreibung: [] },
    { name: "Sexualität", synonyme: [], definition: [], beschreibung: [], kontexte: ["privat", "partnerschaft"] },
  ]),
);

const werte = (kontext?: string) =>
  JSON.parse(handler({ queryStringParameters: kontext ? { kontext } : {} }).body).werte;

describe("getWerte handler", () => {
  it("offers a restricted value only in its contexts", () => {
    expect(werte("partnerschaft")).toEqual(["Ruhe", "Sexualität"]);
    expect(werte("beruf")).toEqual(["Ruhe"]);
  });

  it("treats a missing context as the standard context", () => {
    expect(werte()).toEqual(["Ruhe"]);
  });

  it("rejects an unknown context", () => {
    expect(handler({ queryStringParameters: { kontext: "mond" } }).statusCode).toBe(400);
  });
});
