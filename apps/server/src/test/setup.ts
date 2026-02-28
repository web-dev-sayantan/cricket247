const envDefaults = {
  DATABASE_URL: "file:local-test.db",
  DATABASE_AUTH_TOKEN: "test-token",
  BETTER_AUTH_SECRET: "test-secret",
  BETTER_AUTH_URL: "http://localhost:3000",
  CORS_ORIGIN: "http://localhost:3001",
  RESEND_API_KEY: "re_test_key",
  GOOGLE_CLIENT_ID: "test-google-client-id",
  GOOGLE_CLIENT_SECRET: "test-google-client-secret",
  FACEBOOK_CLIENT_ID: "test-facebook-client-id",
  FACEBOOK_CLIENT_SECRET: "test-facebook-client-secret",
} as const;

for (const [key, value] of Object.entries(envDefaults)) {
  if (!process.env[key]) {
    process.env[key] = value;
  }
}
