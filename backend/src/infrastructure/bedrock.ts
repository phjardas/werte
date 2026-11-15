import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import type { AIResponse, AIService } from "../domain/ai.js";

const MODEL_ID = "eu.anthropic.claude-sonnet-4-6";

// Bedrock on-demand prices for Sonnet 4.6 (USD per token, net): $3 / $15 per MTok.
const INPUT_PRICE = 3 / 1_000_000;
const OUTPUT_PRICE = 15 / 1_000_000;
const UST = 1.19;

export function bruttoKosten(usage: { input_tokens?: number; output_tokens?: number } | undefined): number {
  const netto = (usage?.input_tokens ?? 0) * INPUT_PRICE + (usage?.output_tokens ?? 0) * OUTPUT_PRICE;
  return netto * UST;
}

/** Caps the Bedrock spend per day, see `DynamoDBTagesbudget`. */
export interface Tagesbudget {
  /** Throws when today's budget is used up. */
  pruefen(): Promise<void>;
  buchen(kosten: number): Promise<void>;
}

export class BedrockAIService implements AIService {
  constructor(
    private readonly budget?: Tagesbudget,
    private readonly client: Pick<BedrockRuntimeClient, "send"> = new BedrockRuntimeClient(),
  ) {}

  private async invokeRaw(systemPrompt: string, userPrompt: string, maxTokens: number): Promise<AIResponse<string>> {
    await this.budget?.pruefen();

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
    const kosten = bruttoKosten(body.usage);
    // ponytail: parallel calls all pass pruefen() before any of them books, so a day can overshoot by
    // (reserved concurrency × max cost per call). Fine at a few cents per call.
    await this.budget?.buchen(kosten);
    const text = body.content?.[0]?.text;

    if (!text) throw new Error("null response from model");
    return { result: text, kosten };
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
