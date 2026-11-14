import { beforeEach, describe, expect, it, vi } from "vitest";
import { WerteService } from "../domain/werte.js";
import { createHandler } from "./completeTest.js";

const werteService = new WerteService(
  ["Freiheit", "Mut", "Ruhe"].map((name) => ({ name, synonyme: [], definition: [], beschreibung: [] })),
);

describe("completeTest handler", () => {
  let complete: ReturnType<typeof vi.fn>;
  let recordTest: ReturnType<typeof vi.fn>;
  let startPostTest: ReturnType<typeof vi.fn>;
  let handler: ReturnType<typeof createHandler>;

  const call = (results: unknown) =>
    handler({ pathParameters: { testId: "abc" }, body: JSON.stringify({ results }) });

  beforeEach(() => {
    complete = vi.fn().mockResolvedValue({ found: true, active: true, session: { firstName: "Max" } });
    recordTest = vi.fn().mockResolvedValue(undefined);
    startPostTest = vi.fn().mockResolvedValue(undefined);
    handler = createHandler({ complete }, { recordTest }, werteService, startPostTest);
  });

  it("records the ranked values and starts the post-test workflow", async () => {
    const res = await call([{ name: "Mut", score: 3 }, { name: "Freiheit", score: 2 }]);
    expect(res.statusCode).toBe(200);
    expect(recordTest).toHaveBeenCalledWith(["Mut", "Freiheit"]);
    expect(startPostTest).toHaveBeenCalledWith(expect.objectContaining({ testId: "abc", werte: ["Mut", "Freiheit"] }));
  });

  it.each([
    ["unknown values", [{ name: "Bosheit", score: 1 }]],
    ["duplicates", [{ name: "Mut", score: 1 }, { name: "Mut", score: 1 }]],
    ["an empty array", []],
    ["a missing array", undefined],
  ])("rejects %s", async (_, results) => {
    const res = await call(results);
    expect(res.statusCode).toBe(400);
    expect(complete).not.toHaveBeenCalled();
  });

  it("does not count a test that was already completed", async () => {
    complete.mockResolvedValue({ found: true, active: false, session: null });
    const res = await call([{ name: "Mut", score: 1 }]);
    expect(res.statusCode).toBe(409);
    expect(recordTest).not.toHaveBeenCalled();
  });

  it("still completes the test when the statistics update fails", async () => {
    recordTest.mockRejectedValue(new Error("boom"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await call([{ name: "Mut", score: 1 }]);
    expect(res.statusCode).toBe(200);
    expect(startPostTest).toHaveBeenCalled();
  });
});
