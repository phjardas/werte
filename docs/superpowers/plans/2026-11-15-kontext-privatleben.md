# Kontexte und Kontext Privatleben – Umsetzungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ein Test läuft in einem gewählten Kontext (Berufsleben oder Privatleben), der Szenarien, Zusammenfassung und Statistik bestimmt.

**Architecture:** Ein Domänenmodul `kontext.ts` hält die Textbausteine je Kontext. Szenario- und Zusammenfassungs-Prompt werden aus einer Vorlage gerendert. Der Kontext wird bei `POST /tests` in der Session gespeichert und von dort an Vorwärmen, Zusammenfassung und Statistik weitergereicht. Der Szenario-Abruf bekommt ihn als Query-Parameter. Das Frontend zeigt unter `/tests` eine Auswahlseite mit Karten.

**Tech Stack:** TypeScript, Vitest, AWS Lambda, DynamoDB, Bedrock (Backend); React 19, TanStack Router, Vite (Frontend). Paketmanager pnpm.

**Spec:** `docs/superpowers/specs/2026-11-15-kontext-privatleben-design.md`

## Global Constraints

- Kontext-IDs: `"beruf"` und `"privat"`. Fehlender Kontext gilt überall als `"beruf"` (`STANDARD_KONTEXT`).
- Ein unbekannter Kontext ergibt HTTP 400, nie 403.
- Das Statistik-Item für `beruf` bleibt `pk = "werte"`, andere Kontexte nutzen `pk = "werte#{kontextId}"`.
- Der Partition Key im Szenario- und Zusammenfassungs-Cache bleibt unverändert. Die Kontexte trennen sich über die Version (Hash über den gerenderten System-Prompt).
- In sichtbaren Texten heißt ein Kontext "Lebensbereich".
- Kein Commit-Trailer, keine Erwähnung von Claude in Commits.
- Backend-Tests: `cd backend && pnpm test`. Typprüfung: `pnpm typecheck`. Frontend: `cd app && pnpm build`.
- **Checkpoint nach Task 1 und nach Task 3:** Ergebnisse dem Auftraggeber zur Durchsicht vorlegen und auf Freigabe warten, bevor die nächste Task beginnt.

## Review Focus

1. Ein Test, der vor dem Deployment angelegt wurde (ohne `kontext`), läuft weiter als Berufsleben, inklusive Vorwärmen, Zusammenfassung, Wiederherstellung in `getTest` und Statistik. Tests in Task 4, 5, 6.
2. `?kontext=` mit unbekanntem oder leerem Wert: leer gilt als `beruf`, unbekannt ergibt 400. Tests in Task 5 und 7.
3. Privatleben- und Berufsszenario für dasselbe Wertepaar überschreiben sich nicht im Cache. Test in Task 2.
4. Die Gesamtstatistik zählt Werte, die nur in einem Kontext vorkommen, und summiert Platzierungsarrays unterschiedlicher Länge korrekt. Test in Task 7.
5. Ein Doppelklick auf eine Kontextkarte legt nur einen Test an. Abgedeckt in Task 8 durch Sperren der Karten während der Anlage.

---

### Task 1: Neutrale Werte-Beschreibungen

**Files:**
- Modify: `backend/src/werte.json` (nur Feld `beschreibung`)
- Create: `backend/src/domain/werte.test.ts`

**Interfaces:**
- Consumes: nichts
- Produces: nichts Neues; `werte.json` behält Form und Namen.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import werteData from "../werte.json" with { type: "json" };

