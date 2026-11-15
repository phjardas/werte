import { expect, it } from "vitest";
import { nurUeberCloudFront, response } from "./response.js";

const handler = nurUeberCloudFront(() => response(200, { ok: true }), "geheim");

it("rejects requests without the CloudFront origin header", async () => {
  expect((await handler({ headers: {} })).statusCode).toBe(403);
  expect((await handler({ headers: { "x-origin-verify": "falsch" } })).statusCode).toBe(403);
});

it("passes requests with the CloudFront origin header", async () => {
  expect((await handler({ headers: { "x-origin-verify": "geheim" } })).statusCode).toBe(200);
});

it("passes every request when no secret is configured", async () => {
  expect((await nurUeberCloudFront(() => response(200, null), undefined)({})).statusCode).toBe(200);
});
