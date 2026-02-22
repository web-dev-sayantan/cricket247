interface App {
  fetch: (request: Request) => Response | Promise<Response>;
}

interface WorkerEnv {
  BETTER_AUTH_SECRET?: string;
  BETTER_AUTH_URL?: string;
  CORS_ORIGIN?: string;
  DATABASE_AUTH_TOKEN?: string;
  DATABASE_URL?: string;
  FACEBOOK_CLIENT_ID?: string;
  FACEBOOK_CLIENT_SECRET?: string;
  FACEBOOK_CLIENT_TOKEN?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  NODE_ENV?: string;
  PORT?: string;
  RESEND_API_KEY?: string;
}

let appPromise: Promise<App> | null = null;

const hydrateProcessEnv = (env: WorkerEnv) => {
  for (const [key, value] of Object.entries(env)) {
    if (typeof value === "string" && value.length > 0) {
      process.env[key] = value;
    }
  }
};

const loadApp = (env: WorkerEnv) => {
  hydrateProcessEnv(env);

  if (!appPromise) {
    appPromise = import("./index")
      .then((module) => module.default as App)
      .catch((error) => {
        appPromise = null;
        throw error;
      });
  }

  return appPromise;
};

export default {
  async fetch(request: Request, env: WorkerEnv) {
    const app = await loadApp(env);
    return app.fetch(request);
  },
};
