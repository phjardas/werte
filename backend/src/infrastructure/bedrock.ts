import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import type { AIService } from "../domain/ai.js";

const MODEL_ID = "eu.anthropic.claude-sonnet-4-6";

export class BedrockAIService implements AIService {
  private readonly client = new BedrockRuntimeClient();

  private async invokeRaw(systemPrompt: string, userPrompt: string, maxTokens: number): Promise<string> {
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
    return text;
  }

  async invoke(systemPrompt: string, userPrompt: string, maxTokens: number): Promise<unknown> {
    const text = await this.invokeRaw(systemPrompt, userPrompt, maxTokens);
    try {
      return JSON.parse(text);
    } catch {
      const match = text.match(/```json\s*([\s\S]*?)```/);
      if (match) return JSON.parse(match[1]);
      throw new Error("invalid JSON in model response");
    }
  }

  async invokeText(systemPrompt: string, userPrompt: string, maxTokens: number): Promise<string> {
    return this.invokeRaw(systemPrompt, userPrompt, maxTokens);
  }
}
