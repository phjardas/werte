import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { KONTEXT_IDS, parseKontext } from "../domain/kontext.js";
import { berechneStatistik, type StatistikRepository, summiereRohdaten } from "../domain/statistik.js";
import { DynamoDBStatistikRepository } from "../infrastructure/dynamodb-statistik.js";
import { nurUeberCloudFront, response } from "./response.js";

/** Without ?kontext= the statistic covers all contexts. */
export function createHandler(statistik: Pick<StatistikRepository, "get">) {
  return async function handler(event: Partial<APIGatewayProxyEventV2>) {
    const parameter = event.queryStringParameters?.kontext;
    if (parameter === undefined) {
      const alle = await Promise.all(KONTEXT_IDS.map((k) => statistik.get(k)));
      return response(200, berechneStatistik(summiereRohdaten(alle)));
    }

    const kontext = parseKontext(parameter);
    if (!kontext) return response(400, { error: "Unbekannter Kontext." });
    return response(200, berechneStatistik(await statistik.get(kontext)));
  };
}

export const handler = nurUeberCloudFront(createHandler(new DynamoDBStatistikRepository(process.env.STATISTIK_TABLE!)));
