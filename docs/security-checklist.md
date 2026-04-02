# Cricket247 Security Hardening Checklist

Last updated: 2026-04-02

## Severity legend

- [CRITICAL] Immediate risk, fix now
- [HIGH] High impact or high likelihood
- [MEDIUM] Important hardening item
- [LOW] Nice-to-have hardening

## 0. Immediate containment (today)

- [ ] [CRITICAL] Rotate all local and cloud credentials that were present in local env files.
- [ ] [CRITICAL] Verify no secrets were ever committed in git history (`git log -p -- .env* apps/server/.env*`).
- [ ] [CRITICAL] If any secret was committed, purge history and rotate again.
- [ ] [HIGH] Disable verbose deploy logs in CI (`WRANGLER_LOG=debug`) unless actively debugging incidents.

## 1. Authorization and access control

- [ ] [CRITICAL] Enforce admin authorization for `createMatch` in ORPC (currently only authenticated via `sensitiveProcedure`).
- [ ] [HIGH] Add a dedicated `adminProcedure` middleware instead of repeated `requireAdminByEmail` calls inside handlers.
- [ ] [HIGH] Centralize role checks in middleware to prevent missing one-off checks.
- [ ] [HIGH] Add tests that assert non-admin users cannot call every mutating ORPC endpoint.
- [ ] [MEDIUM] Add explicit authorization matrix documentation for all endpoints (public/protected/sensitive/admin/scorer).
- [ ] [MEDIUM] Ensure scoring permissions are tested for cross-team and cross-tournament abuse attempts.

## 2. Rate limiting and abuse resistance

- [ ] [CRITICAL] Change rate limiter from fail-open to controlled fail-safe for sensitive mutations.
- [ ] [HIGH] Add REST route rate limiting (currently rate limits are implemented for ORPC only).
- [ ] [HIGH] Add brute-force controls for OTP claim/verify flows (per IP + per account + per playerId).
- [ ] [HIGH] Emit rate-limit events/metrics for anomaly detection.
- [ ] [MEDIUM] Add exponential backoff response strategy for repeated abuse.
- [ ] [MEDIUM] Add dedicated bucket limits for upload endpoints and auth endpoints.

## 3. HTTP and browser security hardening

- [ ] [HIGH] Add security response headers globally: `Content-Security-Policy`, `Strict-Transport-Security`, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`.
- [ ] [HIGH] Add CSRF validation tests for cookie-authenticated state-changing routes.
- [ ] [MEDIUM] Narrow CORS origins to production/staging explicit hostnames only.
- [ ] [MEDIUM] Review `sameSite="none"` usage and document required cross-site behavior.

## 4. Secrets management

- [ ] [CRITICAL] Keep all secrets out of tracked files and build artifacts.
- [ ] [HIGH] Add CI check to fail PRs if secret-like patterns are detected (gitleaks/trufflehog).
- [ ] [HIGH] Add periodic key rotation runbook (Cloudflare, OAuth, Resend, R2).
- [ ] [MEDIUM] Use separate secrets per environment (dev/stage/prod) with strict least privilege.
- [ ] [MEDIUM] Define max token lifetimes and secret rotation cadence policy.

## 5. Dependency and supply-chain security

- [ ] [CRITICAL] Fix current vulnerable dependency graph (`bun audit` currently reports high/moderate issues).
- [ ] [HIGH] Add `bun audit` (or equivalent) as required CI gate for PR and main.
- [ ] [HIGH] Pin GitHub Actions to full commit SHAs instead of floating tags (`@v4`, `@v2`).
- [ ] [HIGH] Add Dependabot/Renovate for automated security updates.
- [ ] [MEDIUM] Generate and publish SBOM for release builds.
- [ ] [MEDIUM] Define policy for max allowed CVSS score in production dependencies.

## 6. CI/CD and deployment hardening

- [ ] [HIGH] Add explicit GitHub Actions `permissions:` with least privilege per workflow/job.
- [ ] [HIGH] Use protected deployment environments with required reviewers for production.
- [ ] [HIGH] Split deployment by environment and require successful security gates before production deploy.
- [ ] [MEDIUM] Add SAST and secret scanning workflows on pull requests.
- [ ] [MEDIUM] Add IaC/config checks for Wrangler/Cloudflare config drift.
- [ ] [LOW] Add provenance/attestation for build artifacts.

## 7. Data protection and privacy

- [ ] [HIGH] Classify data (PII/auth/session) and document retention/deletion policy.
- [ ] [HIGH] Ensure OTP and auth logs never include sensitive content.
- [ ] [MEDIUM] Add data minimization checks to API responses.
- [ ] [MEDIUM] Confirm profile image bucket policy and public URL strategy match privacy requirements.

## 8. Monitoring, alerting, and incident response

- [ ] [HIGH] Add security alerting for auth failures, OTP abuse, and privilege-denied spikes.
- [ ] [HIGH] Add runbook for credential compromise response.
- [ ] [MEDIUM] Add dashboard for rate-limiter availability and fallback activation.
- [ ] [MEDIUM] Add audit log coverage for admin-only operations.

## 9. Testing and verification

- [ ] [CRITICAL] Add regression test for unauthorized `createMatch` mutation.
- [ ] [HIGH] Add role-based authorization integration tests for all sensitive mutations.
- [ ] [HIGH] Add negative tests for mass assignment and invalid enum/ID transitions.
- [ ] [MEDIUM] Add fuzz/property-based tests for scoring and onboarding mutation payloads.
- [ ] [MEDIUM] Add periodic security review checklist to release process.

## Suggested execution order

1. Rotate secrets and verify git history.
2. Fix authorization gap (`createMatch`) and add admin middleware.
3. Make sensitive rate limiting fail-safe and add REST rate limiting.
4. Patch vulnerable dependencies and enforce CI security gates.
5. Add headers/CSRF tests and deployment permission hardening.
6. Add security monitoring + runbooks.
