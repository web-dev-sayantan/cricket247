## Cloudflare-First Deployment Plan for Cricket247 (Solo, Cost-Capped)

### Summary
As of **February 20, 2026**, the best fit for your constraints is:
1. **All-in Cloudflare runtime** with two Workers (`web` public, `api` internal via Service Binding).
2. **Turso Free** for DB, **Resend Free** for OTP email.
3. **Auto deploy on `main`**, manual rollback using Cloudflare versioned deployments.
4. **Launch on `*.workers.dev` first**, then move to custom domain before broad public launch.

This gives the smoothest solo workflow while keeping month-1 cost at **$0**, with a clear upgrade path to **~$5** and then **~$10** only when needed.

### Current-state blockers to address first
1. `bun run check-types` currently fails with many web type errors, so a strict “deploy only if typecheck passes” gate will block releases immediately.
2. Env naming drift exists: server validation expects `BETTER_AUTH_URL` but auth code uses `BETTER_AUTH_APP_URL` in `/Users/sayantan/Developer/webapps/cricket247/apps/server/src/lib/auth.ts`.
3. No CI workflow is present yet in `/Users/sayantan/Developer/webapps/cricket247/.github/workflows/`.

### Target architecture (decision-complete)
1. **Public Worker**: `cricket247-web`
2. **Internal Worker**: `cricket247-api` (no public route initially)
3. **Routing model**:
   - Browser hits `cricket247-web.workers.dev`
   - `/api/*`, `/rpc/*`, `/api/auth/*` are handled by `cricket247-web` and forwarded to `cricket247-api` via Service Binding
   - All other paths serve SPA assets
4. **Why this shape**:
   - Keeps frontend and auth cookies on same origin even without custom domain
   - Preserves monorepo separation of web/server code
   - Avoids cross-origin CORS/cookie headaches while staying “all-in Cloudflare”

### Important interface/API/type changes
1. In `/Users/sayantan/Developer/webapps/cricket247/apps/web/src/lib/auth-client.ts`, move to same-origin default instead of hard dependency on `VITE_SERVER_URL`.
2. In `/Users/sayantan/Developer/webapps/cricket247/apps/web/src/utils/orpc.ts`, use relative `/rpc` base URL by default.
3. In `/Users/sayantan/Developer/webapps/cricket247/apps/server/src/lib/auth.ts`, standardize on **one** env var (`BETTER_AUTH_URL`) for OAuth redirect construction.
4. In `/Users/sayantan/Developer/webapps/cricket247/apps/web/wrangler.jsonc`, add:
   - `main`
   - `services` binding to API worker
   - `assets.binding`
   - `assets.run_worker_first` routes for `/api/*`, `/rpc/*`, `/api/auth/*`
5. Add web Worker entrypoint in `/Users/sayantan/Developer/webapps/cricket247/apps/web/src/worker.ts` for forwarding and static handling.
6. Add API Worker wrangler config in `/Users/sayantan/Developer/webapps/cricket247/apps/server/wrangler.jsonc`.
7. Keep server Bun local dev path, but add Worker-compatible entrypoint in `/Users/sayantan/Developer/webapps/cricket247/apps/server/src/worker.ts`.

### Rollout phases
1. **Phase 0 (Day 1): Release hardening**
   - Freeze deploy gating to build-only until type errors are reduced.
   - Fix env var drift (`BETTER_AUTH_URL` only).
   - Add production `.env` contract doc for both workers.
2. **Phase 1 (Day 2-3): Cloudflare runtime wiring**
   - Deploy `cricket247-api` worker first.
   - Deploy `cricket247-web` worker with Service Binding to `cricket247-api`.
   - Switch frontend API calls to relative paths.
   - Validate auth session cookies, OAuth callback, OTP flow on workers.dev.
3. **Phase 2 (Day 3): CI/CD**
   - Add GitHub Actions workflow:
     - On `push main`: `bun install`, `bun run build`, deploy API then web with `cloudflare/wrangler-action@v3`.
     - Keep rollback manual through Wrangler/dashboard.
4. **Phase 3 (Day 4): Reliability/ops**
   - Enable Workers logs and set alerting thresholds.
   - Document rollback runbook (`wrangler rollback`) and incident checklist.
5. **Phase 4 (After stability): Quality gate upgrade**
   - Burn down type errors.
   - Move CI gate from `build`-only to `build + check-types`.

### Cost plan and upgrade triggers
1. **Initial target (now): $0/month**
   - Workers Free
   - Turso Free
   - Resend Free (watch daily OTP ceiling)
2. **Upgrade trigger A: move to Workers Paid ($5/month)**
   - If request/CPU headroom becomes tight or logs/ops needs increase
3. **Upgrade trigger B: move to Turso Developer ($4.99/month)**
   - If Free DB limits or PITR window become restrictive
4. **Budget ceiling fit**
   - Workers Paid + Turso Developer = about **$9.99/month** before email scale plan

### Testing and acceptance scenarios
1. **Deploy smoke**
   - `/` SPA loads
   - `/api/v1/health` responds through web worker proxy
   - `/rpc/*` calls succeed with credentials
2. **Auth**
   - Email OTP signup/login works end-to-end
   - Session persists across page reload
   - OAuth callback works on workers.dev URL
3. **Failure handling**
   - API worker intentionally broken version can be rolled back in <5 minutes
   - Web worker still serves static assets during API rollback
4. **Data safety**
   - Validate Turso PITR recovery drill in staging
5. **Performance sanity**
   - P95 API latency and error rate baseline recorded before public launch

### Assumptions and defaults used
1. Launch starts on Cloudflare subdomain, custom domain comes later.
2. Early traffic is low-to-moderate (fits Workers Free initially).
3. You prefer minimal ops overhead over maximum platform portability.
4. Auto-deploy on `main` is enabled; previews are optional and can be added later.
5. Current typecheck debt is treated as a staged hardening task, not a launch blocker on day 1.

### Source links
1. [Cloudflare Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/)
2. [Cloudflare Pages limits](https://developers.cloudflare.com/pages/platform/limits/)
3. [Cloudflare Service Bindings](https://developers.cloudflare.com/workers/runtime-apis/bindings/service-bindings/)
4. [Cloudflare static assets + run_worker_first](https://developers.cloudflare.com/workers/static-assets/binding/)
5. [Cloudflare Node.js compatibility](https://developers.cloudflare.com/workers/runtime-apis/nodejs/)
6. [Cloudflare GitHub Actions deployment](https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/)
7. [Cloudflare Workers routes/domains guidance](https://developers.cloudflare.com/workers/configuration/routing/)
8. [Cloudflare rollbacks](https://developers.cloudflare.com/workers/configuration/versions-and-deployments/rollbacks/)
9. [Turso pricing](https://turso.tech/pricing)
10. [Turso point-in-time recovery](https://docs.turso.tech/features/point-in-time-recovery)
11. [Resend pricing](https://resend.com/pricing)
