import { describe, expect, it } from "vitest";
import { statistikPk } from "./dynamodb-statistik.js";

describe("statistikPk", () => {
  it("keeps the existing item for beruf", () => expect(statistikPk("beruf")).toBe("werte"));
  it("uses a separate item per other context", () => expect(statistikPk("privat")).toBe("werte#privat"));
});
