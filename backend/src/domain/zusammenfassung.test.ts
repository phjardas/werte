import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AIService } from "./ai.js";
import type { Cache } from "./cache.js";
import { KONTEXT_IDS } from "./kontext.js";
import { ZusammenfassungService, zusammenfassungSystemPrompt } from "./zusammenfassung.js";
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

  it("uses the context's system prompt and a context specific version", async () => {
    vi.mocked(mockCache.get).mockResolvedValue(null);
    vi.mocked(mockAI.invokeText).mockResolvedValue({ result: "text", kosten: 0 });

    await service.getOrCreate(FIVE_WERTE, "beruf");
    await service.getOrCreate(FIVE_WERTE, "privat");

    const [beruf, privat] = vi.mocked(mockCache.put).mock.calls;
    expect(beruf[1]).not.toBe(privat[1]);
    expect(vi.mocked(mockAI.invokeText).mock.calls[0][0]).toBe(zusammenfassungSystemPrompt("beruf"));
    expect(vi.mocked(mockAI.invokeText).mock.calls[1][0]).toBe(zusammenfassungSystemPrompt("privat"));
  });

  it("addresses an adult in every context", () => {
    for (const id of KONTEXT_IDS) expect(zusammenfassungSystemPrompt(id)).toContain("Die Person ist erwachsen.");
  });

  it("asks for the summary in the context's area of life", async () => {
    vi.mocked(mockCache.get).mockResolvedValue(null);
    vi.mocked(mockAI.invokeText).mockResolvedValue({ result: "text", kosten: 0 });

    await service.getOrCreate(FIVE_WERTE, "privat");
    expect(vi.mocked(mockAI.invokeText).mock.calls[0][1]).not.toContain("Berufsleben");
  });
});
