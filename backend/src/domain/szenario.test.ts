import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AIService } from "./ai.js";
import type { Cache } from "./cache.js";
import { KONTEXTE } from "./kontext.js";
import { SzenarioService, szenarioSystemPrompt } from "./szenario.js";
import { WerteService } from "./werte.js";

const TEST_WERTE = [
  {
    name: "Aktivität",
    synonyme: ["Bewegung"],
    definition: ["Freude an körperlicher Bewegung."],
    beschreibung: ["Aktivität bedeutet, den Körper in Bewegung zu halten."],
  },
  {
    name: "Ruhe",
    synonyme: ["Stille"],
    definition: ["Das Bedürfnis nach Stille und Erholung."],
    beschreibung: ["Ruhe bedeutet, sich Zeit für Erholung zu nehmen."],
  },
  {
    name: "Kreativität",
    synonyme: ["Schöpferkraft"],
    definition: ["Freude am Erschaffen."],
    beschreibung: ["Kreativität bedeutet, neue Ideen zu entwickeln."],
  },
  {
    name: "Ordnung",
    synonyme: ["Struktur"],
    definition: ["Das Bedürfnis nach Struktur."],
    beschreibung: ["Ordnung bedeutet, Struktur im Alltag zu haben."],
  },
  {
    name: "Freiheit",
    synonyme: ["Unabhängigkeit"],
    definition: ["Das Streben nach Unabhängigkeit."],
    beschreibung: ["Freiheit bedeutet, eigene Entscheidungen zu treffen."],
  },
];

const werteService = new WerteService(TEST_WERTE);

describe("SzenarioService", () => {
  let mockAI: AIService;
  let mockCache: Cache;
  let service: SzenarioService;

  beforeEach(() => {
    mockAI = { invoke: vi.fn() };
    mockCache = { get: vi.fn(), put: vi.fn(), increment: vi.fn() };
    service = new SzenarioService(mockAI, mockCache, werteService);
  });

  describe("getOrCreate", () => {
    it("returns cached result on cache hit", async () => {
      const cached = { werte: ["Aktivität", "Ruhe"], szenario: "cached", antworten: ["a", "b"], kosten: 0.02 };
      vi.mocked(mockCache.get).mockResolvedValue(cached as Record<string, unknown>);

      const result = await service.getOrCreate("Aktivität", "Ruhe");
      expect(result?.szenario).toBe("cached");
      expect(result?.kosten).toBe(0.02);
      expect(result?.version).toBeDefined();
      expect(mockAI.invoke).not.toHaveBeenCalled();
    });

    it("generates and caches on cache miss", async () => {
      vi.mocked(mockCache.get).mockResolvedValue(null);
      vi.mocked(mockAI.invoke).mockResolvedValue({ result: { szenario: "generated", antworten: ["x", "y"] }, kosten: 0.01 });
      vi.mocked(mockCache.put).mockResolvedValue(undefined);

      const result = await service.getOrCreate("Aktivität", "Ruhe");
      expect(result?.szenario).toBe("generated");
      expect(result?.werte).toEqual(["Aktivität", "Ruhe"]);
      expect(result?.version).toBeDefined();
      expect(result?.kosten).toBe(0.01);
      expect(mockCache.put).toHaveBeenCalledWith("Aktivität_Ruhe", expect.any(String), expect.objectContaining({ kosten: 0.01 }));
    });

    it("sorts value pair before caching", async () => {
      vi.mocked(mockCache.get).mockResolvedValue(null);
      vi.mocked(mockAI.invoke).mockResolvedValue({ result: { szenario: "s", antworten: ["a", "b"] }, kosten: 0.01 });
      vi.mocked(mockCache.put).mockResolvedValue(undefined);

      const result = await service.getOrCreate("Ruhe", "Aktivität");
      expect(result?.werte).toEqual(["Aktivität", "Ruhe"]);
      const [pk] = vi.mocked(mockCache.get).mock.calls[0];
      expect(pk).toBe("Aktivität_Ruhe");
    });

    it("returns null when AI generation fails", async () => {
      vi.mocked(mockCache.get).mockResolvedValue(null);
      vi.mocked(mockAI.invoke).mockRejectedValue(new Error("null response from model"));

      const result = await service.getOrCreate("Aktivität", "Ruhe");
      expect(result).toBeNull();
      expect(mockCache.put).not.toHaveBeenCalled();
    });

    it("skips cache when skipCache is true", async () => {
      vi.mocked(mockAI.invoke).mockResolvedValue({ result: { szenario: "fresh", antworten: ["a", "b"] }, kosten: 0.01 });
      vi.mocked(mockCache.put).mockResolvedValue(undefined);

      await service.getOrCreate("Aktivität", "Ruhe", "beruf", true);
      expect(mockCache.get).not.toHaveBeenCalled();
      expect(mockCache.put).not.toHaveBeenCalled();
    });
  });

  describe("contexts", () => {
    it("renders a context specific system prompt", () => {
      const beruf = szenarioSystemPrompt("beruf");
      const privat = szenarioSystemPrompt("privat");
      expect(beruf).toContain(KONTEXTE.beruf.zielgruppe);
      expect(privat).toContain(KONTEXTE.privat.abgrenzung);
      expect(privat).not.toContain("Arbeitsalltag");
    });

    it("uses a different cache version per context for the same pair", async () => {
      vi.mocked(mockCache.get).mockResolvedValue(null);
      vi.mocked(mockAI.invoke).mockResolvedValue({ result: { szenario: "s", antworten: ["a", "b"] }, kosten: 0 });

      const beruf = await service.getOrCreate("Aktivität", "Ruhe", "beruf");
      const privat = await service.getOrCreate("Aktivität", "Ruhe", "privat");

      expect(beruf?.version).not.toBe(privat?.version);
      const [berufPut, privatPut] = vi.mocked(mockCache.put).mock.calls;
      expect(berufPut[0]).toBe(privatPut[0]);
      expect(vi.mocked(mockAI.invoke).mock.calls[1][0]).toBe(szenarioSystemPrompt("privat"));
    });

    it("defaults to beruf", async () => {
      vi.mocked(mockCache.get).mockResolvedValue(null);
      vi.mocked(mockAI.invoke).mockResolvedValue({ result: { szenario: "s", antworten: ["a", "b"] }, kosten: 0 });

      await service.getOrCreate("Aktivität", "Ruhe");
      expect(vi.mocked(mockAI.invoke).mock.calls[0][0]).toBe(szenarioSystemPrompt("beruf"));
    });
  });

  describe("recordVote", () => {
    it("increments upvotes field", async () => {
      vi.mocked(mockCache.increment).mockResolvedValue(undefined);
      await service.recordVote("Aktivität", "Ruhe", "abc123", "up");

      expect(mockCache.increment).toHaveBeenCalledWith("Aktivität_Ruhe", "abc123", "upvotes");
    });

    it("increments downvotes field", async () => {
      vi.mocked(mockCache.increment).mockResolvedValue(undefined);
      await service.recordVote("Ruhe", "Aktivität", "xyz789", "down");

      expect(mockCache.increment).toHaveBeenCalledWith("Aktivität_Ruhe", "xyz789", "downvotes");
    });
  });
});
