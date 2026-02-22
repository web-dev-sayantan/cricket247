# Cloudflare Setup Guide (Cricket247)

This guide sets up Cloudflare for **both workers** and **R2 profile image uploads**.

It also includes a troubleshooting section for these exact errors:

- `POST /api/v1/uploads/profile-image/presign 500`
- `POST /api/v1/uploads/profile-image 500`

---

## 1) Prerequisites

- Cloudflare account with Workers + R2 enabled
- Turso database credentials
- OAuth provider credentials (Google/Facebook)
- Resend API key
- Bun + Wrangler CLI available in this repo

```bash
bunx wrangler login
```

---

## 2) Architecture used by this repo

- `cricket247-api` (server worker): Hono API, auth, DB access, upload endpoints
- `cricket247-web` (web worker): SPA + proxy to API
- R2 bucket binding on API worker: `PROFILE_IMAGES`

Image upload flow:

1. Web app calls `POST /api/v1/uploads/profile-image/presign`
2. API returns presigned `PUT` URL + final public image URL
3. Browser uploads directly to R2
4. Web app sends returned image URL in player profile/create payload
5. URL is stored in `players.image`

Fallback flow (if direct upload fails):

- Web app calls `POST /api/v1/uploads/profile-image`
- API worker uploads to R2 using bucket binding

---

## 3) Create/verify R2 bucket

Create an R2 bucket (example name used by current config):

- Bucket name: `cricket247-profile-images`

Current API worker binding in `apps/server/wrangler.jsonc`:

- Binding: `PROFILE_IMAGES`
- Bucket: `cricket247-profile-images`

If you use a different bucket name, update both:

- `apps/server/wrangler.jsonc` `r2_buckets[].bucket_name`
- runtime env var `PROFILE_IMAGES_BUCKET_NAME`

---

## 4) Configure API worker env/secrets

The upload endpoints require these vars:

### Required for **both** presign and fallback upload

- `PROFILE_IMAGES_PUBLIC_BASE_URL`

Example:

- `https://pub-<hash>.r2.dev`
- or custom domain URL like `https://images.yourdomain.com`

### Required for **presign** endpoint

- `PROFILE_IMAGES_BUCKET_NAME`
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`

### Optional

- `PROFILE_IMAGE_MAX_SIZE_BYTES` (default `5242880` = 5MB)

### Existing required API vars (already needed by project)

- `DATABASE_URL`
- `DATABASE_AUTH_TOKEN` (if required by your Turso setup)
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `CORS_ORIGIN`
- `RESEND_API_KEY`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `FACEBOOK_CLIENT_ID`
- `FACEBOOK_CLIENT_SECRET`
- `FACEBOOK_CLIENT_TOKEN` (optional)

---

## 5) Set secrets/vars in Cloudflare

Use Wrangler secrets for sensitive values:

```bash
cd apps/server
bun wrangler secret put DATABASE_URL --config wrangler.jsonc
bun wrangler secret put DATABASE_AUTH_TOKEN --config wrangler.jsonc
bun wrangler secret put BETTER_AUTH_SECRET --config wrangler.jsonc
bun wrangler secret put RESEND_API_KEY --config wrangler.jsonc
bun wrangler secret put GOOGLE_CLIENT_ID --config wrangler.jsonc
bun wrangler secret put GOOGLE_CLIENT_SECRET --config wrangler.jsonc
bun wrangler secret put FACEBOOK_CLIENT_ID --config wrangler.jsonc
bun wrangler secret put FACEBOOK_CLIENT_SECRET --config wrangler.jsonc
bun wrangler secret put FACEBOOK_CLIENT_TOKEN --config wrangler.jsonc
bun wrangler secret put R2_ACCESS_KEY_ID --config wrangler.jsonc
bun wrangler secret put R2_SECRET_ACCESS_KEY --config wrangler.jsonc
```

Set non-secret variables in Cloudflare Worker dashboard (`Settings -> Variables`) for `cricket247-api`:

- `BETTER_AUTH_URL`
- `CORS_ORIGIN`
- `PROFILE_IMAGES_PUBLIC_BASE_URL`
- `PROFILE_IMAGES_BUCKET_NAME`
- `R2_ACCOUNT_ID`
- `PROFILE_IMAGE_MAX_SIZE_BYTES` (optional)

> Tip: Keep `PROFILE_IMAGES_BUCKET_NAME` exactly equal to your R2 bucket name.

---

## 6) Configure R2 CORS (needed for direct browser PUT)

Add CORS rules on the R2 bucket to allow browser uploads:

- Allowed origins: your web origin(s), e.g. `https://<your-web-domain>`
- Allowed origins (local):
    <http://localhost:3001>,
    <http://127.0.0.1:3001>,
    (optional) your Cloudflare preview/web origin, e.g. https://[web-worker].workers.dev
- Allowed methods: `PUT`, `GET`, `HEAD`
- Allowed headers: `Content-Type`
- Expose headers: `ETag`
- Max age: `86400` (optional)

If CORS is missing, direct upload can fail and web will use fallback upload endpoint.

---

## 7) Deploy order

Deploy API first, then web:

```bash
bun wrangler deploy --config apps/server/wrangler.jsonc
cd apps/web && bun run build && bun wrangler deploy --config wrangler.jsonc
```

---

## 8) Local/dev notes

For local worker dev, ensure equivalent env vars are available to the API worker process.

If uploads fail locally, check:

- `PROFILE_IMAGES_PUBLIC_BASE_URL` set
- R2 binding `PROFILE_IMAGES` available in the worker runtime
- Presign vars set (`PROFILE_IMAGES_BUCKET_NAME`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`)

---

## 9) Troubleshooting the two 500s

### A) `POST /api/v1/uploads/profile-image/presign 500`

This endpoint returns 500 when either of these is missing:

- `PROFILE_IMAGES_PUBLIC_BASE_URL`
- `PROFILE_IMAGES_BUCKET_NAME`
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`

Action:

1. Set missing vars/secrets
2. Redeploy `cricket247-api`
3. Retry upload

### B) `POST /api/v1/uploads/profile-image 500`

Fallback endpoint returns 500 when either is missing:

- `PROFILE_IMAGES_PUBLIC_BASE_URL`
- R2 binding `PROFILE_IMAGES` in worker runtime

Action:

1. Verify `r2_buckets` binding in `apps/server/wrangler.jsonc`
2. Verify bucket exists and binding name is `PROFILE_IMAGES`
3. Redeploy `cricket247-api`

### C) If both endpoints fail

Most likely causes:

- `PROFILE_IMAGES_PUBLIC_BASE_URL` missing
- Worker not redeployed after config changes
- Binding exists in file but not active in deployed worker

---

## 10) Smoke-test checklist

After deployment:

1. Sign in to app
2. Go to onboarding/profile create
3. Upload JPEG/PNG/WebP under 5MB
4. Create profile/player
5. Verify `players.image` contains public R2 URL

Optional DB check via your existing DB tooling:

- Confirm `players.image` is non-null URL for newly created profile

---

## 11) Security/ops recommendations

- Rotate `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` periodically
- Keep `PROFILE_IMAGE_MAX_SIZE_BYTES` conservative (5MB default)
- Restrict R2 CORS origins to production domains only
- Add bucket lifecycle rules if you want automatic cleanup for abandoned uploads
