export interface Cache {
  get(pk: string, version: string): Promise<Record<string, unknown> | null>;
  put(pk: string, version: string, data: Record<string, unknown>): Promise<void>;
  increment(pk: string, version: string, field: string): Promise<void>;
}
