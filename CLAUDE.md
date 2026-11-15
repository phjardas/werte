# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **Package manager:** Always use **pnpm** instead of npm. This applies everywhere in this repository.

## Commands

### Frontend (`app/`)

```bash
cd app
pnpm install          # install dependencies
pnpm dev              # dev server at localhost:5173, talks to the preview API (preview.werte.jardas.de/api)
pnpm build            # tsc -b && vite build && cp dist/index.html dist/404.html
pnpm test:e2e         # Playwright end-to-end test (E2E_BASE_URL, default http://localhost:5173)
```

### Backend (`backend/`)

TypeScript source compiled to `backend/dist/` before deployment.

```bash
cd backend
pnpm install          # install dependencies
pnpm test             # run tests (vitest, no build needed)
pnpm build            # tsc + copy werte.json to dist/
```

### Infrastructure (`infra/`)

```bash
cd infra
tofu init -backend-config="bucket=phjardas-infrastructure" -backend-config="key=werte-preview/terraform.tfstate"
tofu plan             # preview changes
tofu apply            # deploy to AWS (auto-approved in CI)
```

Before running tofu, build the backend:

```bash
cd backend && pnpm install && pnpm build
```

## Architecture

### Overview

German values-discovery app. Users choose a context (area of life: Berufsleben or Privatleben), select values, compare them pairwise in a Swiss-system tournament, and see their top 5 values together with a personal summary. Claude Sonnet 4.6 on AWS Bedrock generates a workplace scenario for each value pair and the final summary.

### Frontend (`app/`)

- React 19, Vite and TypeScript, deployed to S3 and CloudFront at `werte.jardas.de`.
- TanStack Router v1, routes defined in `app/src/routes.tsx`:
  - `/` (`LandingPage`) explains the compass briefly and links to `/tests`.
  - `/tests` (`FreePage`) shows one card per context plus a link to the Eltern Werte Kompass. A click creates the test via `POST /tests` with the context and redirects to `/tests/$testId`.
  - `/tests/$testId` (`TestSessionPage`) loads the test. A completed test shows `ResultsScreen`, an active one resumes the flow.
  - `/statistik` (`StatistikPage`) shows the number of completed tests and the top 10 values by points, in total or per context.
  - `/impressum` (`ImpressumPage`).
- The contexts the user can pick (id, title, description, icon) are listed in `app/src/kontexte.ts`. The test's context comes from `GET /tests/{testId}` and is passed to the scenario fetch, the comparison intro and the results screen.
- Flow steps (`Step` in `app/src/types.ts`): `selection → filter → comparison-intro → comparison`, then the results screen. The filter step is skipped when 10 or fewer values are selected.
- The test state is saved to the backend after every change (`useStateSync`, `PUT /tests/{testId}/state`), so a test can be resumed via its URL.
- Tournament logic lives in `app/src/hooks/useTournament.ts`: Swiss system with Buchholz tiebreaking, `ceil(log2(n))` rounds.
- `useZusammenfassung` polls `GET /tests/{testId}` until the summary is ready. `ResultsScreen` highlights the top 5 values in the summary text (whole words, case-sensitive).
- The API base URL in `app/src/api.ts` defaults to the CloudFront `/api` path and can be set via `VITE_API_BASE_URL`.

### Backend (`backend/`)

TypeScript with a hexagonal architecture:

- **`src/domain/`** holds the pure domain services without AWS dependencies (`WerteService`, `SzenarioService`, `ZusammenfassungService`) and the ports (`AIService`, `Cache`, `TestRepository`).
- **`src/infrastructure/`** holds the AWS implementations: `BedrockAIService`, `DynamoDBCache`, `DynamoDBTestRepository`.
- **`src/lambdas/`** holds thin Lambda entry points. Each exports `handler` and a `createHandler(deps)` factory for testing.
- **`src/werte.json`** contains 135 German values and is copied to `dist/` at build time. A value with `kontexte` is offered only in those contexts (e.g. Sexualität only in `privat` and `partnerschaft`), a value without it in every context. The other routes accept every known value regardless of context.

Each Lambda handler instantiates its services at module scope (cold start) via the factory. Handler paths use the `lambdas/` prefix (e.g. `lambdas/getSzenario.handler`).

