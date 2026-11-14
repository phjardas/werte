import type { APIGatewayProxyEventV2 } from "aws-lambda";
import type { SzenarioService } from "../domain/szenario.js";
import type { TestRepository } from "../domain/test.js";
import { SzenarioService as SzenarioServiceImpl } from "../domain/szenario.js";
import type { WerteService } from "../domain/werte.js";
import { WerteService as WerteServiceImpl } from "../domain/werte.js";
import { BedrockAIService } from "../infrastructure/bedrock.js";
import { DynamoDBCache } from "../infrastructure/dynamodb-cache.js";
import { DynamoDBTestRepository } from "../infrastructure/dynamodb-test.js";
import werteData from "../werte.json" with { type: "json" };
import { response } from "./response.js";

export function createHandler(
  szenarioService: Pick<SzenarioService, "getOrCreate">,
  werteService: Pick<WerteService, "has">,
  testRepository: Pick<TestRepository, "setSzenarienKosten">,
) {
  return async function handler(event: Partial<APIGatewayProxyEventV2>) {
    const body = JSON.parse(event.body ?? "{}");
    const werte = Array.isArray(body.werte)
      ? (body.werte as string[]).filter((w) => werteService.has(w))
      : [];

    if (werte.length < 2) {
      return response(400, {
        error: "Mindestens 2 gültige Werte erforderlich.",
      });
    }

    const pairs: [string, string][] = [];
    for (let i = 0; i < werte.length; i++) {
      for (let j = i + 1; j < werte.length; j++) {
        pairs.push([werte[i], werte[j]]);
      }
    }

    console.log(
      JSON.stringify({ event: "prewarm_start", count: pairs.length }),
    );

    const results = await Promise.allSettled(
      pairs.map(([a, b]) => szenarioService.getOrCreate(a, b)),
    );

    const generated = results.flatMap((r) =>
      r.status === "fulfilled" && r.value ? [r.value] : [],
    );
    const succeeded = generated.length;
    const failed = pairs.length - succeeded;
    // ponytail: cache hits count with their original generation cost, so shared scenarios are counted per test.
    const kosten = generated.reduce((sum, s) => sum + s.kosten, 0);

    if (typeof body.testId === "string") {
      await testRepository.setSzenarienKosten(body.testId, kosten);
    }

    console.log(
      JSON.stringify({
        event: "prewarm_done",
        pairs: pairs.length,
        succeeded,
        failed,
        kosten,
      }),
    );

    return response(200, { pairs: pairs.length, succeeded, failed });
  };
}

const werteService = new WerteServiceImpl(werteData.werte);
const szenarioService = new SzenarioServiceImpl(
  new BedrockAIService(),
  new DynamoDBCache(process.env.DYNAMODB_TABLE!),
  werteService,
);

export const handler = createHandler(
  szenarioService,
  werteService,
  new DynamoDBTestRepository(process.env.TESTS_TABLE!),
);
