export interface AIService {
  invoke(systemPrompt: string, userPrompt: string, maxTokens: number): Promise<unknown>;
  invokeText(systemPrompt: string, userPrompt: string, maxTokens: number): Promise<string>;
}
