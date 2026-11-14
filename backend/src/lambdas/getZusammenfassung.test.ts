import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ZusammenfassungService } from "../domain/zusammenfassung.js";
import { WerteService } from "../domain/werte.js";
import { createHandler } from "./getZusammenfassung.js";

const TEST_WERTE = [
  { name: "Aktivität", synonyme: [], definition: [], beschreibung: [] },
  { name: "Ruhe", synonyme: [], definition: [], beschreibung: [] },
  { name: "Kreativität", synonyme: [], definition: [], beschreibung: [] },
  { name: "Ordnung", synonyme: [], definition: [], beschreibung: [] },
  { name: "Freiheit", synonyme: [], definition: [], beschreibung: [] },
];

const FIVE_WERTE = ["Aktivität", "Ruhe", "Kreativität", "Ordnung", "Freiheit"];
const werteService = new WerteService(TEST_WERTE);

describe("getZusammenfassung handler", () => {
  let mockGetOrCreate: ReturnType<typeof vi.fn>;
  let handler: ReturnType<typeof createHandler>;

  beforeEach(() => {
    mockGetOrCreate = vi.fn();
    handler = createHandler({ getOrCreate: mockGetOrCreate } as unknown as ZusammenfassungService, werteService);
  });

  it("returns 400 for invalid body", async () => {
    const res = await handler({ body: "not json" });
    expect(res.statusCode).toBe(400);
  });

  it("returns 400 when not exactly 5 werte", async () => {
    const res = await handler({ body: JSON.stringify({ werte: ["Aktivität"] }) });
    expect(res.statusCode).toBe(400);
  });

  it("returns 400 for unknown wert", async () => {
    const res = await handler({ body: JSON.stringify({ werte: [...FIVE_WERTE.slice(0, 4), "Unknown"] }) });
    expect(res.statusCode).toBe(400);
  });

  it("returns 200 with zusammenfassung", async () => {
    mockGetOrCreate.mockResolvedValue({ werte: FIVE_WERTE, zusammenfassung: "summary" });
    const res = await handler({ body: JSON.stringify({ werte: FIVE_WERTE }) });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).zusammenfassung).toBe("summary");
  });

  it("returns 500 when generation fails", async () => {
    mockGetOrCreate.mockResolvedValue(null);
    const res = await handler({ body: JSON.stringify({ werte: FIVE_WERTE }) });
    expect(res.statusCode).toBe(500);
  });
});
