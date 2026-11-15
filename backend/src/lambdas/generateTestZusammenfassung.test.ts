import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ZusammenfassungService } from "../domain/zusammenfassung.js";
import type { TestRepository } from "../domain/test.js";
import { createHandler } from "./generateTestZusammenfassung.js";

describe("generateTestZusammenfassung handler", () => {
  let getOrCreate: ReturnType<typeof vi.fn>;
  let handler: ReturnType<typeof createHandler>;
  const werte = ["Mut", "Ruhe", "Freiheit", "Liebe", "Ordnung"];

  beforeEach(() => {
    getOrCreate = vi.fn().mockResolvedValue({ werte, zusammenfassung: "z", kosten: 0.01 });
    handler = createHandler(
      { getOrCreate } as unknown as ZusammenfassungService,
      { updateZusammenfassung: vi.fn().mockResolvedValue(undefined) } as unknown as TestRepository,
    );
  });

  it("passes the context to the service", async () => {
    await handler({ testId: "t", werte, kontext: "privat" });
    expect(getOrCreate).toHaveBeenCalledWith(werte, "privat");
  });

  it("defaults to beruf for events without context", async () => {
    await handler({ testId: "t", werte });
    expect(getOrCreate).toHaveBeenCalledWith(werte, "beruf");
  });
});
