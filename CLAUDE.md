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

German values-discovery app for the business context. Users select values, compare them pairwise in a Swiss-system tournament, and see their top 5 values together with a personal summary. Claude Sonnet 4.6 on AWS Bedrock generates a workplace scenario for each value pair and the final summary.

### Frontend (`app/`)

- React 19, Vite and TypeScript, deployed to S3 and CloudFront at `werte.jardas.de`.
- TanStack Router v1, routes defined in `app/src/routes.tsx`:
  - `/` (`FreePage`) creates a new test via `POST /tests` and redirects to `/tests/$testId`.
  - `/tests/$testId` (`TestSessionPage`) loads the test. A completed test shows `ResultsScreen`, an active one resumes the flow.
  - `/statistik` (`StatistikPage`) shows the number of completed tests and the top 10 values by points.
  - `/impressum` (`ImpressumPage`).
- Flow steps (`Step` in `app/src/types.ts`): `intro → selection → filter → comparison-intro → comparison`, then the results screen. The filter step is skipped when 10 or fewer values are selected.
- The test state is saved to the backend after every change (`useStateSync`, `PUT /tests/{testId}/state`), so a test can be resumed via its URL.
- Tournament logic lives in `app/src/hooks/useTournament.ts`: Swiss system with Buchholz tiebreaking, `ceil(log2(n))` rounds.
- `useZusammenfassung` polls `GET /tests/{testId}` until the summary is ready. `ResultsScreen` highlights the top 5 values in the summary text (whole words, case-sensitive).
- The API base URL in `app/src/api.ts` defaults to the CloudFront `/api` path and can be set via `VITE_API_BASE_URL`.

### Backend (`backend/`)

TypeScript with a hexagonal architecture:

- **`src/domain/`** holds the pure domain services without AWS dependencies (`WerteService`, `SzenarioService`, `ZusammenfassungService`) and the ports (`AIService`, `Cache`, `TestRepository`).
- **`src/infrastructure/`** holds the AWS implementations: `BedrockAIService`, `DynamoDBCache`, `DynamoDBTestRepository`.
- **`src/lambdas/`** holds thin Lambda entry points. Each exports `handler` and a `createHandler(deps)` factory for testing.
- **`src/werte.json`** contains 120 German values and is copied to `dist/` at build time.

Each Lambda handler instantiates its services at module scope (cold start) via the factory. Handler paths use the `lambdas/` prefix (e.g. `lambdas/getSzenario.handler`).

`SzenarioService.getOrCreate` caches by the alphabetically sorted value pair. The cache key is `{wert1}_{wert2}`, the version is a hash of the system prompt and the user prompt, so changing a prompt or a value description invalidates the cached scenarios. `ZusammenfassungService` caches by the ordered top 5 values and a hash of its system prompt.

#### API

| Route | Lambda | Purpose |
|-------|--------|---------|
| `GET /werte` | `getWerte` | list of all values |
| `GET /szenarien/{wert1}/{wert2}` | `getSzenario` | scenario for a value pair (cached) |
| `POST /szenarien/{wert1}/{wert2}/vote` | `voteSzenario` | up/down vote for a scenario version |
| `POST /tests` | `createTest` | create a test session |
| `GET /tests/{testId}` | `getTest` | load a test; re-triggers summary generation if it is missing |
| `PUT /tests/{testId}/state` | `updateTestState` | save the frontend state; at `comparison-intro` it asynchronously invokes `prewarmSzenarien` |
| `POST /tests/{testId}/complete` | `completeTest` | store the results and start the `postTest` Step Function |
| `POST /tests/{testId}/email` | `sendEmail` | send the top 5 and the summary to an address via SES, once per test |
| `POST /zusammenfassung` | `getZusammenfassung` | summary for 5 values without a test |
| `GET /statistik` | `getStatistik` | number of completed tests and the weighted ranking of values |

`sendEmail` claims the test with a conditional write on `emailGesendetAm` before sending and removes the marker again if SES fails. The address is not stored. `getTest` exposes the marker as `emailGesendet`.

`completeTest` accepts only distinct, known values and receives the full ranking (up to 10 values). It increments running counters in the `{project}-statistik` table: `tests` and one attribute `{rang}|{wert}` per ranked value. `getStatistik` applies the point scale `PUNKTE` in `src/domain/statistik.ts` when reading, so changing the scale re-scores all past tests. The counters are independent of the tests table and its TTL.

`prewarmSzenarien` generates the scenarios for all pairs of the final values in parallel. The `postTest` Step Function runs `generateTestZusammenfassung` with retries and sets `zusammenfassungStatus = failed` if it fails.

#### Bedrock costs

`BedrockAIService` computes the gross cost of every call from the token usage (Sonnet 4.6: $3 per 1M input tokens, $15 per 1M output tokens, plus 19 % VAT, in USD) and returns it together with the result. Scenarios and summaries store their cost in the cache, and a cache hit reports the stored cost again. The test session holds `szenarienKosten` (set by `prewarmSzenarien` as the sum over all pairs) and `zusammenfassungKosten`. Costs of cached scenarios are therefore counted once per test. The costs are not shown anywhere yet.

### Infrastructure (`infra/`)

OpenTofu manages all AWS resources in `eu-central-1`:

- **API Gateway v2 (HTTP API)** with CORS, routing to the Lambdas.
- **Lambda** (Node.js, arm64). All functions share one zip, built by Terraform's `archive_file` data source from `backend/dist/`.
- **Step Functions**: `{project}-postTest` for the summary.
- **DynamoDB**: `{project}-szenarien` (scenario and summary cache, keys `pk` and `version`), `{project}-statistik` (statistics counters, one item with key `pk = "werte"`) and `{project}-tests` (test sessions, key `testId`, TTL configured on the `ttl` attribute, which the code does not set yet).
- **S3, CloudFront, ACM, Route53** for the custom domain.
- **SES** (`infra/ses.tf`): domain identity for `var.domain` with DKIM and the MAIL FROM domain `mail.{domain}` (SPF). Emails come from `Werte Kompass <noreply@{domain}>`.
- **CloudWatch** log groups, metric filters and a dashboard for cache hits, misses and generation errors.
- **State backend**: S3 bucket `phjardas-infrastructure`, passed to `tofu init` via `-backend-config` (GitHub variable `STATE_BUCKET`).

`project` is `werte-preview` for the preview environment and `werte` for production.

### CloudFront URL structure

| Path | Destination | Notes |
|------|-------------|-------|
| `/assets/*` | S3 | Vite hashed bundles (long cache) |
| `/api/*` | API Gateway | the `api_rewrite` function strips the `/api` prefix before forwarding |
| everything else | S3 | React SPA and public files; the `spa_router` CloudFront function rewrites every path without a file extension to `/index.html` |

### Adding frontend routes

New routes in `app/src/routes.tsx` need no CloudFront changes, because `spa_router` already rewrites every extensionless path to `/index.html`.

### CI/CD (`.github/workflows/deploy.yml`)

A single `deploy` job runs on every push to `main` (preview environment) and on every published release (production). It tests and builds the backend, builds the React app, runs `tofu apply`, syncs `app/dist/` to the S3 bucket and invalidates CloudFront. The Playwright test does not run in CI.