The scenario and summary prompts are templates (`szenarioSystemPrompt`, `zusammenfassungSystemPrompt`) filled from `src/domain/kontext.ts`, which holds per context the target group, the typical scenes, the rule that keeps scenes inside the context, the worked example and the kind of tips. Both templates state that the test is for adults. A context can add its own rules to the scenario prompt (`zusatzregeln`) and to the summary prompt (`zusammenfassungsregeln`). Tests without a context (created before contexts existed) count as `STANDARD_KONTEXT` (`beruf`).

`SzenarioService.getOrCreate` caches by the alphabetically sorted value pair. The cache key is `{wert1}_{wert2}`, the version is a hash of the rendered system prompt and the user prompt, so each context has its own scenarios for the same pair, and changing a prompt or a value description invalidates the cached scenarios. `ZusammenfassungService` caches by the ordered top 5 values and a hash of the rendered system prompt.

The value descriptions in `werte.json` are written without reference to work, so that the context comes from the prompt alone. `src/domain/werte.test.ts` guards this.

#### API

| Route | Lambda | Purpose |
|-------|--------|---------|
| `GET /werte?kontext=` | `getWerte` | values offered in a context (default `beruf`, unknown context 400) |
| `GET /szenarien/{wert1}/{wert2}?kontext=` | `getSzenario` | scenario for a value pair in a context (cached; default `beruf`, unknown context 400) |
| `POST /szenarien/{wert1}/{wert2}/vote` | `voteSzenario` | up/down vote for a scenario version |
| `POST /tests` | `createTest` | create a test session; body `{ kontext }` (default `beruf`, unknown context 400) |
| `GET /tests/{testId}` | `getTest` | load a test; re-triggers summary generation if it is missing |
| `PUT /tests/{testId}/state` | `updateTestState` | save the frontend state; at `comparison-intro` it asynchronously invokes `prewarmSzenarien` |
| `POST /tests/{testId}/complete` | `completeTest` | store the results and start the `postTest` Step Function |
| `POST /tests/{testId}/email` | `sendEmail` | send the top 5 and the summary to an address via SES, once per test |
| `GET /statistik?kontext=` | `getStatistik` | number of completed tests and the weighted ranking of values, for one context or, without the parameter, in total |

All route keys in API Gateway carry the `/api` prefix (`GET /api/werte`), so CloudFront forwards paths unchanged. The table omits it.

Tests expire 12 months after creation (`AUFBEWAHRUNG_MONATE` in `src/domain/test.ts`). `DynamoDBTestRepository.create` sets `ttl`, and `get` treats an expired test as missing because DynamoDB deletes expired items only after a delay of up to a few days. `getTest` exposes the expiry as `ablaufAm`, which the results screen shows. Tests created before this change have no `ttl` and never expire.

`sendEmail` claims the test with a conditional write on `emailGesendetAm` before sending and removes the marker again if SES fails. The address is not stored. `getTest` exposes the marker as `emailGesendet`.

`completeTest` accepts only distinct, known values and receives the full ranking (up to 10 values). It increments running counters in the `{project}-statistik` table, one item per context (`pk = "werte"` for `beruf`, which keeps the counts from before contexts existed, and `pk = "werte#{kontext}"` otherwise): `tests` and one attribute `{rang}|{wert}` per ranked value. The total adds up all context items when read. `getStatistik` applies the point scale `PUNKTE` in `src/domain/statistik.ts` when reading, so changing the scale re-scores all past tests. The counters are independent of the tests table and its TTL.

`updateTestState` passes the test's stored context to `prewarmSzenarien`, which generates the scenarios for all pairs of the final values in that context in parallel. `completeTest` passes the context to the `postTest` Step Function. Both `prewarmSzenarien` and `updateTestState` accept at most `MAX_FINALE_WERTE` (10) distinct values, so one request costs at most 45 scenarios. The `postTest` Step Function runs `generateTestZusammenfassung` with retries and sets `zusammenfassungStatus = failed` if it fails.

#### Adding a context

