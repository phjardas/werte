import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { isValidEmail, renderErgebnisEmail, type SendEmailFn } from "../domain/email.js";
import type { TestRepository } from "../domain/test.js";
import { DynamoDBTestRepository } from "../infrastructure/dynamodb-test.js";
import { response } from "./response.js";

export function createHandler(
  testRepository: Pick<TestRepository, "get" | "markEmailSent" | "clearEmailSent">,
  sendEmail: SendEmailFn,
  appUrl: string,
) {
  return async function handler(event: Partial<APIGatewayProxyEventV2>) {
    const testId = event.pathParameters?.testId;
    if (!testId) return response(400, { error: "testId is required" });

    let email: unknown;
    try {
      email = JSON.parse(event.body ?? "null")?.email;
    } catch {
      return response(400, { error: "Invalid JSON body" });
    }
    if (typeof email !== "string" || !isValidEmail(email.trim())) {
      return response(400, { error: "invalid_email" });
    }

    const session = await testRepository.get(testId);
    if (!session) return response(404, { error: "not_found" });
    if (!session.zusammenfassung || !session.results) {
      return response(409, { error: "zusammenfassung_not_ready" });
    }

    // Abuse protection: one email per test, claimed atomically before sending.
    if (!(await testRepository.markEmailSent(testId))) {
      return response(409, { error: "already_sent" });
    }

    const content = renderErgebnisEmail({
      werte: session.results.slice(0, 5).map((r) => r.name),
      zusammenfassung: session.zusammenfassung,
      link: `${appUrl}/tests/${encodeURIComponent(testId)}`,
      firstName: session.firstName,
    });

    try {
      await sendEmail(email.trim(), content);
    } catch (err) {
      console.error(JSON.stringify({ event: "email_send_error", testId, error: String(err) }));
      await testRepository.clearEmailSent(testId);
      return response(502, { error: "send_failed" });
    }

    console.log(JSON.stringify({ event: "email_sent", testId }));
    return response(200, { ok: true });
  };
}

function createSesSender(from: string): SendEmailFn {
  const ses = new SESv2Client({});
  return async (to, { subject, text, html }) => {
    await ses.send(
      new SendEmailCommand({
        FromEmailAddress: from,
        Destination: { ToAddresses: [to] },
        Content: {
          Simple: {
            Subject: { Data: subject, Charset: "UTF-8" },
            Body: { Text: { Data: text, Charset: "UTF-8" }, Html: { Data: html, Charset: "UTF-8" } },
          },
        },
      }),
    );
  };
}

export const handler = createHandler(
  new DynamoDBTestRepository(process.env.DYNAMODB_TABLE!),
  createSesSender(process.env.EMAIL_FROM!),
  process.env.APP_URL!,
);
