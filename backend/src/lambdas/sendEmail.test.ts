import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderErgebnisEmail } from "../domain/email.js";
import { createHandler } from "./sendEmail.js";

const session = {
  testId: "abc",
  status: "completed",
  results: ["A", "B", "C", "D", "E", "F"].map((name, i) => ({ name, score: 10 - i })),
  zusammenfassung: "Erster Absatz.\n\nZweiter <Absatz>.",
  createdAt: "2026-01-01",
};

describe("sendEmail handler", () => {
  let repo: { get: ReturnType<typeof vi.fn>; markEmailSent: ReturnType<typeof vi.fn>; clearEmailSent: ReturnType<typeof vi.fn> };
  let send: ReturnType<typeof vi.fn>;
  let handler: ReturnType<typeof createHandler>;

  const call = (body: unknown) =>
    handler({ pathParameters: { testId: "abc" }, body: JSON.stringify(body) });

  beforeEach(() => {
    repo = {
      get: vi.fn().mockResolvedValue(session),
      markEmailSent: vi.fn().mockResolvedValue(true),
      clearEmailSent: vi.fn().mockResolvedValue(undefined),
    };
    send = vi.fn().mockResolvedValue(undefined);
    handler = createHandler(repo, send, "https://werte.example");
  });

  it("sends the top 5 and the summary with a link to the test", async () => {
    const res = await call({ email: " max@example.com " });
    expect(res.statusCode).toBe(200);
    const [to, content] = send.mock.calls[0];
    expect(to).toBe("max@example.com");
    expect(content.text).toContain("5. E");
    expect(content.text).not.toContain("6. F");
    expect(content.text).toContain("https://werte.example/tests/abc");
    expect(content.html).toContain("Zweiter &lt;Absatz&gt;.");
  });

  it("rejects invalid addresses", async () => {
    expect((await call({ email: "kein-at" })).statusCode).toBe(400);
    expect((await call({})).statusCode).toBe(400);
    expect(send).not.toHaveBeenCalled();
  });

  it("returns 404 for unknown tests", async () => {
    repo.get.mockResolvedValue(null);
    expect((await call({ email: "a@b.de" })).statusCode).toBe(404);
  });

  it("returns 409 while the summary is missing", async () => {
    repo.get.mockResolvedValue({ ...session, zusammenfassung: undefined });
    expect((await call({ email: "a@b.de" })).statusCode).toBe(409);
    expect(repo.markEmailSent).not.toHaveBeenCalled();
  });

  it("sends only once per test", async () => {
    repo.markEmailSent.mockResolvedValue(false);
    const res = await call({ email: "a@b.de" });
    expect(res.statusCode).toBe(409);
    expect(JSON.parse(res.body).error).toBe("already_sent");
    expect(send).not.toHaveBeenCalled();
  });

  it("releases the marker when sending fails", async () => {
    send.mockRejectedValue(new Error("ses down"));
    expect((await call({ email: "a@b.de" })).statusCode).toBe(502);
    expect(repo.clearEmailSent).toHaveBeenCalledWith("abc");
  });
});

describe("renderErgebnisEmail", () => {
  it("greets by first name when known", () => {
    const { text, html } = renderErgebnisEmail({ werte: ["A"], zusammenfassung: "x", appUrl: "u", testId: "t", firstName: "<Max>" });
    expect(text.startsWith("Hallo <Max>,")).toBe(true);
    expect(html).toContain("Hallo &lt;Max&gt;,");
  });

  it("highlights whole-word values, links the logo and signs off", () => {
    const { text, html } = renderErgebnisEmail({
      werte: ["Mut", "Ehrlichkeit"],
      zusammenfassung: "Mut und Ehrlichkeit, nicht Mutter.",
      appUrl: "https://werte.example",
      testId: "abc",
    });
    expect(html).toContain('<img src="https://werte.example/logo.png"');
    expect(html.match(/<strong[^>]*>Mut<\/strong>/g)).toHaveLength(1);
    expect(html).toContain(">Ehrlichkeit</strong>");
    expect(html).toContain("Mutter.");
    expect(text.trimEnd().endsWith("Empfiehl ihn gerne weiter!\n\nDein Philipp")).toBe(true);
    expect(html).toContain("Dein Philipp");
  });
});
