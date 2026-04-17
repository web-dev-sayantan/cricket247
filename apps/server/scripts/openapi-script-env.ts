const OPENAPI_SCRIPT_ENV_DEFAULTS = {
  BETTER_AUTH_SECRET: 'openapi-spec-secret',
  BETTER_AUTH_URL: 'http://localhost:3000',
  CORS_ORIGIN: 'http://localhost:3001',
  FACEBOOK_CLIENT_ID: 'openapi-facebook-client-id',
  FACEBOOK_CLIENT_SECRET: 'openapi-facebook-client-secret',
  GOOGLE_CLIENT_ID: 'openapi-google-client-id',
  GOOGLE_CLIENT_SECRET: 'openapi-google-client-secret',
  RESEND_API_KEY: 'openapi-resend-api-key',
} as const;

export function ensureOpenApiScriptEnv() {
  for (const [key, value] of Object.entries(OPENAPI_SCRIPT_ENV_DEFAULTS)) {
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}