describe("werte.json", () => {
  it("describes every value without reference to work", () => {
    const arbeitsbezug = /arbeit|beruf|kolleg|vorgesetzt|kundschaft|kunden|job\b|büro|arbeitgeber/i;
    const treffer = werteData.werte.filter((w) => arbeitsbezug.test(w.beschreibung.join(" "))).map((w) => w.name);
    expect(treffer).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && pnpm test src/domain/werte.test.ts`
Expected: FAIL, die Liste enthält u.a. "Autonomie" und "Leistung".

- [ ] **Step 3: Umformulieren**

Für jeden Treffer und für jede Beschreibung, die "Team" oder "Organisation" nur im Arbeitssinn verwendet: Arbeitsbezug durch allgemeine Formulierungen ersetzen, die in jedem Lebensbereich tragen. Kern des Werts und die Abgrenzung zu ähnlichen Werten ("Im Unterschied zu …") unbedingt erhalten. Sätze wie "Im Arbeitsleben zeigt sich …" allgemein fassen oder streichen. `synonyme` und `definition` nicht anfassen. Ton und Länge der übrigen Beschreibungen beibehalten.

- [ ] **Step 4: Run tests**

Run: `cd backend && pnpm test`
Expected: PASS (alle Suites).

- [ ] **Step 5: Commit**

```bash
git add backend/src/werte.json backend/src/domain/werte.test.ts
git commit -m "Describe the values without reference to work"
```

- [ ] **Step 6: Checkpoint** – Diff von `werte.json` zur Durchsicht vorlegen. Erst nach Freigabe mit Task 2 weitermachen.

---

### Task 2: Kontextmodell und Prompt-Vorlagen

**Files:**
- Create: `backend/src/domain/kontext.ts`, `backend/src/domain/kontext.test.ts`
- Modify: `backend/src/domain/szenario.ts`, `backend/src/domain/szenario.test.ts`, `backend/src/domain/zusammenfassung.ts`, `backend/src/domain/zusammenfassung.test.ts`

**Interfaces:**
- Produces:
  - `type KontextId = "beruf" | "privat"`
  - `const STANDARD_KONTEXT: KontextId = "beruf"`
  - `const KONTEXT_IDS: readonly KontextId[]`
  - `interface Kontext` mit den Feldern aus dem Spec (`id`, `zielgruppe`, `szenenort`, `abgrenzung`, `beispiel`, `zusammenfassungsbereich`, `tippbeispiele`, `zusatzregeln?`); weitere Felder nach Bedarf, wenn eine kontextabhängige Stelle der heutigen Prompts sonst nicht abbildbar ist.
  - `const KONTEXTE: Record<KontextId, Kontext>`
  - `function parseKontext(wert: unknown): KontextId | null` – `undefined`, `null` und `""` ergeben `STANDARD_KONTEXT`, eine gültige ID ergibt sich selbst, alles andere `null`.
  - `function szenarioSystemPrompt(kontext: KontextId): string` (in `szenario.ts`)
  - `SzenarioService.getOrCreate(wert1: string, wert2: string, kontext: KontextId = STANDARD_KONTEXT, skipCache = false)`
  - `function zusammenfassungSystemPrompt(kontext: KontextId): string` (in `zusammenfassung.ts`)
  - `ZusammenfassungService.getOrCreate(werte: string[], kontext: KontextId = STANDARD_KONTEXT)`

- [ ] **Step 1: Write the failing tests**

`kontext.test.ts`:
```ts
it("parses missing values as beruf", () => {
  expect(parseKontext(undefined)).toBe("beruf");
  expect(parseKontext(null)).toBe("beruf");
  expect(parseKontext("")).toBe("beruf");
});
it("accepts known ids", () => expect(parseKontext("privat")).toBe("privat"));
it("rejects unknown ids", () => {
  expect(parseKontext("familie")).toBeNull();
  expect(parseKontext(42)).toBeNull();
});
```

`szenario.test.ts` (neu, zusätzlich zu den bestehenden):
```ts
it("renders a context specific system prompt", () => {
  const beruf = szenarioSystemPrompt("beruf");
  const privat = szenarioSystemPrompt("privat");
  expect(beruf).toContain(KONTEXTE.beruf.zielgruppe);
  expect(privat).toContain(KONTEXTE.privat.abgrenzung);
  expect(privat).not.toContain("Arbeitsalltag");
});
it("uses a different cache version per context for the same pair", async () => {
  vi.mocked(mockCache.get).mockResolvedValue(null);
  vi.mocked(mockAI.invoke).mockResolvedValue({ result: { szenario: "s", antworten: ["a", "b"] }, kosten: 0 });
  const beruf = await service.getOrCreate("Aktivität", "Ruhe", "beruf");
  const privat = await service.getOrCreate("Aktivität", "Ruhe", "privat");
  expect(beruf?.version).not.toBe(privat?.version);
  expect(vi.mocked(mockCache.put).mock.calls[0][0]).toBe(vi.mocked(mockCache.put).mock.calls[1][0]);
  expect(vi.mocked(mockAI.invoke).mock.calls[1][0]).toBe(szenarioSystemPrompt("privat"));
});
```
Den bestehenden Test "skips cache when skipCache is true" auf `getOrCreate("Aktivität", "Ruhe", "beruf", true)` umstellen.

`zusammenfassung.test.ts` (neu):
```ts
it("uses the context's system prompt and a context specific version", async () => {
  vi.mocked(mockCache.get).mockResolvedValue(null);
  vi.mocked(mockAI.invokeText).mockResolvedValue({ result: "text", kosten: 0 });
  await service.getOrCreate(FIVE_WERTE, "beruf");
  await service.getOrCreate(FIVE_WERTE, "privat");
  const [beruf, privat] = vi.mocked(mockCache.put).mock.calls;
  expect(beruf[1]).not.toBe(privat[1]);
  expect(vi.mocked(mockAI.invokeText).mock.calls[1][0]).toBe(zusammenfassungSystemPrompt("privat"));
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && pnpm test src/domain`
Expected: FAIL, `kontext.js` und die neuen Exporte fehlen.

- [ ] **Step 3: Implement**

`kontext.ts` nach dem Spec. Bausteine für `beruf` aus den heutigen Prompts übernehmen. Für `privat` neu formulieren: Erwachsene im Alltag außerhalb der Arbeit; Szenen mit Freunden, Nachbarn, Partner oder Partnerin, in der Freizeit, beim Wohnen, beim Umgang mit Geld oder Zeit; Abgrenzung "nicht am Arbeitsplatz und nicht in der Rolle als Mutter oder Vater"; eigenes Beispiel Aktivität vs. Ruhe; Tipps für den Alltag (z.B. Gespräche mit Freunden, Prioritäten bei freier Zeit, kleine Gewohnheiten).

`szenario.ts`: `SZENARIO_SYSTEM_PROMPT` durch `szenarioSystemPrompt(kontext)` ersetzen; alle Stellen mit "Berufstätige", "Arbeitsalltag", "beruflichen Kontext" und das Beispiel aus dem Kontext füllen; `zusatzregeln` als eigene Regelzeile anhängen, wenn gesetzt. `computeVersion(systemPrompt, userPrompt)` hasht den gerenderten Prompt. Getter `systemPrompt` entfernen, falls ungenutzt (`grep -rn "systemPrompt\b" backend/src`). `zusammenfassung.ts` analog; die Version wird je Kontext berechnet (z.B. einmal beim Laden in ein `Record<KontextId, string>`), ebenso der Schlusssatz in `buildPrompt` ("… im Berufsleben aussagt").

- [ ] **Step 4: Run tests**

Run: `cd backend && pnpm test && pnpm typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/domain
git commit -m "Render scenario and summary prompts per context"
```

---

### Task 3: Skript für Beispielszenarien

**Files:**
- Create: `backend/scripts/beispielszenarien.ts`
- Modify: `backend/package.json` (Script `beispielszenarien`)

**Interfaces:**
- Consumes: `SzenarioService.getOrCreate(w1, w2, kontext, true)`, `ZusammenfassungService`, `parseKontext`, `BedrockAIService` (ohne Tagesbudget), alles aus `dist/`.
- Produces: `pnpm beispielszenarien <kontext> [anzahl] [Wert1:Wert2 ...]`

- [ ] **Step 1: Implement**

`package.json`: `"beispielszenarien": "pnpm build && node scripts/beispielszenarien.ts"`. `tsconfig.json` schließt `scripts` bereits aus; Node führt die TypeScript-Datei direkt aus (Type Stripping), deshalb importiert das Skript aus `../dist/...js`.

Verhalten: `process.env.AWS_REGION ??= "eu-central-1"`. Kontext per `parseKontext` prüfen, bei `null` mit Fehlermeldung und Exit-Code 1 abbrechen. Explizit angegebene Paare `Wert1:Wert2` verwenden, sonst `anzahl` (Standard 12) zufällige Paare. Im Skript steht die Liste `ARBEITSNAHE_WERTE` mit den Namen, die der Test aus Task 1 vor dem Umformulieren gemeldet hat. Bei Zufallsauswahl enthält die Hälfte der Paare je einen Wert aus dieser Liste. Cache-Objekt als No-op-Implementierung von `Cache`. Paare parallel erzeugen, Ausgabe je Paar:

```
## Aktivität vs. Ruhe
<szenario>
  1) <antwort 1>   (Aktivität)
  2) <antwort 2>   (Ruhe)
```

Danach eine Zusammenfassung für fünf zufällige Werte und die Summe der Kosten in USD.

- [ ] **Step 2: Verify**

Run: `cd backend && pnpm beispielszenarien privat 3`
Expected: drei Szenarien und eine Zusammenfassung, keine im Büro spielende Szene. Run `pnpm beispielszenarien foo` → Fehlermeldung, Exit-Code 1.

- [ ] **Step 3: Commit**

```bash
git add backend/scripts backend/package.json
git commit -m "Add a script that generates sample scenarios for a context"
```

- [ ] **Step 4: Checkpoint** – `pnpm beispielszenarien privat 12` und `pnpm beispielszenarien beruf 6` laufen lassen und die Ausgabe zusammen mit den Privatleben-Bausteinen aus `kontext.ts` vorlegen. Nach Rückmeldung Bausteine anpassen, erneut erzeugen. Erst nach Freigabe mit Task 4 weitermachen.

---

### Task 4: Kontext in der Test-Session

**Files:**
- Modify: `backend/src/domain/test.ts`, `backend/src/infrastructure/dynamodb-test.ts`, `backend/src/lambdas/createTest.ts`, `backend/src/lambdas/createTest.test.ts`, `backend/src/lambdas/getTest.ts`, `backend/src/lambdas/getTest.test.ts`

**Interfaces:**
- Consumes: `KontextId`, `parseKontext`, `STANDARD_KONTEXT`
- Produces:
  - `TestSession.kontext?: KontextId`
  - `UpdateStateResult.kontext?: KontextId` (gesetzt, wenn `found && active`; aus dem gespeicherten Item, Fallback `STANDARD_KONTEXT`)
  - `POST /tests` Body `{ kontext?: string }`
  - `GET /tests/{id}` liefert `kontext: KontextId`
  - `ZusammenfassungTriggerFn = (testId: string, werte: string[], kontext: KontextId) => Promise<void>`, Payload `{ testId, werte, kontext }`

- [ ] **Step 1: Write the failing tests**

`createTest.test.ts`:
```ts
it("stores the requested context", async () => {
  await handler({ body: JSON.stringify({ kontext: "privat" }) });
  expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ kontext: "privat" }));
});
it("defaults to beruf without a body", async () => {
  await handler({});
  expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ kontext: "beruf" }));
});
it("rejects an unknown context with 400", async () => {
  const res = await handler({ body: JSON.stringify({ kontext: "familie" }) });
  expect(res.statusCode).toBe(400);
  expect(mockCreate).not.toHaveBeenCalled();
});
it("rejects invalid JSON with 400", async () => {
  expect((await handler({ body: "{" })).statusCode).toBe(400);
});
```
Bestehende Aufrufe `handler()` auf `handler({})` umstellen.

`getTest.test.ts`:
```ts
it("returns the stored context", async () => { /* item mit kontext: "privat" → body.kontext === "privat" */ });
it("returns beruf for sessions without context", async () => { /* item ohne kontext → body.kontext === "beruf" */ });
it("passes the context to the summary recovery", async () => {
  /* completed item ohne zusammenfassung, kontext: "privat" → trigger called with (testId, werte, "privat") */
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && pnpm test src/lambdas/createTest.test.ts src/lambdas/getTest.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

`createTest`: Handler nimmt `event: Partial<APIGatewayProxyEventV2>`, parst den Body (leer → `{}`), `parseKontext(body.kontext)`, 400 bei `null`. `getTest`: `kontext: item.kontext ?? STANDARD_KONTEXT`, Trigger mit Kontext. `DynamoDBTestRepository.updateState`: `ReturnValues: "ALL_NEW"` und `kontext` aus `Attributes` zurückgeben.

- [ ] **Step 4: Run tests**

Run: `cd backend && pnpm test && pnpm typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src
git commit -m "Store the context with each test"
```

---

### Task 5: Kontext für Szenarien und Vorwärmen

**Files:**
- Modify: `backend/src/lambdas/getSzenario.ts`, `getSzenario.test.ts`, `updateTestState.ts`, `updateTestState.test.ts`, `prewarmSzenarien.ts`
- Create: `backend/src/lambdas/prewarmSzenarien.test.ts`

**Interfaces:**
- Consumes: `UpdateStateResult.kontext`, `SzenarioService.getOrCreate(w1, w2, kontext)`, `parseKontext`
- Produces:
  - `GET /szenarien/{wert1}/{wert2}?kontext=…`
  - `PrewarmerFn = (testId: string, werte: string[], kontext: KontextId) => Promise<void>`, Payload-Body `{ testId, werte, kontext }`

- [ ] **Step 1: Write the failing tests**

`getSzenario.test.ts`:
```ts
it("passes the context from the query string", async () => {
  await handler({ pathParameters: { wert1: "Aktivität", wert2: "Ruhe" }, queryStringParameters: { kontext: "privat" } });
  expect(getOrCreate).toHaveBeenCalledWith("Aktivität", "Ruhe", "privat");
});
it("defaults to beruf without query string", async () => {
  await handler({ pathParameters: { wert1: "Aktivität", wert2: "Ruhe" } });
  expect(getOrCreate).toHaveBeenCalledWith("Aktivität", "Ruhe", "beruf");
});
it("rejects an unknown context with 400", async () => {
  const res = await handler({ pathParameters: { wert1: "Aktivität", wert2: "Ruhe" }, queryStringParameters: { kontext: "x" } });
  expect(res.statusCode).toBe(400);
});
```

`updateTestState.test.ts`:
```ts
it("prewarms in the stored context", async () => {
  /* updateState resolves { found: true, active: true, kontext: "privat" }, state at comparison-intro
     → prewarm called with (testId, werte, "privat") */
});
it("prewarms legacy tests as beruf", async () => {
  /* updateState resolves { found: true, active: true } → prewarm called with (..., "beruf") */
});
```

`prewarmSzenarien.test.ts`:
```ts
it("generates all pairs in the given context", async () => {
  /* body { testId, werte: ["Aktivität","Ruhe","Ordnung"], kontext: "privat" } → 3 Aufrufe, jeweils dritter Parameter "privat" */
});
it("defaults to beruf when the payload has no context", async () => { /* ... "beruf" */ });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && pnpm test src/lambdas`
Expected: FAIL.

- [ ] **Step 3: Implement**

`prewarmSzenarien`: ungültiger Kontext in der Payload fällt auf `STANDARD_KONTEXT` zurück (die Payload stammt nur von `updateTestState`, ein 400 hätte keinen Empfänger).

- [ ] **Step 4: Run tests**

Run: `cd backend && pnpm test && pnpm typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/lambdas
git commit -m "Generate and prewarm scenarios in the test's context"
```

---

### Task 6: Kontext für die Zusammenfassung

**Files:**
- Modify: `backend/src/lambdas/completeTest.ts`, `completeTest.test.ts`, `generateTestZusammenfassung.ts`
- Create: `backend/src/lambdas/generateTestZusammenfassung.test.ts`

**Interfaces:**
- Consumes: `CompleteResult.session.kontext`, `ZusammenfassungService.getOrCreate(werte, kontext)`, `StatistikRepository.recordTest(kontext, werte)` aus Task 7 – **deshalb bleibt `recordTest` in dieser Task unverändert; Task 7 stellt den Aufruf um.**
- Produces: Step-Function-Input `{ testId, werte, kontext }`; `StepFunctionEvent.kontext?: KontextId`

- [ ] **Step 1: Write the failing tests**

`completeTest.test.ts`:
```ts
it("starts the summary in the test's context", async () => {
  /* complete resolves { found: true, active: true, session: { ..., kontext: "privat" } }
     → startPostTest called with expect.objectContaining({ kontext: "privat" }) */
});
it("starts legacy tests as beruf", async () => { /* session ohne kontext → kontext: "beruf" */ });
```

`generateTestZusammenfassung.test.ts`:
```ts
it("passes the context to the service", async () => {
  /* event { testId, werte, kontext: "privat" } → getOrCreate called with (werte, "privat") */
});
it("defaults to beruf for events without context", async () => { /* ... "beruf" */ });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && pnpm test src/lambdas/completeTest.test.ts src/lambdas/generateTestZusammenfassung.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement** – Kontext aus `result.session?.kontext ?? STANDARD_KONTEXT`. In `generateTestZusammenfassung` `parseKontext(event.kontext) ?? STANDARD_KONTEXT`. Rückgabe `event` bleibt.

- [ ] **Step 4: Run tests**

Run: `cd backend && pnpm test && pnpm typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/lambdas
git commit -m "Generate the summary in the test's context"
```

---

### Task 7: Statistik je Kontext und gesamt

**Files:**
- Modify: `backend/src/domain/statistik.ts`, `statistik.test.ts`, `backend/src/infrastructure/dynamodb-statistik.ts`, `backend/src/lambdas/completeTest.ts`, `completeTest.test.ts`, `backend/src/lambdas/getStatistik.ts`
- Create: `backend/src/lambdas/getStatistik.test.ts`

**Interfaces:**
- Consumes: `KONTEXT_IDS`, `parseKontext`
- Produces:
  - `StatistikRepository.recordTest(kontext: KontextId, werte: string[]): Promise<void>`
  - `StatistikRepository.get(kontext: KontextId): Promise<StatistikRohdaten>`
  - `function summiereRohdaten(rohdaten: StatistikRohdaten[]): StatistikRohdaten` in `statistik.ts`
  - `function statistikPk(kontext: KontextId): string` in `dynamodb-statistik.ts` (`beruf` → `"werte"`, sonst `` `werte#${kontext}` ``)
  - `GET /statistik` (gesamt) und `GET /statistik?kontext=privat`; Antwortform unverändert (`Statistik`).

- [ ] **Step 1: Write the failing tests**

`statistik.test.ts`:
```ts
it("sums tests and placements across contexts", () => {
  const summe = summiereRohdaten([
    { tests: 2, platzierungen: { Mut: [1, 1], Ruhe: [1] } },
    { tests: 3, platzierungen: { Mut: [0, 0, 2], Freiheit: [3] } },
  ]);
  expect(summe).toEqual({ tests: 5, platzierungen: { Mut: [1, 1, 2], Ruhe: [1], Freiheit: [3] } });
});
it("sums nothing to an empty statistic", () => {
  expect(summiereRohdaten([])).toEqual({ tests: 0, platzierungen: {} });
});
```

`getStatistik.test.ts`:
```ts
it("returns one context's statistic", async () => {
  /* get mocked per kontext; queryStringParameters { kontext: "privat" } → get called once with "privat", body.tests aus privat */
});
it("returns the sum over all contexts without query string", async () => {
  /* get called for every id in KONTEXT_IDS, body.tests === Summe */
});
it("rejects an unknown context with 400", async () => { /* kontext: "x" → 400 */ });
```
Hinweis: hier gilt `?kontext=` (leer) als `beruf`, weil `parseKontext("")` so definiert ist. Gesamt nur, wenn der Parameter ganz fehlt.

`completeTest.test.ts`: bestehende Erwartungen an `recordTest` auf `("beruf", [...])` umstellen, plus:
```ts
it("records the statistic in the test's context", async () => {
  /* session.kontext "privat" → recordTest called with ("privat", ["…"]) */
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && pnpm test src/domain/statistik.test.ts src/lambdas`
Expected: FAIL.

- [ ] **Step 3: Implement** – Repository nutzt `statistikPk(kontext)` in `recordTest` und `get`. `getStatistik` nimmt `event: Partial<APIGatewayProxyEventV2>`; ohne `kontext` im Query: `Promise.all(KONTEXT_IDS.map(get))`, `summiereRohdaten`, dann `berechneStatistik`.

- [ ] **Step 4: Run tests**

Run: `cd backend && pnpm test && pnpm typecheck && pnpm build`
Expected: PASS, Build erfolgreich.

- [ ] **Step 5: Commit**

```bash
git add backend/src
git commit -m "Keep statistics per context and in total"
```

---

### Task 8: Auswahlseite für den Lebensbereich

**Files:**
- Create: `app/src/kontexte.ts`
- Modify: `app/src/types.ts`, `app/src/api.ts`, `app/src/components/FreePage.tsx`, `app/src/styles/index.css`

**Interfaces:**
- Consumes: `POST /tests` mit `{ kontext }`, `GET /tests/{id}` liefert `kontext`
- Produces:
  - `type KontextId = "beruf" | "privat"`
  - `interface KontextInfo { id: KontextId; titel: string; beschreibung: string; icon: string; imLebensbereich: string }` – `imLebensbereich` z.B. `"in deinem Berufsleben"`, `"in deinem Privatleben"`
  - `const KONTEXTE: KontextInfo[]`, `function kontextInfo(id: KontextId): KontextInfo`
  - `const ELTERN_KOMPASS_URL = "https://werte.jessica-kioschis.de/"` (auch in `ResultsScreen.tsx` verwenden statt der literalen URL)
  - `createTest(kontext: KontextId): Promise<string>`
  - `TestSession.kontext: KontextId`

- [ ] **Step 1: Implement**

Texte exakt aus dem Spec:
- Überschrift "Worum soll es gehen?", Untertitel "Die Szenarien und deine Auswertung passen sich an."
- Berufsleben (💼): "Was dir bei der Arbeit wichtig ist: im Team, mit Vorgesetzten und mit Kundschaft."
- Privatleben (🏡): "Was dir außerhalb der Arbeit wichtig ist: mit Freunden, in der Freizeit, beim Wohnen und beim Geld."
- Externe Karte (👪) "Als Mutter oder Vater ↗", Text "Dafür gibt es den eigenen Eltern Werte Kompass.", `target="_blank" rel="noopener"`.

`FreePage`: Karten als `<button>` (Tastatur und Screenreader). Klick setzt einen Zustand `wird angelegt`, deaktiviert alle Karten, zeigt den bisherigen Spinner mit "Dein persönlicher Test wird vorbereitet…" und navigiert nach `createTest(kontext)` wie bisher mit `replace: true`. Schlägt `createTest` fehl, Karten wieder freigeben und eine kurze Fehlermeldung anzeigen. Gestaltung nach Variante A aus `.superpowers/brainstorm/*/content/kontextauswahl.html` (weiße Karten mit Schatten, rundes Icon, gestrichelte externe Karte), mit den bestehenden CSS-Variablen.

- [ ] **Step 2: Verify**

Run: `cd app && pnpm build`
Expected: Build erfolgreich. Dann `pnpm dev`, `/tests` öffnen: drei Karten; Doppelklick auf Privatleben legt genau einen Test an (Netzwerk-Tab: ein `POST /tests` mit `{"kontext":"privat"}`). Hinweis: `pnpm dev` spricht mit der Preview-API, die den Kontext erst nach Deployment kennt; bis dahin genügt die Prüfung des Requests.

- [ ] **Step 3: Commit**

```bash
git add app/src
git commit -m "Let the user choose a context before the test"
```

---

### Task 9: Kontext im Testablauf und auf der Ergebnisseite

**Files:**
- Modify: `app/src/api.ts`, `app/src/components/TestSessionPage.tsx`, `ComparisonStep.tsx`, `ComparisonIntroStep.tsx`, `ResultsScreen.tsx`

**Interfaces:**
- Consumes: `TestSession.kontext`, `kontextInfo`
- Produces: `fetchSzenario(wert1: string, wert2: string, kontext: KontextId)` hängt `?kontext=${kontext}` an.

- [ ] **Step 1: Implement**

`TestSessionPage` reicht `session.kontext` an `ActiveTest`, `ComparisonIntroStep`, `ComparisonStep` und beide `ResultsScreen`-Aufrufe weiter. `ComparisonIntroStep`: "… welche dir {imLebensbereich} am wichtigsten sind." `ResultsScreen`: unter "Das sind die Werte, die dir am wichtigsten sind." eine Zeile "Lebensbereich: {titel}".

- [ ] **Step 2: Verify**

Run: `cd app && pnpm build`
Expected: Build erfolgreich, keine Typfehler.

- [ ] **Step 3: Commit**

```bash
git add app/src
git commit -m "Run the test and show the results in the chosen context"
```

---

### Task 10: Statistikseite mit Umschaltung

**Files:**
- Modify: `app/src/api.ts`, `app/src/components/StatistikPage.tsx`, `app/src/styles/index.css`

**Interfaces:**
- Consumes: `GET /statistik[?kontext=]`, `KONTEXTE`
- Produces: `fetchStatistik(kontext?: KontextId): Promise<Statistik>`

- [ ] **Step 1: Implement**

Umschaltung mit den Einträgen "Gesamt", "Berufsleben", "Privatleben" (aus `KONTEXTE`), Standard "Gesamt". Als Gruppe von Buttons mit `aria-pressed`, im Stil der bestehenden Buttons. Beim Wechsel neu laden; Antworten eines älteren Wechsels verwerfen, wenn inzwischen ein anderer Eintrag gewählt ist. Bei einem Kontext ohne Tests den bestehenden Leerzustand zeigen.

- [ ] **Step 2: Verify**

Run: `cd app && pnpm build`
Expected: Build erfolgreich.

- [ ] **Step 3: Commit**

```bash
git add app/src
git commit -m "Switch the statistics between contexts and the total"
```

---

### Task 11: Dokumentation

**Files:**
- Modify: `CLAUDE.md` (Architekturabschnitte zu Flow, API-Tabelle, Statistik, Cache), `README.md` falls dort die API oder der Ablauf beschrieben ist

- [ ] **Step 1:** Kontext in den betroffenen Abschnitten ergänzen: Auswahlseite unter `/tests`, `kontext` in Session und `POST /tests`, `?kontext=` bei Szenarien und Statistik, Statistik-Items je Kontext, Prompt-Vorlage in `kontext.ts`, Skript `pnpm beispielszenarien`, Anleitung "Neuen Kontext hinzufügen" (Eintrag in `backend/src/domain/kontext.ts` und `app/src/kontexte.ts`, Beispielszenarien erzeugen und prüfen).
- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md README.md
git commit -m "Document contexts"
```
