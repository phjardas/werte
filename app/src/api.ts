import type { KontextId } from "./kontexte";
import type {
  Contestant,
  Statistik,
  Szenario,
  TestSession,
  TestState,
} from "./types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";

export async function fetchWerte(): Promise<string[]> {
  const res = await fetch(`${API_BASE_URL}/werte`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.werte;
}

export async function fetchSzenario(
  wert1: string,
  wert2: string,
  kontext: KontextId,
): Promise<Szenario | null> {
  try {
    const res = await fetch(
      `${API_BASE_URL}/szenarien/${encodeURIComponent(wert1)}/${encodeURIComponent(wert2)}?kontext=${kontext}`,
    );
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function getTest(testId: string): Promise<TestSession | null> {
  const res = await fetch(
    `${API_BASE_URL}/tests/${encodeURIComponent(testId)}`,
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function updateTestState(
  testId: string,
  state: TestState,
): Promise<void> {
  const res = await fetch(
    `${API_BASE_URL}/tests/${encodeURIComponent(testId)}/state`,
    {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(state),
    },
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

export async function completeTest(
  testId: string,
  results: Contestant[],
): Promise<void> {
  const res = await fetch(
    `${API_BASE_URL}/tests/${encodeURIComponent(testId)}/complete`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ results }),
    },
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

export async function voteSzenario(
  wert1: string,
  wert2: string,
  vote: "up" | "down",
  version: string,
): Promise<void> {
  try {
    await fetch(
      `${API_BASE_URL}/szenarien/${encodeURIComponent(wert1)}/${encodeURIComponent(wert2)}/vote`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ vote, version }),
      },
    );
  } catch (err) {
    // votes are best-effort, log for debugging but don't throw
    console.error("voteSzenario failed:", err);
  }
}

export async function createTest(kontext: KontextId): Promise<string> {
  const res = await fetch(`${API_BASE_URL}/tests`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ kontext }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.testId;
}

export type SendEmailResult = "sent" | "already_sent" | "error";

export async function sendEmail(
  testId: string,
  email: string,
): Promise<SendEmailResult> {
  try {
    const res = await fetch(
      `${API_BASE_URL}/tests/${encodeURIComponent(testId)}/email`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      },
    );
    if (res.ok) return "sent";
    if (res.status === 409 && (await res.json()).error === "already_sent") {
      return "already_sent";
    }
    return "error";
  } catch {
    return "error";
  }
}

/** Without a context, the statistic covers all contexts. */
export async function fetchStatistik(kontext?: KontextId): Promise<Statistik> {
  const query = kontext ? `?kontext=${kontext}` : "";
  const res = await fetch(`${API_BASE_URL}/statistik${query}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
