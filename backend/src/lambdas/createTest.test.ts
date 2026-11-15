import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TestRepository } from "../domain/test.js";
import { createHandler } from "./createTest.js";

describe("createTest handler", () => {
  let mockCreate: ReturnType<typeof vi.fn>;
  let handler: ReturnType<typeof createHandler>;

  beforeEach(() => {
    mockCreate = vi.fn().mockResolvedValue(undefined);
    handler = createHandler({ create: mockCreate } as unknown as TestRepository);
  });

  it("returns 201 with a testId", async () => {
    const res = await handler({});
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(typeof body.testId).toBe("string");
    expect(body.testId.length).toBeGreaterThan(0);
  });

  it("writes to repository with active status", async () => {
    await handler({});
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ status: "active" }));
  });

  it("generates unique testIds", async () => {
    const res1 = await handler({});
    const res2 = await handler({});
    expect(JSON.parse(res1.body).testId).not.toBe(JSON.parse(res2.body).testId);
  });

  it("stores the requested context", async () => {
    await handler({ body: JSON.stringify({ kontext: "privat" }) });
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ kontext: "privat" }));
  });

  it("defaults to beruf without a body", async () => {
    await handler({});
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ kontext: "beruf" }));
  });

  it("rejects an unknown context with 400", async () => {
    const res = await handler({ body: JSON.stringify({ kontext: "familie" }) });
    expect(res.statusCode).toBe(400);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("rejects invalid JSON with 400", async () => {
    const res = await handler({ body: "{" });
    expect(res.statusCode).toBe(400);
    expect(mockCreate).not.toHaveBeenCalled();
  });
});
