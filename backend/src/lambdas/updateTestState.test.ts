import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TestRepository } from "../domain/test.js";
import { createHandler } from "./updateTestState.js";

describe("updateTestState handler", () => {
  let mockUpdateState: ReturnType<typeof vi.fn>;
  let mockPrewarm: ReturnType<typeof vi.fn>;
  let handler: ReturnType<typeof createHandler>;

  beforeEach(() => {
    mockUpdateState = vi.fn();
    mockPrewarm = vi.fn().mockResolvedValue(undefined);
    handler = createHandler(
      { updateState: mockUpdateState } as unknown as TestRepository,
      mockPrewarm,
    );
  });

  it("returns 400 when testId is missing", async () => {
    const res = await handler({ pathParameters: {} });
    expect(res.statusCode).toBe(400);
  });

  it("returns 400 for invalid JSON", async () => {
    const res = await handler({ pathParameters: { testId: "abc" }, body: "not json" });
    expect(res.statusCode).toBe(400);
  });

  it("returns 400 when body is not an object", async () => {
    const res = await handler({ pathParameters: { testId: "abc" }, body: JSON.stringify(null) });
    expect(res.statusCode).toBe(400);
  });

  it("returns 404 when test not found", async () => {
    mockUpdateState.mockResolvedValue({ found: false, active: false });
    const res = await handler({ pathParameters: { testId: "abc" }, body: JSON.stringify({ step: 1 }) });
    expect(res.statusCode).toBe(404);
  });

  it("returns 409 when test is not active", async () => {
    mockUpdateState.mockResolvedValue({ found: true, active: false });
    const res = await handler({ pathParameters: { testId: "abc" }, body: JSON.stringify({ step: 1 }) });
    expect(res.statusCode).toBe(409);
  });

  it("returns 200 on success", async () => {
    mockUpdateState.mockResolvedValue({ found: true, active: true });
    const res = await handler({ pathParameters: { testId: "abc" }, body: JSON.stringify({ step: 1 }) });
    expect(res.statusCode).toBe(200);
  });

  describe("prewarming", () => {
    const successState = { found: true, active: true };
    const comparisonIntroState = {
      step: "comparison-intro",
      finalValues: ["Freiheit", "Mut", "Liebe"],
      selectedValues: ["Freiheit", "Mut", "Liebe"],
    };

    it("triggers prewarm when step is comparison-intro with finalValues", async () => {
      mockUpdateState.mockResolvedValue(successState);
      const res = await handler({
        pathParameters: { testId: "abc" },
        body: JSON.stringify(comparisonIntroState),
      });
      expect(res.statusCode).toBe(200);
      expect(mockPrewarm).toHaveBeenCalledWith("abc", comparisonIntroState.finalValues);
    });

    it("does not trigger prewarm for other steps", async () => {
      mockUpdateState.mockResolvedValue(successState);
      await handler({
        pathParameters: { testId: "abc" },
        body: JSON.stringify({ step: "selection", finalValues: ["Freiheit", "Mut", "Liebe"] }),
      });
      expect(mockPrewarm).not.toHaveBeenCalled();
    });

    it("does not trigger prewarm when finalValues is empty", async () => {
      mockUpdateState.mockResolvedValue(successState);
      await handler({
        pathParameters: { testId: "abc" },
        body: JSON.stringify({ step: "comparison-intro", finalValues: [] }),
      });
      expect(mockPrewarm).not.toHaveBeenCalled();
    });

    it("does not trigger prewarm when finalValues has fewer than 2 entries", async () => {
      mockUpdateState.mockResolvedValue(successState);
      await handler({
        pathParameters: { testId: "abc" },
        body: JSON.stringify({ step: "comparison-intro", finalValues: ["Freiheit"] }),
      });
      expect(mockPrewarm).not.toHaveBeenCalled();
    });

    it("does not trigger prewarm for more than 10 distinct finalValues", async () => {
      mockUpdateState.mockResolvedValue(successState);
      const finalValues = Array.from({ length: 11 }, (_, i) => `Wert ${i}`);
      const res = await handler({
        pathParameters: { testId: "abc" },
        body: JSON.stringify({ step: "comparison-intro", finalValues }),
      });
      expect(res.statusCode).toBe(200);
      expect(mockPrewarm).not.toHaveBeenCalled();
    });

    it("removes duplicate finalValues before prewarming", async () => {
      mockUpdateState.mockResolvedValue(successState);
      await handler({
        pathParameters: { testId: "abc" },
        body: JSON.stringify({ step: "comparison-intro", finalValues: ["Mut", "Mut", "Liebe"] }),
      });
      expect(mockPrewarm).toHaveBeenCalledWith("abc", ["Mut", "Liebe"]);
    });

    it("still returns 200 if prewarm fails", async () => {
      mockUpdateState.mockResolvedValue(successState);
      mockPrewarm.mockRejectedValue(new Error("Lambda error"));
      const res = await handler({
        pathParameters: { testId: "abc" },
        body: JSON.stringify(comparisonIntroState),
      });
      expect(res.statusCode).toBe(200);
    });
  });
});
