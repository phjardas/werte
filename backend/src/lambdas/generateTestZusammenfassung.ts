import type { TestRepository } from "../domain/test.js";
import { WerteService } from "../domain/werte.js";
import type { ZusammenfassungService } from "../domain/zusammenfassung.js";
import { ZusammenfassungService as ZusammenfassungServiceImpl } from "../domain/zusammenfassung.js";
import { BedrockAIService } from "../infrastructure/bedrock.js";
import { DynamoDBCache } from "../infrastructure/dynamodb-cache.js";
import { DynamoDBTestRepository } from "../infrastructure/dynamodb-test.js";
import werteData from "../werte.json" with { type: "json" };

interface StepFunctionEvent {
  testId: string;
  werte: string[];
}

export function createHandler(
  zusammenfassungService: Pick<ZusammenfassungService, "getOrCreate">,
  testRepository: Pick<TestRepository, "updateZusammenfassung">,
) {
  return async function handler(event: StepFunctionEvent) {
    const { testId, werte } = event;

    const result = await zusammenfassungService.getOrCreate(werte);

    if (!result) {
      throw new Error(`Failed to generate Zusammenfassung for testId=${testId}`);
    }

    await testRepository.updateZusammenfassung(testId, result.zusammenfassung);

    return event;
  };
}

const werteService = new WerteService(werteData.werte);
const zusammenfassungService = new ZusammenfassungServiceImpl(
  new BedrockAIService(),
  new DynamoDBCache(process.env.DYNAMODB_TABLE!),
  werteService,
);

export const handler = createHandler(
  zusammenfassungService,
  new DynamoDBTestRepository(process.env.TESTS_TABLE!),
);
