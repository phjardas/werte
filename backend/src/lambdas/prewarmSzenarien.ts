import type { APIGatewayProxyEventV2 } from "aws-lambda";
import type { SzenarioService } from "../domain/szenario.js";
import { SzenarioService as SzenarioServiceImpl } from "../domain/szenario.js";
import type { WerteService } from "../domain/werte.js";
import { WerteService as WerteServiceImpl } from "../domain/werte.js";
import { BedrockAIService } from "../infrastructure/bedrock.js";
import { DynamoDBCache } from "../infrastructure/dynamodb-cache.js";
import werteData from "../werte.json" with { type: "json" };
import { response } from "./response.js";

export function createHandler(
  szenarioService: Pick<SzenarioService, "getOrCreate">,
  werteService: Pick<WerteService, "has">,
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

    const succeeded = results.filter(
      (r) => r.status === "fulfilled" && r.value,
    ).length;
    const failed = pairs.length - succeeded;

    console.log(
      JSON.stringify({
        event: "prewarm_done",
        pairs: pairs.length,
        succeeded,
        failed,
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

export const handler = createHandler(szenarioService, werteService);
