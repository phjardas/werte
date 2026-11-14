import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import type { CompleteResult, TestRepository, TestResult, TestSession, UpdateStateResult } from "../domain/test.js";

export class DynamoDBTestRepository implements TestRepository {
  private readonly ddb: DynamoDBDocumentClient;

  constructor(private readonly tableName: string) {
    this.ddb = DynamoDBDocumentClient.from(new DynamoDBClient(), {
      marshallOptions: { removeUndefinedValues: true },
    });
  }

  async create(session: Omit<TestSession, "createdAt"> & { createdAt?: string }): Promise<void> {
    await this.ddb.send(
      new PutCommand({
        TableName: this.tableName,
        Item: { ...session, createdAt: session.createdAt ?? new Date().toISOString() },
      }),
    );
  }

  async get(testId: string): Promise<TestSession | null> {
    const { Item } = await this.ddb.send(
      new GetCommand({ TableName: this.tableName, Key: { testId } }),
    );
    return (Item as TestSession) ?? null;
  }

  async updateState(testId: string, state: unknown): Promise<UpdateStateResult> {
    try {
      await this.ddb.send(
        new UpdateCommand({
          TableName: this.tableName,
          Key: { testId },
          UpdateExpression: "SET #state = :state",
          ConditionExpression: "attribute_exists(testId) AND #status = :active",
          ExpressionAttributeNames: { "#state": "state", "#status": "status" },
          ExpressionAttributeValues: { ":state": state, ":active": "active" },
        }),
      );
      return { found: true, active: true };
    } catch (err) {
      if ((err as { name: string }).name !== "ConditionalCheckFailedException") throw err;
      const item = await this.get(testId);
      return { found: item !== null, active: false };
    }
  }

  async complete(testId: string, results: TestResult[]): Promise<CompleteResult> {
    try {
      const { Attributes } = await this.ddb.send(
        new UpdateCommand({
          TableName: this.tableName,
          Key: { testId },
          UpdateExpression:
            "SET #status = :completed, results = :results, completedAt = :completedAt, zusammenfassungStatus = :generating",
          ConditionExpression: "attribute_exists(testId) AND #status = :active",
          ExpressionAttributeNames: { "#status": "status" },
          ExpressionAttributeValues: {
            ":completed": "completed",
            ":results": results,
            ":completedAt": new Date().toISOString(),
            ":active": "active",
            ":generating": "generating",
          },
          ReturnValues: "ALL_NEW",
        }),
      );
      return { found: true, active: true, session: Attributes as TestSession };
    } catch (err) {
      if ((err as { name: string }).name !== "ConditionalCheckFailedException") throw err;
      const item = await this.get(testId);
      return { found: item !== null, active: false, session: null };
    }
  }

  async updateZusammenfassung(testId: string, zusammenfassung: string): Promise<void> {
    await this.ddb.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: { testId },
        UpdateExpression: "SET zusammenfassung = :z, zusammenfassungStatus = :completed",
        ExpressionAttributeValues: { ":z": zusammenfassung, ":completed": "completed" },
      }),
    );
  }

  async updateZusammenfassungStatus(
    testId: string,
    status: "generating" | "completed" | "failed",
  ): Promise<void> {
    await this.ddb.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: { testId },
        UpdateExpression: "SET zusammenfassungStatus = :s",
        ExpressionAttributeValues: { ":s": status },
      }),
    );
  }
}
