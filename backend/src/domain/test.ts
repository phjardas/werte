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
  updateZusammenfassung(testId: string, zusammenfassung: string): Promise<void>;
  updateZusammenfassungStatus(testId: string, status: "generating" | "completed" | "failed"): Promise<void>;
}
