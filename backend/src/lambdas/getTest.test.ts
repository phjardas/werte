import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TestRepository } from "../domain/test.js";
import type { ZusammenfassungTriggerFn } from "./getTest.js";
import { createHandler } from "./getTest.js";

describe("getTest handler", () => {
  let mockGet: ReturnType<typeof vi.fn>;
  let mockUpdateZusammenfassungStatus: ReturnType<typeof vi.fn>;
  let mockTrigger: ZusammenfassungTriggerFn;
  let handler: ReturnType<typeof createHandler>;

  beforeEach(() => {
    mockGet = vi.fn();
    mockUpdateZusammenfassungStatus = vi.fn().mockResolvedValue(undefined);
    mockTrigger = vi.fn().mockResolvedValue(undefined);
    handler = createHandler(
      { get: mockGet, updateZusammenfassungStatus: mockUpdateZusammenfassungStatus } as unknown as TestRepository,
      mockTrigger,
    );
  });

  it("returns 400 when testId is missing", async () => {
    const res = await handler({ pathParameters: {} });
    expect(res.statusCode).toBe(400);
  });

  it("returns the expiry date derived from ttl", async () => {
    mockGet.mockResolvedValue({ testId: "abc", status: "active", ttl: Date.parse("2027-11-14T10:00:00.000Z") / 1000 });
    const res = await handler({ pathParameters: { testId: "abc" } });
    expect(JSON.parse(res.body).ablaufAm).toBe("2027-11-14T10:00:00.000Z");
  });

  it("returns 404 when test not found", async () => {
    mockGet.mockResolvedValue(null);
    const res = await handler({ pathParameters: { testId: "abc" } });
    expect(res.statusCode).toBe(404);
  });

  it("returns 200 with test data including zusammenfassungStatus", async () => {
    mockGet.mockResolvedValue({
      testId: "abc",
      status: "completed",
      state: null,
      results: [{ name: "Freiheit", score: 10 }],
      zusammenfassung: "Eine tolle Zusammenfassung",
      zusammenfassungStatus: "completed",
      createdAt: "2024-01-01",
    });
    const res = await handler({ pathParameters: { testId: "abc" } });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.testId).toBe("abc");
    expect(body.zusammenfassungStatus).toBe("completed");
  });

  it("triggers recovery for old completed session without summary or status", async () => {
    mockGet.mockResolvedValue({
      testId: "old-test",
      status: "completed",
      results: [
        { name: "Freiheit", score: 10 },
        { name: "Liebe", score: 9 },
        { name: "Mut", score: 8 },
        { name: "Vertrauen", score: 7 },
        { name: "Ehrlichkeit", score: 6 },
      ],
      createdAt: "2024-01-01",
    });

    const res = await handler({ pathParameters: { testId: "old-test" } });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.zusammenfassungStatus).toBe("generating");
    expect(mockUpdateZusammenfassungStatus).toHaveBeenCalledWith("old-test", "generating");
    expect(mockTrigger).toHaveBeenCalledWith(
      "old-test",
      ["Freiheit", "Liebe", "Mut", "Vertrauen", "Ehrlichkeit"],
    );
  });

  it("does not trigger recovery when zusammenfassungStatus is already set", async () => {
    mockGet.mockResolvedValue({
      testId: "failed-test",
      status: "completed",
      results: [{ name: "Freiheit", score: 10 }],
      zusammenfassungStatus: "failed",
      createdAt: "2024-01-01",
    });

    const res = await handler({ pathParameters: { testId: "failed-test" } });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.zusammenfassungStatus).toBe("failed");
    expect(mockTrigger).not.toHaveBeenCalled();
  });

  it("does not trigger recovery for active sessions", async () => {
    mockGet.mockResolvedValue({
      testId: "active-test",
      status: "active",
      results: null,
      createdAt: "2024-01-01",
    });

    const res = await handler({ pathParameters: { testId: "active-test" } });
    expect(res.statusCode).toBe(200);
    expect(mockTrigger).not.toHaveBeenCalled();
  });
});
