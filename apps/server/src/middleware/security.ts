import type { Context, Next } from "hono";

const API_CSP = [
  "default-src 'none'",
  "base-uri 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
].join("; ");

const DOCS_CSP = [
  "default-src 'self' https:",
  "script-src 'self' https: 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' https: 'unsafe-inline'",
  "img-src 'self' https: data:",
  "connect-src 'self' https: wss:",
  "frame-ancestors 'none'",
].join("; ");

function isSecureRequest(c: Context) {
  const requestUrl = new URL(c.req.url);
  const forwardedProto = c.req.header("x-forwarded-proto");

  return requestUrl.protocol === "https:" || forwardedProto === "https";
}

function isDocsPath(pathname: string) {
  return pathname.startsWith("/api/docs") || pathname === "/api/openapi.yaml";
}

export async function securityHeadersMiddleware(c: Context, next: Next) {
  await next();

  c.header("Referrer-Policy", "no-referrer");
  c.header("X-Content-Type-Options", "nosniff");
  c.header("X-Frame-Options", "DENY");
  c.header("Permissions-Policy", "camera=(), geolocation=(), microphone=()");

  if (isSecureRequest(c)) {
    c.header(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    );
  }

  const pathname = c.req.path;
  c.header(
    "Content-Security-Policy",
    isDocsPath(pathname) ? DOCS_CSP : API_CSP
  );
}
