export interface EmailContent {
  subject: string;
  text: string;
  html: string;
}

export interface ErgebnisEmailInput {
  werte: string[];
  zusammenfassung: string;
  /** Base URL of the app, e.g. https://werte.jardas.de */
  appUrl: string;
  testId: string;
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

// Same rule as the results page: whole words only, case-sensitive.
function highlightWerte(text: string, werte: string[]): string {
  if (werte.length === 0) return escapeHtml(text);
  const escaped = werte.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const pattern = new RegExp(`(?<![\\p{L}\\p{N}])(${escaped.join("|")})(?![\\p{L}\\p{N}])`, "gu");
  return text
    .split(pattern)
    .map((part, i) =>
      i % 2 === 1 ? `<strong style="color:${COLORS.secondary};">${escapeHtml(part)}</strong>` : escapeHtml(part),
    )
    .join("");
}

// The app's oklch tokens as hex, since email clients do not support oklch.
const COLORS = {
  primary: "#1f4f7a",
  secondary: "#14897f",
  bg: "#f3f5f7",
  card: "#ffffff",
  text: "#1a1a1a",
  muted: "#4d4d4d",
};
const SERIF = "Fraunces, Georgia, 'Times New Roman', serif";
const SANS = "Geist, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const MEDALS = ["🥇", "🥈", "🥉"];

const SIGNATUR = ["Ich hoffe, der Werte Kompass hat dir gefallen. Empfiehl ihn gerne weiter!", "Dein Philipp"];

export function renderErgebnisEmail({ werte, zusammenfassung, appUrl, testId }: ErgebnisEmailInput): EmailContent {
  const link = `${appUrl}/tests/${encodeURIComponent(testId)}`;
  const absaetze = zusammenfassung.split("\n\n");

  const text = [
    "Hallo,",
    "",
    "das sind deine Top 5 Werte:",
    "",
    ...werte.map((w, i) => `${i + 1}. ${w}`),
    "",
    ...absaetze.flatMap((p) => [p, ""]),
    `Dein Ergebnis kannst du jederzeit wieder aufrufen: ${link}`,
    "",
    SIGNATUR[0],
    "",
    SIGNATUR[1],
  ].join("\n");

  const p = `margin:0 0 16px;font-family:${SANS};font-size:16px;line-height:1.6;color:${COLORS.text};`;

  const werteRows = werte
    .map((w, i) => {
      const first = i === 0;
      const rank = MEDALS[i] ?? String(i + 1);
      return `<tr><td style="padding:0 0 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.card};border-radius:12px;">
<tr>
<td width="56" align="center" style="padding:${first ? 20 : 16}px 0 ${first ? 20 : 16}px 16px;font-family:${SANS};font-size:${first ? 40 : 18}px;font-weight:800;color:${COLORS.muted};line-height:1;">${rank}</td>
<td style="padding:${first ? 20 : 16}px 20px ${first ? 20 : 16}px 16px;font-family:${SANS};font-size:${first ? 22 : 17}px;font-weight:${first ? 700 : 600};color:${COLORS.text};">${escapeHtml(w)}</td>
</tr>
</table>
</td></tr>`;
    })
    .join("\n");

  const html = `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light only">
<title>Deine Top 5 Werte</title>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400..700&family=Geist:wght@400..700&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:${COLORS.bg};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.bg};">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">

<tr><td align="center" style="padding:0 0 8px;">
<a href="${escapeHtml(appUrl)}" style="text-decoration:none;"><img src="${escapeHtml(appUrl)}/logo.png" width="96" height="96" alt="Werte Kompass" style="display:block;border:0;"></a>
</td></tr>
<tr><td align="center" style="padding:0 0 32px;font-family:${SERIF};font-size:24px;color:${COLORS.primary};">Werte Kompass</td></tr>

<tr><td align="center" style="padding:0 0 4px;font-family:${SERIF};font-size:32px;font-weight:600;color:${COLORS.primary};">Deine Top 5 Werte</td></tr>
<tr><td align="center" style="padding:0 0 24px;font-family:${SANS};font-size:15px;color:${COLORS.muted};">Das sind die Werte, die dir am wichtigsten sind.</td></tr>

${werteRows}

<tr><td style="padding:20px 0 0;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.card};border-radius:0 19px 19px 19px;">
<tr><td style="padding:24px 24px 8px;">
<p style="${p}">Hallo,</p>
${absaetze.map((a) => `<p style="${p}">${highlightWerte(a, werte)}</p>`).join("\n")}
<p style="${p}">${escapeHtml(SIGNATUR[0])}</p>
<p style="${p}">${escapeHtml(SIGNATUR[1])}</p>
</td></tr>
</table>
</td></tr>

<tr><td align="center" style="padding:32px 0 8px;">
<a href="${escapeHtml(link)}" style="display:inline-block;padding:12px 32px;border-radius:999px;background:${COLORS.primary};color:#ffffff;font-family:${SANS};font-size:16px;font-weight:600;text-decoration:none;">Ergebnis ansehen</a>
</td></tr>
<tr><td align="center" style="padding:8px 0 0;font-family:${SANS};font-size:13px;color:${COLORS.muted};">
Dein Ergebnis kannst du jederzeit unter diesem Link wieder aufrufen:<br>
<a href="${escapeHtml(link)}" style="color:${COLORS.primary};word-break:break-all;">${escapeHtml(link)}</a>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;

  return { subject: "Deine Top 5 Werte", text, html };
}
