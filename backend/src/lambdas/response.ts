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

/**
 * Rejects requests that reach API Gateway directly instead of through CloudFront, which would bypass
 * the WAF rate limit. CloudFront adds the `x-origin-verify` header with the secret from `ORIGIN_SECRET`.
 * Without the variable (local runs, tests) every request passes.
 */
export function nurUeberCloudFront<E extends { headers?: Record<string, string | undefined> }>(
  handler: (event: E) => Promise<LambdaResponse> | LambdaResponse,
  secret = process.env.ORIGIN_SECRET,
) {
  return async (event: E) =>
    secret && event.headers?.["x-origin-verify"] !== secret ? response(403, { error: "forbidden" }) : handler(event);
}
