import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SzenarioService } from "../domain/szenario.js";
import { WerteService } from "../domain/werte.js";
import { createHandler } from "./getSzenario.js";

const TEST_WERTE = [
  { name: "Aktivität", synonyme: [], definition: [], beschreibung: [] },
  { name: "Ruhe", synonyme: [], definition: [], beschreibung: [] },
];

const werteService = new WerteService(TEST_WERTE);

describe("getSzenario handler", () => {
  let mockGetOrCreate: ReturnType<typeof vi.fn>;
  let handler: ReturnType<typeof createHandler>;

  beforeEach(() => {
    mockGetOrCreate = vi.fn();
    const mockService = { getOrCreate: mockGetOrCreate } as unknown as SzenarioService;
    handler = createHandler(mockService, werteService);
  });

  function makeEvent(wert1: string, wert2: string) {
    return { pathParameters: { wert1: encodeURIComponent(wert1), wert2: encodeURIComponent(wert2) } };
  }

  it("returns 400 when parameters are missing", async () => {
    const res = await handler({ pathParameters: {} });
    expect(res.statusCode).toBe(400);
  });

  it("returns 400 for unknown werte", async () => {
    const res = await handler(makeEvent("Unknown", "Ruhe"));
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error).toContain("Unknown");
  });

  it("returns 200 with generated szenario", async () => {
    const szenario = { werte: ["Aktivität", "Ruhe"] as [string, string], szenario: "test", antworten: ["a", "b"] as [string, string], version: "v1" };
    mockGetOrCreate.mockResolvedValue(szenario);

    const res = await handler(makeEvent("Aktivität", "Ruhe"));
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual(szenario);
  });

  it("returns 500 when generation fails", async () => {
    mockGetOrCreate.mockResolvedValue(null);
    const res = await handler(makeEvent("Aktivität", "Ruhe"));
    expect(res.statusCode).toBe(500);
  });

  it("passes both werte to service", async () => {
    mockGetOrCreate.mockResolvedValue({ werte: ["Aktivität", "Ruhe"] as [string, string], szenario: "s", antworten: ["a", "b"] as [string, string], version: "v1" });
    await handler(makeEvent("Ruhe", "Aktivität"));
    expect(mockGetOrCreate).toHaveBeenCalledWith("Ruhe", "Aktivität", "beruf");
  });

  it("passes the context from the query string", async () => {
    mockGetOrCreate.mockResolvedValue({ werte: ["Aktivität", "Ruhe"], szenario: "s", antworten: ["a", "b"], version: "v" });
    await handler({ ...makeEvent("Aktivität", "Ruhe"), queryStringParameters: { kontext: "privat" } });
    expect(mockGetOrCreate).toHaveBeenCalledWith("Aktivität", "Ruhe", "privat");
  });

  it("defaults to beruf without query string", async () => {
    mockGetOrCreate.mockResolvedValue({ werte: ["Aktivität", "Ruhe"], szenario: "s", antworten: ["a", "b"], version: "v" });
    await handler(makeEvent("Aktivität", "Ruhe"));
    expect(mockGetOrCreate).toHaveBeenCalledWith("Aktivität", "Ruhe", "beruf");
  });

  it("rejects an unknown context with 400", async () => {
    const res = await handler({ ...makeEvent("Aktivität", "Ruhe"), queryStringParameters: { kontext: "x" } });
    expect(res.statusCode).toBe(400);
    expect(mockGetOrCreate).not.toHaveBeenCalled();
  });
});
