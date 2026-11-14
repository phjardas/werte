import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { ERFASSTE_RAENGE, type StatistikRepository, type StatistikRohdaten } from "../domain/statistik.js";

const PK = "werte";

/**
 * All counters live in one item: `tests` counts completed tests, and an attribute
 * `{rang}|{wert}` counts how often a value reached that rank.
 */
export class DynamoDBStatistikRepository implements StatistikRepository {
  private readonly ddb: DynamoDBDocumentClient;

  constructor(private readonly tableName: string) {
    this.ddb = DynamoDBDocumentClient.from(new DynamoDBClient());
  }

  async recordTest(werte: string[]): Promise<void> {
    const names: Record<string, string> = { "#tests": "tests" };
    const adds = ["#tests :one"];
    werte.slice(0, ERFASSTE_RAENGE).forEach((wert, i) => {
      names[`#r${i}`] = `${i + 1}|${wert}`;
      adds.push(`#r${i} :one`);
    });
    await this.ddb.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: { pk: PK },
        UpdateExpression: `ADD ${adds.join(", ")}`,
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: { ":one": 1 },
      }),
    );
  }

  async get(): Promise<StatistikRohdaten> {
    const { Item } = await this.ddb.send(new GetCommand({ TableName: this.tableName, Key: { pk: PK } }));
    const platzierungen: Record<string, number[]> = {};
    for (const [key, value] of Object.entries(Item ?? {})) {
      const match = /^(\d+)\|(.+)$/.exec(key);
      if (!match) continue;
      (platzierungen[match[2]] ??= [])[Number(match[1]) - 1] = value as number;
    }
    for (const wert of Object.keys(platzierungen)) {
      platzierungen[wert] = Array.from(platzierungen[wert], (n) => n ?? 0);
    }
    return { tests: (Item?.tests as number) ?? 0, platzierungen };
  }
}
