# Rate Limiting

This project uses a token-bucket rate limiter for all oRPC procedures exposed through:

- `/rpc/*`
- generated `/api/*` OpenAPI procedure routes

The limiter is enforced on the server and complemented by client-side `429` handling in the web app.

## Scope

Applies to all oRPC procedures except:

- `healthCheck`

Does not apply to:

- Better Auth routes under `/api/auth/*`
- existing REST routes under `/api/v1/*`

## Implementation

Server-side enforcement is implemented in:

- [apps/server/src/lib/rate-limit.ts](/Users/sayantan/Developer/webapps/cricket247/apps/server/src/lib/rate-limit.ts)
- [apps/server/src/lib/orpc.ts](/Users/sayantan/Developer/webapps/cricket247/apps/server/src/lib/orpc.ts)
- [apps/server/src/lib/context.ts](/Users/sayantan/Developer/webapps/cricket247/apps/server/src/lib/context.ts)
- [apps/server/src/index.ts](/Users/sayantan/Developer/webapps/cricket247/apps/server/src/index.ts)
- [apps/server/src/openapi.ts](/Users/sayantan/Developer/webapps/cricket247/apps/server/src/openapi.ts)
- [apps/server/src/worker.ts](/Users/sayantan/Developer/webapps/cricket247/apps/server/src/worker.ts)
- [apps/server/wrangler.jsonc](/Users/sayantan/Developer/webapps/cricket247/apps/server/wrangler.jsonc)

Web client handling is implemented in:

- [apps/web/src/utils/orpc.ts](/Users/sayantan/Developer/webapps/cricket247/apps/web/src/utils/orpc.ts)

## Bucket Model

All buckets use flat cost `1` per request.

Configured buckets:

- `public`: capacity `120`, refill `2 tokens/sec`
- `protected`: capacity `60`, refill `1 token/sec`
- `sensitive`: capacity `20`, refill `0.25 tokens/sec`
- `scoring`: capacity `60`, refill `1 token/sec`

Tier mapping:

- `publicProcedure` -> `public`
- `protectedProcedure` -> `protected`
- `sensitiveProcedure` -> `sensitive`

Scoring override:

- high-frequency live scoring write procedures in `scoring.router.ts` use `scoring` instead of `sensitive`

## Principal Keying

Bucket keys are transport-independent and shared between `/rpc` and `/api`.

Identity rules:

- unauthenticated: `ip:<client-ip>`
- authenticated with IP: `user:<user-id>:ip:<client-ip>`
- authenticated without IP fallback: `user:<user-id>` or `user:<email>`
- final fallback: `anonymous`

Client IP resolution order:

1. `CF-Connecting-IP`
2. first IP from `X-Forwarded-For`
3. `X-Real-IP`

## Storage and Runtime Behavior

Production/shared enforcement uses a Cloudflare Durable Object:

- binding name: `RATE_LIMITER`
- class name: `RateLimitDurableObject`

Wrangler migration:

- migration tag: `v1`

No manual Durable Object instance creation is required. Deploying the API worker with the updated Wrangler config registers the class and binding.

Local behavior:

- if the Durable Object binding is unavailable, the server falls back to in-memory token buckets
- if the limiter backend errors or times out during a request, the request is allowed through and the failure is logged

## Response Contract

Successful and rate-limited responses include:

- `RateLimit-Limit`
- `RateLimit-Remaining`
- `RateLimit-Reset`

Rate-limited responses also include:

- HTTP status `429`
- `Retry-After`

For oRPC responses, the body is returned through the ORPC error envelope with:

- code `TOO_MANY_REQUESTS`
- message `Too many requests`
- status `429`
- `data.retryAfter`

For generated OpenAPI docs, `429` responses and headers are added to the generated spec for all non-exempt oRPC procedures.

## Web Client Behavior

The web oRPC/TanStack Query client:

- does not retry `429` query failures
- shows a clearer toast for rate-limited responses
- includes the retry delay in the message when available

## Deployment

Required Cloudflare change:

- deploy the API worker with the updated [apps/server/wrangler.jsonc](/Users/sayantan/Developer/webapps/cricket247/apps/server/wrangler.jsonc)

No new environment variables or secrets are required for rate limiting.

## Verification

Implemented tests:

- [apps/server/src/lib/rate-limit.test.ts](/Users/sayantan/Developer/webapps/cricket247/apps/server/src/lib/rate-limit.test.ts)
- [apps/server/src/rate-limit.integration.test.ts](/Users/sayantan/Developer/webapps/cricket247/apps/server/src/rate-limit.integration.test.ts)
- [apps/web/src/utils/orpc.test.ts](/Users/sayantan/Developer/webapps/cricket247/apps/web/src/utils/orpc.test.ts)

Validated with:

- `bun run check`
- `bun run check-types` in `apps/server`
- `bun run check-types` in `apps/web`
- targeted server and web tests for limiter behavior
