import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SzenarioService } from "../domain/szenario.js";
import type { TestRepository } from "../domain/test.js";
import { WerteService } from "../domain/werte.js";
import { createHandler } from "./prewarmSzenarien.js";

const werteService = new WerteService(
  ["Aktivität", "Ruhe", "Ordnung"].map((name) => ({ name, synonyme: [], definition: [], beschreibung: [] })),
);

describe("prewarmSzenarien handler", () => {
  let mockGetOrCreate: ReturnType<typeof vi.fn>;
  let handler: ReturnType<typeof createHandler>;

  beforeEach(() => {
    mockGetOrCreate = vi.fn().mockResolvedValue({ kosten: 0.01 });
    handler = createHandler(
      { getOrCreate: mockGetOrCreate } as unknown as SzenarioService,
      werteService,
      { setSzenarienKosten: vi.fn().mockResolvedValue(undefined) } as unknown as TestRepository,
    );
  });

  it("generates all pairs in the given context", async () => {
    await handler({ body: JSON.stringify({ testId: "t", werte: ["Aktivität", "Ruhe", "Ordnung"], kontext: "privat" }) });
    expect(mockGetOrCreate).toHaveBeenCalledTimes(3);
    for (const call of mockGetOrCreate.mock.calls) expect(call[2]).toBe("privat");
  });

  it("defaults to beruf when the payload has no context", async () => {
    await handler({ body: JSON.stringify({ testId: "t", werte: ["Aktivität", "Ruhe"] }) });
    expect(mockGetOrCreate).toHaveBeenCalledWith("Aktivität", "Ruhe", "beruf");
  });

  it("falls back to beruf for an unknown context", async () => {
    await handler({ body: JSON.stringify({ testId: "t", werte: ["Aktivität", "Ruhe"], kontext: "x" }) });
    expect(mockGetOrCreate).toHaveBeenCalledWith("Aktivität", "Ruhe", "beruf");
  });
});
