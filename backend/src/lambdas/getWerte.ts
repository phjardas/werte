import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { parseKontext } from "../domain/kontext.js";
import { WerteService } from "../domain/werte.js";
import werteData from "../werte.json" with { type: "json" };
import { nurUeberCloudFront, response } from "./response.js";

export function createHandler(werteService: Pick<WerteService, "getAngebot">) {
  return (event: Partial<APIGatewayProxyEventV2>) => {
    const kontext = parseKontext(event.queryStringParameters?.kontext);
    if (!kontext) return response(400, { error: "Unbekannter Kontext." });
    return response(200, { werte: werteService.getAngebot(kontext) });
  };
}

export const handler = nurUeberCloudFront(createHandler(new WerteService(werteData.werte)));
