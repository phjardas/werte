# Werte Kompass

Werte Kompass is a free web app, in German, that helps people find out which personal values matter most to them at work. It runs at [werte.jardas.de](https://werte.jardas.de).

The test takes a few minutes. You first pick the values that appeal to you from a list of 120. If you pick more than ten, you narrow them down to your top ten. The app then shows you pairs of values in short, everyday work situations and asks which way you would act. A Swiss-system tournament turns those choices into a ranking, and at the end you get your top five values together with a short personal summary. Both the scenarios and the summary are written by Claude through AWS Bedrock. Scenarios are cached, so most pairs load instantly.

## Repository layout

| Directory | Contents |
|-----------|----------|
| `app/` | React 19 single-page app built with Vite and TanStack Router |
| `backend/` | TypeScript Lambda functions with a small hexagonal domain layer (`src/domain/`) and AWS adapters (`src/infrastructure/`) |
| `infra/` | OpenTofu configuration for API Gateway, Lambda, DynamoDB, Step Functions, S3 and CloudFront |

The list of values with their descriptions lives in `backend/src/werte.json`. The prompts that generate scenarios and summaries are in `backend/src/domain/szenario.ts` and `backend/src/domain/zusammenfassung.ts`.

## Running locally

You need Node.js 26 and [pnpm](https://pnpm.io). The project uses pnpm throughout, so please don't use npm or yarn.

The frontend runs locally and talks to the preview API by default, so no AWS account is needed to work on the UI:

```bash
cd app
pnpm install
pnpm dev        # http://localhost:5173, API at https://preview.werte.jardas.de/api
```

To use a different backend, set `VITE_API_BASE_URL` before starting Vite.

The backend has no local server. Its domain logic and Lambda handlers are covered by unit tests that mock all AWS services:

```bash
cd backend
pnpm install
pnpm test       # vitest
pnpm typecheck
pnpm build      # compiles to backend/dist/
```

## Tests

`backend/` has unit tests run with Vitest, as shown above.

`app/` has a Playwright end-to-end test that clicks through the whole flow against a running app. It calls the real API and waits for AI-generated content, so a run can take a few minutes.

```bash
cd app
pnpm exec playwright install chromium   # first time only
pnpm dev                                 # in a separate terminal
pnpm test:e2e
```

Set `E2E_BASE_URL` to run the test against a deployed environment instead of `localhost:5173`.

## Deployment

Every push to `main` deploys to the preview environment, and every published GitHub release deploys to production. The workflow in `.github/workflows/deploy.yml` tests and builds the backend, builds the app, applies the OpenTofu configuration and uploads the app to S3. Deploying your own copy needs an AWS account with Bedrock access to Claude and a Route 53 hosted zone. See `infra/` and the workflow for the required variables.

## Contributing

Contributions are welcome, whether that is a bug report, an idea, a better scenario prompt, a fix for a value description or a pull request. If you find a scenario that doesn't make sense, please open an issue with the two values involved and the text you saw. That kind of feedback is the most useful input for improving the prompts.

For larger changes, it helps to open an issue first so we can agree on the direction. Please run `pnpm test` in `backend/` and `pnpm build` in `app/` before sending a pull request. The user-facing texts and prompts are in German and address the user informally with "du". Please keep it that way.

## License

Werte Kompass is released under the [MIT License](LICENSE).
