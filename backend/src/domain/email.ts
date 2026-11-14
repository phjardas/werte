export interface EmailContent {
  subject: string;
  text: string;
  html: string;
}

export interface ErgebnisEmailInput {
  werte: string[];
  zusammenfassung: string;
  link: string;
  firstName?: string | null;
}

export type SendEmailFn = (to: string, content: EmailContent) => Promise<void>;

// ponytail: pragmatic check, SES rejects anything this lets through
export function isValidEmail(email: string): boolean {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderErgebnisEmail({ werte, zusammenfassung, link, firstName }: ErgebnisEmailInput): EmailContent {
  const anrede = firstName ? `Hallo ${firstName},` : "Hallo,";
  const absaetze = zusammenfassung.split("\n\n");

  const text = [
    anrede,
    "",
    "das sind deine Top 5 Werte:",
    "",
    ...werte.map((w, i) => `${i + 1}. ${w}`),
    "",
    ...absaetze.flatMap((p) => [p, ""]),
    `Dein Ergebnis kannst du jederzeit wieder aufrufen: ${link}`,
    "",
    "Werte Kompass",
  ].join("\n");

  const html = `<!doctype html>
<html lang="de">
<body style="font-family: sans-serif; line-height: 1.5; color: #222; max-width: 600px;">
<p>${escapeHtml(anrede)}</p>
<p>das sind deine Top 5 Werte:</p>
<ol>${werte.map((w) => `<li><strong>${escapeHtml(w)}</strong></li>`).join("")}</ol>
${absaetze.map((p) => `<p>${escapeHtml(p)}</p>`).join("\n")}
<p>Dein Ergebnis kannst du jederzeit wieder aufrufen: <a href="${escapeHtml(link)}">${escapeHtml(link)}</a></p>
<p>Werte Kompass</p>
</body>
</html>`;

  return { subject: "Deine Top 5 Werte", text, html };
}
