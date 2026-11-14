import { InvokeCommand, LambdaClient } from "@aws-sdk/client-lambda";
import type { APIGatewayProxyEventV2 } from "aws-lambda";
import type { TestRepository, TestResult } from "../domain/test.js";
import { DynamoDBTestRepository } from "../infrastructure/dynamodb-test.js";
import { response } from "./response.js";

export type ZusammenfassungTriggerFn = (testId: string, werte: string[]) => Promise<void>;

export function createHandler(
  testRepository: Pick<TestRepository, "get" | "updateZusammenfassungStatus">,
  triggerZusammenfassung?: ZusammenfassungTriggerFn,
) {
  return async function handler(event: Partial<APIGatewayProxyEventV2>) {
    const testId = event.pathParameters?.testId;

    if (!testId) return response(400, { error: "testId is required" });

    const item = await testRepository.get(testId);
    if (!item) return response(404, { error: "not_found" });

    let zusammenfassungStatus = item.zusammenfassungStatus ?? null;

    // Old sessions (pre-status-tracking) that completed but never got a summary
    const needsRecovery =
      item.status === "completed" &&
      !item.zusammenfassung &&
      !item.zusammenfassungStatus &&
      Array.isArray(item.results) &&
      item.results.length > 0 &&
      triggerZusammenfassung != null;

    if (needsRecovery) {
      const werte = (item.results as TestResult[]).slice(0, 5).map((r) => r.name);
      await testRepository.updateZusammenfassungStatus(testId, "generating");
      zusammenfassungStatus = "generating";
      await triggerZusammenfassung!(testId, werte).catch((err) =>
        console.error(JSON.stringify({ event: "zusammenfassung_recovery_error", testId, error: String(err) })),
      );
    }

    return response(200, {
      testId: item.testId,
      status: item.status,
      state: item.state ?? null,
      results: item.results ?? null,
      zusammenfassung: item.zusammenfassung ?? null,
      zusammenfassungStatus,
      emailGesendet: item.emailGesendetAm != null,
    });
  };
}

function createZusammenfassungTrigger(functionName: string): ZusammenfassungTriggerFn {
  const lambda = new LambdaClient({});
  return async (testId: string, werte: string[]) => {
    console.log(JSON.stringify({ event: "zusammenfassung_recovery_trigger", testId }));
    await lambda.send(
      new InvokeCommand({
        FunctionName: functionName,
        InvocationType: "Event",
        Payload: Buffer.from(JSON.stringify({ testId, werte })),
      }),
    );
  };
}

const triggerZusammenfassung = process.env.GENERATE_ZUSAMMENFASSUNG_FUNCTION_NAME
  ? createZusammenfassungTrigger(process.env.GENERATE_ZUSAMMENFASSUNG_FUNCTION_NAME)
  : undefined;

export const handler = createHandler(
  new DynamoDBTestRepository(process.env.DYNAMODB_TABLE!),
  triggerZusammenfassung,
);
