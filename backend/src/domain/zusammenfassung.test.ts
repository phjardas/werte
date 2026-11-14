import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AIService } from "./ai.js";
import type { Cache } from "./cache.js";
import { ZusammenfassungService } from "./zusammenfassung.js";
import { WerteService } from "./werte.js";

const TEST_WERTE = [
  { name: "Aktivität", synonyme: [], definition: [], beschreibung: ["Aktivität."] },
  { name: "Ruhe", synonyme: [], definition: [], beschreibung: ["Ruhe."] },
  { name: "Kreativität", synonyme: [], definition: [], beschreibung: ["Kreativität."] },
  { name: "Ordnung", synonyme: [], definition: [], beschreibung: ["Ordnung."] },
  { name: "Freiheit", synonyme: [], definition: [], beschreibung: ["Freiheit."] },
];

const FIVE_WERTE = ["Aktivität", "Ruhe", "Kreativität", "Ordnung", "Freiheit"];
const werteService = new WerteService(TEST_WERTE);

describe("ZusammenfassungService", () => {
  let mockAI: AIService;
  let mockCache: Cache;
  let service: ZusammenfassungService;

  beforeEach(() => {
    mockAI = { invoke: vi.fn(), invokeText: vi.fn() };
    mockCache = { get: vi.fn(), put: vi.fn(), increment: vi.fn() };
    service = new ZusammenfassungService(mockAI, mockCache, werteService);
  });

  it("returns cached result on cache hit", async () => {
    const cached = { werte: FIVE_WERTE, zusammenfassung: "cached summary" };
    vi.mocked(mockCache.get).mockResolvedValue(cached as Record<string, unknown>);

    const result = await service.getOrCreate(FIVE_WERTE);
    expect(result?.zusammenfassung).toBe("cached summary");
    expect(mockAI.invokeText).not.toHaveBeenCalled();
  });

  it("generates and caches on cache miss", async () => {
    vi.mocked(mockCache.get).mockResolvedValue(null);
    vi.mocked(mockAI.invokeText).mockResolvedValue({ result: "generated summary", kosten: 0.03 });
    vi.mocked(mockCache.put).mockResolvedValue(undefined);

    const result = await service.getOrCreate(FIVE_WERTE);
    expect(result?.zusammenfassung).toBe("generated summary");
    expect(result?.kosten).toBe(0.03);
    expect(result?.werte).toEqual(FIVE_WERTE);
    expect(mockCache.put).toHaveBeenCalledOnce();
  });

  it("returns null when AI generation fails", async () => {
    vi.mocked(mockCache.get).mockResolvedValue(null);
    vi.mocked(mockAI.invokeText).mockRejectedValue(new Error("null response from model"));

    const result = await service.getOrCreate(FIVE_WERTE);
    expect(result).toBeNull();
  });
});
