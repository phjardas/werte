import type { APIGatewayProxyEventV2 } from "aws-lambda";
import type { WerteService } from "../domain/werte.js";
import { WerteService as WerteServiceImpl } from "../domain/werte.js";
import type { ZusammenfassungService } from "../domain/zusammenfassung.js";
import { ZusammenfassungService as ZusammenfassungServiceImpl } from "../domain/zusammenfassung.js";
import { BedrockAIService } from "../infrastructure/bedrock.js";
import { DynamoDBCache } from "../infrastructure/dynamodb-cache.js";
import werteData from "../werte.json" with { type: "json" };
import { response } from "./response.js";

export function createHandler(
  zusammenfassungService: Pick<ZusammenfassungService, "getOrCreate">,
  werteService: Pick<WerteService, "has">,
) {
  return async function handler(event: Partial<APIGatewayProxyEventV2>) {
    let body: { werte?: unknown };
    try {
      body = JSON.parse(event.body ?? "null");
    } catch {
      return response(400, { error: "Invalid JSON body" });
    }

    const werteNames = body?.werte;
    if (!Array.isArray(werteNames) || werteNames.length !== 5) {
      return response(400, { error: "Genau 5 Werte sind erforderlich." });
    }

    const missing = (werteNames as string[]).find(
      (name) => !werteService.has(name),
    );
    if (missing)
      return response(400, { error: `Unbekannter Wert: "${missing}".` });

    const result = await zusammenfassungService.getOrCreate(
      werteNames as string[],
    );
    if (!result)
      return response(500, {
        error: "Zusammenfassung konnte nicht generiert werden.",
      });

    return response(200, result);
  };
}

const werteService = new WerteServiceImpl(werteData.werte);
const zusammenfassungService = new ZusammenfassungServiceImpl(
  new BedrockAIService(),
  new DynamoDBCache(process.env.DYNAMODB_TABLE!),
  werteService,
);

export const handler = createHandler(zusammenfassungService, werteService);