1. Add the id to `KontextId` and an entry to `KONTEXTE` in `backend/src/domain/kontext.ts`.
2. Add the same id with title, description and icon to `app/src/kontexte.ts`.
3. Check the `kontexte` lists in `backend/src/werte.json`: restricted values are not offered in a new context unless it is added there.
4. Generate sample scenarios with `cd backend && AWS_PROFILE=phjardas pnpm beispielszenarien <kontext> 12` and check that they stay inside the context. The script calls Bedrock directly, without cache and without the daily budget.

#### Bedrock costs

`BedrockAIService` computes the gross cost of every call from the token usage (Sonnet 4.6: $3 per 1M input tokens, $15 per 1M output tokens, plus 19 % VAT, in USD) and returns it together with the result. Scenarios and summaries store their cost in the cache, and a cache hit reports the stored cost again. The test session holds `szenarienKosten` (set by `prewarmSzenarien` as the sum over all pairs) and `zusammenfassungKosten`. Costs of cached scenarios are therefore counted once per test. The costs are not shown anywhere yet.

#### Abuse protection

`BedrockAIService` checks a daily budget before every call and books the cost afterwards (`DynamoDBTagesbudget`, item `pk = "budget#{date}"` in the statistics table, limit `TAGESBUDGET_USD`). Above the limit the call throws, so scenarios fail and summaries end up `failed` until midnight UTC. The Bedrock Lambdas have reserved concurrency, and the API Gateway stage throttles all routes with tighter limits for creating, completing and emailing tests. Every API Lambda is wrapped in `nurUeberCloudFront`, which rejects requests without the `x-origin-verify` header that CloudFront adds (`ORIGIN_SECRET`). Per-IP rate limiting comes from the WAF of the free CloudFront flat-rate plan, which is subscribed by hand (see README).

### Infrastructure (`infra/`)

OpenTofu manages all AWS resources in `eu-central-1`:

- **API Gateway v2 (HTTP API)** with CORS, routing to the Lambdas.
- **Lambda** (Node.js, arm64). All functions share one zip, built by Terraform's `archive_file` data source from `backend/dist/`.
- **Step Functions**: `{project}-postTest` for the summary.
- **DynamoDB**: `{project}-szenarien` (scenario and summary cache, keys `pk` and `version`), `{project}-statistik` (statistics counters, one item per context) and `{project}-tests` (test sessions, key `testId`, TTL on the `ttl` attribute).
- **S3, CloudFront, ACM, Route53** for the custom domain.
- **SES** (`infra/ses.tf`): domain identity for `var.domain` with DKIM and the MAIL FROM domain `mail.{domain}` (SPF). Emails come from `Werte Kompass <noreply@{domain}>`.
- **CloudWatch**: all Lambdas log to the single group `/aws/lambda/{project}` (30 days retention). Metric filters on that group and a dashboard cover cache hits, misses and generation errors.
- **State backend**: S3 bucket `phjardas-infrastructure`, passed to `tofu init` via `-backend-config` (GitHub variable `STATE_BUCKET`).

`project` is `werte-preview` for the preview environment and `werte` for production.

### CloudFront URL structure

| Path | Destination | Notes |
|------|-------------|-------|
| `/assets/*` | S3 | Vite hashed bundles (long cache) |
| `/api/*` | API Gateway | forwarded unchanged, with the `x-origin-verify` header |
| everything else | S3 | React SPA and public files; S3 answers 403 for client-side routes and the custom error response serves `/index.html` |

### Adding frontend routes

New routes in `app/src/routes.tsx` need no CloudFront changes, because the 403 error response serves `/index.html` for every path without an S3 object. The distribution cannot use CloudFront Functions or custom response headers policies, because the free flat-rate plan does not allow them. The CSP is therefore a `<meta>` tag that `app/vite.config.ts` injects at build time (not in dev, where it would block calls to the preview API). Error responses apply to the API as well, so the API must never return 403 through CloudFront.

### CI/CD (`.github/workflows/deploy.yml`)

A single `deploy` job runs on every push to `main` (preview environment) and on every published release (production). It tests and builds the backend, builds the React app, runs `tofu apply`, syncs `app/dist/` to the S3 bucket and invalidates CloudFront. The Playwright test does not run in CI.
