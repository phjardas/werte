import { randomUUID } from "node:crypto";
import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { parseKontext } from "../domain/kontext.js";
import type { TestRepository } from "../domain/test.js";
import { DynamoDBTestRepository } from "../infrastructure/dynamodb-test.js";
import { nurUeberCloudFront, response } from "./response.js";

export function createHandler(testRepository: Pick<TestRepository, "create">) {
  return async function handler(event: Partial<APIGatewayProxyEventV2>) {
    let body: { kontext?: unknown };
    try {
      body = JSON.parse(event.body || "{}") ?? {};
    } catch {
      return response(400, { error: "Invalid JSON body" });
    }

    const kontext = parseKontext(body.kontext);
    if (!kontext) return response(400, { error: "Unbekannter Kontext." });

    const testId = randomUUID();
    await testRepository.create({ testId, status: "active", kontext });
    return response(201, { testId });
  };
}

export const handler = nurUeberCloudFront(createHandler(new DynamoDBTestRepository(process.env.DYNAMODB_TABLE!)));
