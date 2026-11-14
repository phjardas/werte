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
  szenarioService: Pick<SzenarioService, "recordVote">,
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

    let vote: string;
    let version: string;
    try {
      const body = JSON.parse(event.body ?? "{}");
      vote = body.vote;
      version = body.version;
    } catch {
      return response(400, { error: "Ungültiger Request-Body." });
    }

    if (vote !== "up" && vote !== "down") {
      return response(400, { error: 'vote muss "up" oder "down" sein.' });
    }

    if (!version || typeof version !== "string") {
      return response(400, { error: "version is required." });
    }

    await szenarioService.recordVote(
      wert1,
      wert2,
      version,
      vote as "up" | "down",
    );
    return response(204, null);
  };
}

const werteService = new WerteServiceImpl(werteData.werte);
const szenarioService = new SzenarioServiceImpl(
  new BedrockAIService(),
  new DynamoDBCache(process.env.DYNAMODB_TABLE!),
  werteService,
);

export const handler = createHandler(szenarioService, werteService);
