import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import type { Tagesbudget } from "./bedrock.js";

export class BudgetErschoepftError extends Error {
  constructor(verbraucht: number, limit: number) {
    super(`Bedrock-Tagesbudget erschöpft: ${verbraucht.toFixed(2)} von ${limit} USD`);
  }
}

/**
 * Sums the gross Bedrock cost per UTC day in the statistics table (`pk = "budget#2026-11-15"`)
 * and refuses further calls once the limit is reached. This is the hard cap against denial of
 * wallet; rate limits only slow an attacker down.
 */
export class DynamoDBTagesbudget implements Tagesbudget {
  private readonly ddb = DynamoDBDocumentClient.from(new DynamoDBClient());

  constructor(
    private readonly tableName: string,
    private readonly limitUsd: number,
  ) {}

  private key() {
    return { pk: `budget#${new Date().toISOString().slice(0, 10)}` };
  }

  async pruefen(): Promise<void> {
    const { Item } = await this.ddb.send(new GetCommand({ TableName: this.tableName, Key: this.key() }));
    const verbraucht = (Item?.kosten as number | undefined) ?? 0;
    if (verbraucht >= this.limitUsd) {
      console.error(JSON.stringify({ event: "budget_exceeded", verbraucht, limit: this.limitUsd }));
      throw new BudgetErschoepftError(verbraucht, this.limitUsd);
    }
  }

  async buchen(kosten: number): Promise<void> {
    await this.ddb.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: this.key(),
        UpdateExpression: "ADD kosten :k",
        ExpressionAttributeValues: { ":k": kosten },
      }),
    );
  }
}

/** Without both variables (local runs, tests) Bedrock calls are not budgeted. */
export function tagesbudgetAusUmgebung(): Tagesbudget | undefined {
  const table = process.env.STATISTIK_TABLE;
  const limit = Number(process.env.TAGESBUDGET_USD);
  return table && limit > 0 ? new DynamoDBTagesbudget(table, limit) : undefined;
}
