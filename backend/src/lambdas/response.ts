export interface LambdaResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

export function response(statusCode: number, body: unknown): LambdaResponse {
  return {
    statusCode,
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*",
    },
    body: body !== null && body !== undefined ? JSON.stringify(body) : "",
  };
}
