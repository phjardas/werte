import { expect, it } from "vitest";
import { bruttoKosten } from "./bedrock.js";

it("computes gross cost including 19 % VAT", () => {
  // 1M input tokens at $3.30 + 1M output tokens at $16.50 = $19.80 net
  expect(bruttoKosten({ input_tokens: 1_000_000, output_tokens: 1_000_000 })).toBeCloseTo(19.8 * 1.19);
  expect(bruttoKosten(undefined)).toBe(0);
});
