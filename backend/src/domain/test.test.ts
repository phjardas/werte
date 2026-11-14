import { describe, expect, it } from "vitest";
import { ablaufTtl, istAbgelaufen } from "./test.js";

describe("ablaufTtl", () => {
  it("is 12 months after createdAt, in seconds", () => {
    expect(ablaufTtl("2026-11-14T10:00:00.000Z")).toBe(Date.parse("2027-11-14T10:00:00.000Z") / 1000);
  });
});

describe("istAbgelaufen", () => {
  const ttl = Date.parse("2027-11-14T10:00:00.000Z") / 1000;

  it("is false without ttl", () => {
    expect(istAbgelaufen({})).toBe(false);
  });

  it("is false before and true from the expiry on", () => {
    expect(istAbgelaufen({ ttl }, ttl * 1000 - 1)).toBe(false);
    expect(istAbgelaufen({ ttl }, ttl * 1000)).toBe(true);
  });
});
