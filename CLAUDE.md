# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **Package manager:** Always use **pnpm** instead of npm. This applies everywhere in this repository.

## Commands

### Frontend (app/)

```bash
cd app
pnpm install          # install dependencies
pnpm dev              # start dev server at localhost:5173
pnpm build            # tsc -b && vite build && cp dist/index.html dist/404.html
```

### Backend (`backend/`)

TypeScript source compiled to `backend/dist/` before deployment.

```bash
cd backend
pnpm install          # install dependencies
pnpm test             # run tests (vitest, no build needed)
pnpm build            # tsc + copy werte.json → dist/
```

### Infrastructure (infra/)

```bash
cd infra
tofu init             # initialise providers and S3 backend
tofu plan             # preview changes
tofu apply            # deploy to AWS (auto-approved in CI)
```

Before running tofu, build the backend:

```bash
cd backend && pnpm install && pnpm build
```

## Architecture

### Overview

German values-discovery app. Users select values, compare them in tournament-bracket pairs, and see their top 5 ranked results. Comparisons use Claude AI (via AWS Bedrock) to generate contextual scenarios for each pair.

### Frontend (`app/`)

- **React 19 + Vite + TypeScript**, deployed to S3 + CloudFront at `werte.jardas.de`
- **TanStack Router v1** for routing — single route `/` renders `TestPage`
- Flow state machine inside `TestPage`: `selection → filter → comparison → results`
- Tournament logic lives in `app/src/hooks/useTournament.ts` — Swiss-system algorithm with Buchholz tiebreaking, `ceil(log2(n))` rounds
- API base URL in `app/src/api.ts` defaults to the CloudFront `/api` path (configurable via `VITE_API_BASE_URL`)

### Backend (`backend/`)

TypeScript, hexagonal architecture:

- **`src/domain/`** — pure domain services (zero AWS deps): `WerteService`, `SzenarioService`, `ZusammenfassungService`, repository interfaces
- **`src/infrastructure/`** — AWS implementations: `BedrockAIService`, `DynamoDBCache`, `DynamoDBTestRepository`
- **`src/lambdas/`** — thin Lambda entry points, each exporting `handler` and a `createHandler(deps)` factory for testing
- **`werte.json`** — 81 German values, copied to `dist/` at build time

Each Lambda handler instantiates services at module scope (cold start) via the factory. Lambda handler paths use the `lambdas/` prefix (e.g. `lambdas/getSzenario.handler`).

`SzenarioService.getOrCreate` caches by hash of sorted value pair + system prompt. Cache key: `{wert1}_{wert2}` (alphabetically sorted).

### Infrastructure (`infra/`)

OpenTofu (Terraform fork) manages all AWS resources:

- **API Gateway v2 (HTTP API)** — CORS enabled, routes to Lambdas
- **DynamoDB** — `werte-szenarien` (scenario cache), `werte-tests` (test sessions, TTL enabled)
- **S3 + ACM + Route53** — Custom domain `werte.jardas.de`
- **State backend** — S3 bucket `phjardas-terraform`
- Lambda zip is built by Terraform's `archive_file` data source from `backend/dist/`; all functions share one zip, handlers use `lambdas/` prefix (e.g. `lambdas/getWerte.handler`)

### CloudFront URL structure

| Path | Destination | Notes |
|------|-------------|-------|
| `/assets/*` | S3 | Vite hashed bundles (long cache) |
| `/api/*` | API Gateway | REST API — the `api_rewrite` function strips the `/api` prefix before forwarding |
| everything else | S3 | React SPA and public files — the `spa_router` CloudFront function rewrites every path without a file extension to `/index.html` |

### Adding frontend routes

When adding a new route to the React app (`app/src/routes.tsx`), no changes to CloudFront are needed, because the `spa_router` function already rewrites every extensionless path to `/index.html`.

### CI/CD (`.github/workflows/deploy.yml`)

A single `deploy` job runs on every push to `main` (preview environment) and on every published release (production). It tests and builds the backend, builds the React app, runs `tofu apply`, syncs `app/dist/` to the S3 bucket and invalidates CloudFront.
