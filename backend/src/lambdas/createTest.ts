import { randomUUID } from "node:crypto";
import type { TestRepository } from "../domain/test.js";
import { DynamoDBTestRepository } from "../infrastructure/dynamodb-test.js";
import { response } from "./response.js";

export function createHandler(testRepository: Pick<TestRepository, "create">) {
  return async function handler() {
    const testId = randomUUID();
    await testRepository.create({ testId, status: "active" });
    return response(201, { testId });
  };
}

export const handler = createHandler(new DynamoDBTestRepository(process.env.DYNAMODB_TABLE!));
