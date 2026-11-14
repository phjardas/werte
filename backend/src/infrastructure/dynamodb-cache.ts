import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import type { Cache } from "../domain/cache.js";

export class DynamoDBCache implements Cache {
  private readonly ddb: DynamoDBDocumentClient;

  constructor(private readonly tableName: string) {
    this.ddb = DynamoDBDocumentClient.from(new DynamoDBClient());
  }

  async get(pk: string, version: string): Promise<Record<string, unknown> | null> {
    const { Item } = await this.ddb.send(
      new GetCommand({ TableName: this.tableName, Key: { pk, version } }),
    );
    return (Item as Record<string, unknown>) ?? null;
  }

  async put(pk: string, version: string, data: Record<string, unknown>): Promise<void> {
    await this.ddb.send(
      new PutCommand({
        TableName: this.tableName,
        Item: { pk, version, ...data, createdAt: new Date().toISOString() },
      }),
    );
  }

  async increment(pk: string, version: string, field: string): Promise<void> {
    await this.ddb.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: { pk, version },
        UpdateExpression: "ADD #field :inc",
        ExpressionAttributeNames: { "#field": field },
        ExpressionAttributeValues: { ":inc": 1 },
      }),
    );
  }
}
