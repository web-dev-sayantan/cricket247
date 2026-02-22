interface WorkerBinding {
  fetch: (request: Request) => Response | Promise<Response>;
}

interface WorkerEnv {
  API: WorkerBinding;
  ASSETS: WorkerBinding;
}

const API_PREFIXES = ["/api", "/rpc"] as const;

const isApiRequest = (pathname: string) =>
  API_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

const handleApiRequest = (request: Request, env: WorkerEnv) =>
  env.API.fetch(request);

const handleAssetRequest = (request: Request, env: WorkerEnv) =>
  env.ASSETS.fetch(request);

export default {
  fetch(request: Request, env: WorkerEnv) {
    const url = new URL(request.url);

    if (isApiRequest(url.pathname)) {
      return handleApiRequest(request, env);
    }

    return handleAssetRequest(request, env);
  },
};
