import { describe, expect, it, vi } from "vitest";
import { BedrockAIService, bruttoKosten } from "./bedrock.js";

it("computes gross cost including 19 % VAT", () => {
  // 1M input tokens at $3 + 1M output tokens at $15 = $18 net
  expect(bruttoKosten({ input_tokens: 1_000_000, output_tokens: 1_000_000 })).toBeCloseTo(18 * 1.19);
  expect(bruttoKosten(undefined)).toBe(0);
});

describe("Tagesbudget", () => {
  const antwort = {
    body: new TextEncoder().encode(
      JSON.stringify({ content: [{ text: "Hallo" }], usage: { input_tokens: 1_000_000, output_tokens: 0 } }),
    ),
  };

  it("does not call Bedrock when the budget is used up", async () => {
    const client = { send: vi.fn() };
    const budget = { pruefen: vi.fn().mockRejectedValue(new Error("erschöpft")), buchen: vi.fn() };
    const ai = new BedrockAIService(budget, client as never);

    await expect(ai.invokeText("system", "user", 100)).rejects.toThrow("erschöpft");
    expect(client.send).not.toHaveBeenCalled();
  });

  it("books the cost of every call", async () => {
    const client = { send: vi.fn().mockResolvedValue(antwort) };
    const budget = { pruefen: vi.fn().mockResolvedValue(undefined), buchen: vi.fn().mockResolvedValue(undefined) };
    const ai = new BedrockAIService(budget, client as never);

    const { result, kosten } = await ai.invokeText("system", "user", 100);
    expect(result).toBe("Hallo");
    expect(budget.buchen).toHaveBeenCalledWith(kosten);
    expect(kosten).toBeCloseTo(3 * 1.19);
  });
});
