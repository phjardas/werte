export interface TestResult {
  name: string;
  score: number;
}

export interface TestSession {
  testId: string;
  status: "active" | "completed";
  state?: unknown;
  results?: TestResult[];
  zusammenfassung?: string;
  zusammenfassungStatus?: "generating" | "completed" | "failed";
  /** Gross Bedrock cost in USD of all scenarios prewarmed for this test (cache hits included). */
  szenarienKosten?: number;
  /** Gross Bedrock cost in USD of the summary (cache hits included). */
  zusammenfassungKosten?: number;
  firstName?: string;
  lastName?: string;
  email?: string;
  createdAt: string;
  completedAt?: string;
}

export interface UpdateStateResult {
  found: boolean;
  active: boolean;
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
}
