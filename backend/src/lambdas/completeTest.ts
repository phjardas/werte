import { SFNClient, StartExecutionCommand } from "@aws-sdk/client-sfn";
import type { APIGatewayProxyEventV2 } from "aws-lambda";
import type { TestRepository, TestResult } from "../domain/test.js";
import { DynamoDBTestRepository } from "../infrastructure/dynamodb-test.js";
import { response } from "./response.js";

const sfn = new SFNClient({ region: "eu-central-1" });
const STEP_FUNCTION_ARN = process.env.STEP_FUNCTION_ARN;

export function createHandler(testRepository: Pick<TestRepository, "complete">) {
  return async function handler(event: Partial<APIGatewayProxyEventV2>) {
    const testId = event.pathParameters?.testId;
    if (!testId) return response(400, { error: "testId is required" });

    let body: { results?: TestResult[] };
    try {
      body = JSON.parse(event.body ?? "null");
    } catch {
      return response(400, { error: "Invalid JSON body" });
    }

    if (!Array.isArray(body?.results)) {
      return response(400, { error: "Body must include a results array" });
    }

    const result = await testRepository.complete(testId, body.results);
    if (!result.found) return response(404, { error: "not_found" });
    if (!result.active) return response(409, { error: "test_not_active" });

    await sfn.send(
      new StartExecutionCommand({
        stateMachineArn: STEP_FUNCTION_ARN,
        input: JSON.stringify({
          testId,
          werte: body.results.slice(0, 5).map((r) => r.name),
          email: result.session?.email ?? null,
          firstName: result.session?.firstName ?? null,
          lastName: result.session?.lastName ?? null,
        }),
      }),
    );

    return response(200, { ok: true });
  };
}

export const handler = createHandler(new DynamoDBTestRepository(process.env.DYNAMODB_TABLE!));
