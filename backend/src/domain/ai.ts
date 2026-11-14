export interface AIResponse<T> {
  result: T;
  /** Gross Bedrock cost of this call in USD, including 19 % VAT. */
  kosten: number;
}

export interface AIService {
  invoke(systemPrompt: string, userPrompt: string, maxTokens: number): Promise<AIResponse<unknown>>;
  invokeText(systemPrompt: string, userPrompt: string, maxTokens: number): Promise<AIResponse<string>>;
}
