import { InvokeCommand, LambdaClient } from "@aws-sdk/client-lambda";
import type { APIGatewayProxyEventV2 } from "aws-lambda";
import type { TestRepository } from "../domain/test.js";
import { DynamoDBTestRepository } from "../infrastructure/dynamodb-test.js";
import { response } from "./response.js";

export type PrewarmerFn = (testId: string, werte: string[]) => Promise<void>;

function extractFinalValues(state: unknown): string[] | null {
  if (typeof state !== "object" || state === null) return null;
  const s = state as Record<string, unknown>;
  if (s.step !== "comparison-intro") return null;
  if (!Array.isArray(s.finalValues) || s.finalValues.length < 2) return null;
  const values = s.finalValues.filter((v): v is string => typeof v === "string");
  return values.length >= 2 ? values : null;
}

export function createHandler(
  testRepository: Pick<TestRepository, "updateState">,
  prewarm?: PrewarmerFn,
) {
  return async function handler(event: Partial<APIGatewayProxyEventV2>) {
    const testId = event.pathParameters?.testId;
    if (!testId) return response(400, { error: "testId is required" });

    let state: unknown;
    try {
      state = JSON.parse(event.body ?? "null");
    } catch {
      return response(400, { error: "Invalid JSON body" });
    }

    if (state === null || typeof state !== "object") {
      return response(400, { error: "Body must be a JSON object" });
    }

    const result = await testRepository.updateState(testId, state);
    if (!result.found) return response(404, { error: "not_found" });
    if (!result.active) return response(409, { error: "test_not_active" });

    const finalValues = extractFinalValues(state);
    if (finalValues && prewarm) {
      // Await the async invocation — it returns immediately (Event type), not when prewarming finishes
      await prewarm(testId, finalValues).catch((err) =>
        console.error(JSON.stringify({ event: "prewarm_trigger_error", error: String(err) })),
      );
    }

    return response(200, { ok: true });
  };
}

function createPrewarmer(functionName: string): PrewarmerFn {
  const lambda = new LambdaClient({});
  return async (testId: string, werte: string[]) => {
    console.log(JSON.stringify({ event: "prewarm_trigger", werte_count: werte.length }));
    await lambda.send(
      new InvokeCommand({
        FunctionName: functionName,
        InvocationType: "Event",
        Payload: Buffer.from(JSON.stringify({ body: JSON.stringify({ testId, werte }) })),
      }),
    );
  };
}

const prewarm = process.env.PREWARM_FUNCTION_NAME
  ? createPrewarmer(process.env.PREWARM_FUNCTION_NAME)
  : undefined;

export const handler = createHandler(
  new DynamoDBTestRepository(process.env.DYNAMODB_TABLE!),
  prewarm,
);
