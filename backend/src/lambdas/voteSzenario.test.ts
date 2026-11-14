import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SzenarioService } from "../domain/szenario.js";
import { WerteService } from "../domain/werte.js";
import { createHandler } from "./voteSzenario.js";

const TEST_WERTE = [
  { name: "Aktivität", synonyme: [], definition: [], beschreibung: [] },
  { name: "Ruhe", synonyme: [], definition: [], beschreibung: [] },
];

const werteService = new WerteService(TEST_WERTE);

describe("voteSzenario handler", () => {
  let mockRecordVote: ReturnType<typeof vi.fn>;
  let handler: ReturnType<typeof createHandler>;

  beforeEach(() => {
    mockRecordVote = vi.fn().mockResolvedValue(undefined);
    handler = createHandler({ recordVote: mockRecordVote } as unknown as SzenarioService, werteService);
  });

  function makeEvent(wert1: string, wert2: string, body: object) {
    return {
      pathParameters: { wert1: encodeURIComponent(wert1), wert2: encodeURIComponent(wert2) },
      body: JSON.stringify(body),
    };
  }

  it("returns 400 when parameters are missing", async () => {
    const res = await handler({ pathParameters: {} });
    expect(res.statusCode).toBe(400);
  });

  it("returns 400 for unknown wert", async () => {
    const res = await handler(makeEvent("Unknown", "Ruhe", { vote: "up", version: "v1" }));
    expect(res.statusCode).toBe(400);
  });

  it("returns 400 for invalid vote value", async () => {
    const res = await handler(makeEvent("Aktivität", "Ruhe", { vote: "maybe", version: "v1" }));
    expect(res.statusCode).toBe(400);
  });

  it("returns 400 when version is missing", async () => {
    const res = await handler(makeEvent("Aktivität", "Ruhe", { vote: "up" }));
    expect(res.statusCode).toBe(400);
  });

  it("returns 204 on successful upvote", async () => {
    const res = await handler(makeEvent("Aktivität", "Ruhe", { vote: "up", version: "abc" }));
    expect(res.statusCode).toBe(204);
    expect(mockRecordVote).toHaveBeenCalledWith("Aktivität", "Ruhe", "abc", "up");
  });
});
