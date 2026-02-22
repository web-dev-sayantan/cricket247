import { passkeyClient } from "@better-auth/passkey/client";
import { emailOTPClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

const baseURL =
  import.meta.env.VITE_SERVER_URL ||
  (typeof window === "undefined" ? "" : window.location.origin);

export const authClient = createAuthClient({
  baseURL,
  plugins: [emailOTPClient(), passkeyClient()],
});
