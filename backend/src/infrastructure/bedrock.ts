import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import type { AIResponse, AIService } from "../domain/ai.js";

const MODEL_ID = "eu.anthropic.claude-sonnet-4-6";

// Bedrock on-demand prices for Sonnet 4.6 via the EU cross-region profile (USD per token, net).
// Regional/geo profiles carry a 10 % premium over the global profile ($3 / $15 per MTok).
const INPUT_PRICE = 3.3 / 1_000_000;
const OUTPUT_PRICE = 16.5 / 1_000_000;
const UST = 1.19;

export function bruttoKosten(usage: { input_tokens?: number; output_tokens?: number } | undefined): number {
  const netto = (usage?.input_tokens ?? 0) * INPUT_PRICE + (usage?.output_tokens ?? 0) * OUTPUT_PRICE;
  return netto * UST;
}

export class BedrockAIService implements AIService {
  private readonly client = new BedrockRuntimeClient();

  private async invokeRaw(systemPrompt: string, userPrompt: string, maxTokens: number): Promise<AIResponse<string>> {
    const command = new InvokeModelCommand({
      modelId: MODEL_ID,
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify({
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    const res = await this.client.send(command);
    const body = JSON.parse(new TextDecoder().decode(res.body));
    const text = body.content?.[0]?.text;

    if (!text) throw new Error("null response from model");
    return { result: text, kosten: bruttoKosten(body.usage) };
  }

  async invoke(systemPrompt: string, userPrompt: string, maxTokens: number): Promise<AIResponse<unknown>> {
    const { result: text, kosten } = await this.invokeRaw(systemPrompt, userPrompt, maxTokens);
    return { result: parseJson(text), kosten };
  }

  async invokeText(systemPrompt: string, userPrompt: string, maxTokens: number): Promise<AIResponse<string>> {
    return this.invokeRaw(systemPrompt, userPrompt, maxTokens);
  }
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/```json\s*([\s\S]*?)```/);
    if (match) return JSON.parse(match[1]);
    throw new Error("invalid JSON in model response");
  }
}
