import { SFNClient, StartExecutionCommand } from "@aws-sdk/client-sfn";
import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { STANDARD_KONTEXT } from "../domain/kontext.js";
import type { StatistikRepository } from "../domain/statistik.js";
import type { TestRepository, TestResult } from "../domain/test.js";
import { WerteService } from "../domain/werte.js";
import { DynamoDBStatistikRepository } from "../infrastructure/dynamodb-statistik.js";
import { DynamoDBTestRepository } from "../infrastructure/dynamodb-test.js";
import werteData from "../werte.json" with { type: "json" };
import { nurUeberCloudFront, response } from "./response.js";

export type StartPostTestFn = (input: Record<string, unknown>) => Promise<void>;

// The results feed the public statistics, so only known values without duplicates are accepted.
function isValidResults(results: unknown, werteService: WerteService): results is TestResult[] {
  if (!Array.isArray(results) || results.length === 0) return false;
  const names = results.map((r) => (r as TestResult | null)?.name);
  return names.every((n) => typeof n === "string" && werteService.has(n)) && new Set(names).size === names.length;
}

export function createHandler(
  testRepository: Pick<TestRepository, "complete">,
  statistik: Pick<StatistikRepository, "recordTest">,
  werteService: WerteService,
  startPostTest: StartPostTestFn,
) {
  return async function handler(event: Partial<APIGatewayProxyEventV2>) {
    const testId = event.pathParameters?.testId;
    if (!testId) return response(400, { error: "testId is required" });

    let body: { results?: unknown };
    try {
      body = JSON.parse(event.body ?? "null");
    } catch {
      return response(400, { error: "Invalid JSON body" });
    }

    if (!isValidResults(body?.results, werteService)) {
      return response(400, { error: "Body must include a results array of distinct known values" });
    }
    const results = body.results;

    const result = await testRepository.complete(testId, results);
    if (!result.found) return response(404, { error: "not_found" });
    if (!result.active) return response(409, { error: "test_not_active" });

    const kontext = result.session?.kontext ?? STANDARD_KONTEXT;

    // ponytail: a failed counter update loses this test for the statistics, the test itself is unaffected
    await statistik.recordTest(kontext, results.map((r) => r.name)).catch((err) => console.error("recordTest failed:", err));

    await startPostTest({
      testId,
      werte: results.slice(0, 5).map((r) => r.name),
      kontext,
    });

    return response(200, { ok: true });
  };
}

const sfn = new SFNClient({ region: "eu-central-1" });

export const handler = nurUeberCloudFront(
  createHandler(
    new DynamoDBTestRepository(process.env.DYNAMODB_TABLE!),
    new DynamoDBStatistikRepository(process.env.STATISTIK_TABLE!),
    new WerteService(werteData.werte),
    async (input) => {
      await sfn.send(
        new StartExecutionCommand({ stateMachineArn: process.env.STEP_FUNCTION_ARN, input: JSON.stringify(input) }),
      );
    },
  ),
);
