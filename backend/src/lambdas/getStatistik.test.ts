import { beforeEach, describe, expect, it, vi } from "vitest";
import type { StatistikRohdaten } from "../domain/statistik.js";
import { createHandler } from "./getStatistik.js";

const ROH: Record<string, StatistikRohdaten> = {
  beruf: { tests: 2, platzierungen: { Mut: [2] } },
  privat: { tests: 1, platzierungen: { Ruhe: [1] } },
};

describe("getStatistik handler", () => {
  let get: ReturnType<typeof vi.fn>;
  let handler: ReturnType<typeof createHandler>;

  beforeEach(() => {
    get = vi.fn(async (kontext: string) => ROH[kontext] ?? { tests: 0, platzierungen: {} });
    handler = createHandler({ get });
  });

  it("returns one context's statistic", async () => {
    const res = await handler({ queryStringParameters: { kontext: "privat" } });
    expect(get).toHaveBeenCalledTimes(1);
    expect(get).toHaveBeenCalledWith("privat");
    const body = JSON.parse(res.body);
    expect(body.tests).toBe(1);
    expect(body.rangliste.map((e: { name: string }) => e.name)).toEqual(["Ruhe"]);
  });

  it("returns the sum over all contexts without query string", async () => {
    const res = await handler({});
    expect(get).toHaveBeenCalledWith("beruf");
    expect(get).toHaveBeenCalledWith("privat");
    const body = JSON.parse(res.body);
    expect(body.tests).toBe(3);
    expect(body.rangliste.map((e: { name: string }) => e.name)).toEqual(["Mut", "Ruhe"]);
  });

  it("rejects an unknown context with 400", async () => {
    const res = await handler({ queryStringParameters: { kontext: "x" } });
    expect(res.statusCode).toBe(400);
  });
});
