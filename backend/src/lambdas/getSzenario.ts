import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { parseKontext } from "../domain/kontext.js";
import type { SzenarioService } from "../domain/szenario.js";
import { SzenarioService as SzenarioServiceImpl } from "../domain/szenario.js";
import type { WerteService } from "../domain/werte.js";
import { WerteService as WerteServiceImpl } from "../domain/werte.js";
import { BedrockAIService } from "../infrastructure/bedrock.js";
import { tagesbudgetAusUmgebung } from "../infrastructure/dynamodb-budget.js";
import { DynamoDBCache } from "../infrastructure/dynamodb-cache.js";
import werteData from "../werte.json" with { type: "json" };
import { nurUeberCloudFront, response } from "./response.js";

export function createHandler(
  szenarioService: Pick<SzenarioService, "getOrCreate">,
  werteService: Pick<WerteService, "has">,
) {
  return async function handler(event: Partial<APIGatewayProxyEventV2>) {
    const wert1 = decodeURIComponent(event.pathParameters?.wert1 ?? "");
    const wert2 = decodeURIComponent(event.pathParameters?.wert2 ?? "");

    if (!wert1 || !wert2)
      return response(400, { error: "Beide Werte sind erforderlich." });

    if (!werteService.has(wert1) || !werteService.has(wert2)) {
      const unknown = !werteService.has(wert1) ? wert1 : wert2;
      return response(400, { error: `Unbekannter Wert: "${unknown}".` });
    }

    const kontext = parseKontext(event.queryStringParameters?.kontext);
    if (!kontext) return response(400, { error: "Unbekannter Kontext." });

    const result = await szenarioService.getOrCreate(wert1, wert2, kontext);
    if (!result)
      return response(500, {
        error: "Szenario konnte nicht generiert werden.",
      });

    return response(200, result);
  };
}

const werteService = new WerteServiceImpl(werteData.werte);
const szenarioService = new SzenarioServiceImpl(
  new BedrockAIService(tagesbudgetAusUmgebung()),
  new DynamoDBCache(process.env.DYNAMODB_TABLE!),
  werteService,
);

export const handler = nurUeberCloudFront(createHandler(szenarioService, werteService));
