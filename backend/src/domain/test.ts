import type { KontextId } from "./kontext.js";

export interface TestResult {
  name: string;
  score: number;
}

export interface TestSession {
  testId: string;
  status: "active" | "completed";
  /** Missing for tests created before contexts existed; those count as STANDARD_KONTEXT. */
  kontext?: KontextId;
  state?: unknown;
  results?: TestResult[];
  zusammenfassung?: string;
  zusammenfassungStatus?: "generating" | "completed" | "failed";
  /** Gross Bedrock cost in USD of all scenarios prewarmed for this test (cache hits included). */
  szenarienKosten?: number;
  /** Gross Bedrock cost in USD of the summary (cache hits included). */
  zusammenfassungKosten?: number;
  /** When the result email was sent. The address itself is not stored. */
  emailGesendetAm?: string;
  createdAt: string;
  completedAt?: string;
  /** Expiry as Unix time in seconds. DynamoDB deletes the item some time after it. */
  ttl?: number;
}

export const AUFBEWAHRUNG_MONATE = 12;

/** Unix time in seconds, AUFBEWAHRUNG_MONATE after createdAt. */
export function ablaufTtl(createdAt: string): number {
  const d = new Date(createdAt);
  d.setUTCMonth(d.getUTCMonth() + AUFBEWAHRUNG_MONATE);
  return Math.floor(d.getTime() / 1000);
}

/** DynamoDB deletes expired items with a delay of up to a few days, so reads must check ttl themselves. */
export function istAbgelaufen(session: Pick<TestSession, "ttl">, now = Date.now()): boolean {
  return session.ttl != null && session.ttl * 1000 <= now;
}

export interface UpdateStateResult {
  found: boolean;
  active: boolean;
  /** The stored context of an active test, if it has one. */
  kontext?: KontextId;
}

export interface CompleteResult {
  found: boolean;
  active: boolean;
  session: TestSession | null;
}

export interface TestRepository {
  create(session: Omit<TestSession, "createdAt"> & { createdAt?: string }): Promise<void>;
  get(testId: string): Promise<TestSession | null>;
  updateState(testId: string, state: unknown): Promise<UpdateStateResult>;
  complete(testId: string, results: TestResult[]): Promise<CompleteResult>;
  updateZusammenfassung(testId: string, zusammenfassung: string, kosten: number): Promise<void>;
  setSzenarienKosten(testId: string, kosten: number): Promise<void>;
  updateZusammenfassungStatus(testId: string, status: "generating" | "completed" | "failed"): Promise<void>;
  /** Sets emailGesendetAm. Returns false if it was already set. */
  markEmailSent(testId: string): Promise<boolean>;
  clearEmailSent(testId: string): Promise<void>;
}
