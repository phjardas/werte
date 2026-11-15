import { berechneStatistik, type StatistikRepository } from "../domain/statistik.js";
import { DynamoDBStatistikRepository } from "../infrastructure/dynamodb-statistik.js";
import { nurUeberCloudFront, response } from "./response.js";

export function createHandler(statistik: Pick<StatistikRepository, "get">) {
  return async function handler() {
    return response(200, berechneStatistik(await statistik.get()));
  };
}

export const handler = nurUeberCloudFront(createHandler(new DynamoDBStatistikRepository(process.env.STATISTIK_TABLE!)));
