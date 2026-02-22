# Cloudflare Deployment Runbook

This project deploys as two Cloudflare Workers:

- `cricket247-api`: Internal API worker (Hono + Better Auth + Drizzle/Turso)
- `cricket247-web`: Public worker (SPA assets + proxy to API via Service Binding)

## Architecture

1. Browser requests `cricket247-web` (`*.workers.dev` initially).
2. `cricket247-web` forwards `/api/*` and `/rpc/*` to the `cricket247-api` service binding.
3. Non-API requests are served as SPA assets from `apps/web/dist/client`.

## Production Environment Contract

### API worker (`apps/server/wrangler.jsonc`)

Set these as Worker secrets/vars:

- `DATABASE_URL`
- `DATABASE_AUTH_TOKEN` (optional for local/emulator; required for Turso prod)
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `CORS_ORIGIN`
- `RESEND_API_KEY`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `FACEBOOK_CLIENT_ID`
- `FACEBOOK_CLIENT_SECRET`
- `FACEBOOK_CLIENT_TOKEN` (optional)

### Web worker (`apps/web/wrangler.jsonc`)

No required runtime secret by default when using same-origin `/rpc` and `/api/auth`.

`VITE_SERVER_URL` remains optional for non-standard environments.

## First-Time Setup

1. Authenticate Wrangler:
   - `bunx wrangler login`
2. Ensure worker names are available:
   - `cricket247-api`
   - `cricket247-web`
3. Add API worker secrets (repeat for each key):
   - `bunx wrangler secret put DATABASE_URL --config apps/server/wrangler.jsonc`
4. Deploy API worker:
   - `bunx wrangler deploy --config apps/server/wrangler.jsonc`
5. Deploy web worker:
   - `cd apps/web && bun run build && bunx wrangler deploy --config wrangler.jsonc`

## CI/CD

GitHub Actions workflow: `.github/workflows/deploy-cloudflare.yml`

- Trigger: push to `main`
- Gate: `bun run build` only (no typecheck gate yet)
- Deploy order:
  1. `cricket247-api`
  2. `cricket247-web`

Required GitHub secrets:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

## Smoke Tests After Deploy

1. `GET /` loads SPA.
2. `GET /api/v1/health` returns success JSON through web worker.
3. `/rpc/*` calls succeed with cookies (`credentials: include`).
4. Email OTP signup/signin works.
5. OAuth callback returns to app correctly via `BETTER_AUTH_URL`.

## Rollback Runbook

1. Identify last known good deployment in Cloudflare dashboard.
2. Roll back API first if backend regression:
   - `bunx wrangler rollback --name cricket247-api`
3. Roll back web if frontend/proxy regression:
   - `bunx wrangler rollback --name cricket247-web`
4. Re-run smoke tests.

Target rollback window: under 5 minutes.

## Incident Checklist

1. Check Worker logs for both services.
2. Confirm Turso connectivity and auth token validity.
3. Validate `BETTER_AUTH_URL` and `CORS_ORIGIN` against deployed URL.
4. Verify Resend API quota and API key validity.
5. If auth-specific incident: test `/api/auth/session` and OTP flow first.

## Observability Baseline

Track and alert on:

- API error rate > 2% over 5 minutes
- P95 API latency > 800ms over 5 minutes
- OTP failure spikes (provider or callback regressions)

Start with dashboard alerts; add external uptime checks once custom domain is added.
