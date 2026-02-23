# cricket247

This project was created with [Better-T-Stack](https://github.com/AmanVarshney01/create-better-t-stack), a modern TypeScript stack that combines React, TanStack Router, Hono, ORPC, and more.

## Features

- **TypeScript** - For type safety and improved developer experience
- **TanStack Router** - File-based routing with full type safety
- **TailwindCSS** - Utility-first CSS for rapid UI development
- **shadcn/ui** - Reusable UI components
- **Hono** - Lightweight, performant server framework
- **oRPC** - End-to-end type-safe APIs with OpenAPI integration
- **Bun** - Runtime environment
- **Drizzle** - TypeScript-first ORM
- **SQLite/Turso** - Database engine
- **Authentication** - Better-Auth
- **Turborepo** - Optimized monorepo build system

## Getting Started

First, install the dependencies:

```bash
bun install
```

## Database Setup

This project uses SQLite with Drizzle ORM.

1. Start the local SQLite database:

```bash
cd apps/server && bun db:local
```

1. Update your `.env` file in the `apps/server` directory with the appropriate connection details if needed.

2. Apply the schema to your database:

```bash
bun db:push
```

Then, run the development server:

```bash
bun dev
```

Open [http://localhost:3001](http://localhost:3001) in your browser to see the web application.
The API is running at [http://localhost:3000](http://localhost:3000).

## Local Development Modes

This project supports two local development modes to balance developer experience with production-like testing:

### Default Mode: Vite Proxy (Recommended)

```bash
bun dev
```

**How it works:**

- Web app runs on port 3001 using Vite dev server
- API runs on port 3000 as a separate process
- Vite proxies `/api` and `/rpc` requests from 3001 → 3000
- No Cloudflare Workers runtime locally

**When to use:**

- Daily development work (fastest, simplest workflow)
- Frontend changes with hot module replacement
- Backend changes with auto-reload
- No need for Cloudflare-specific features

**Why this mode exists:**
The Cloudflare Workers runtime requires service bindings for worker-to-worker communication. Running the web app in worker mode locally would require both the web and API workers to be in the same `wrangler dev` session, which complicates the development workflow. The Vite proxy provides the same "same-origin" routing experience (all requests to localhost:3001) without the overhead of worker runtime simulation.

### Worker Runtime Mode (Advanced)

```bash
cd apps/web
bun run wrangler:dev:multi
```

**How it works:**

- Both web and API run in Cloudflare Workers runtime via `workerd`
- Service bindings connect web worker to API worker
- Simulates production Cloudflare Workers environment

**When to use:**

- Testing Cloudflare-specific features (service bindings, KV, Durable Objects)
- Validating behavior before deployment
- Debugging production-only issues

**Why this mode exists:**
When deployed to Cloudflare Workers, both the web app and API run in the same origin with service bindings for inter-worker communication. This mode replicates that environment locally for testing edge cases and Cloudflare-specific functionality.

**Technical Note:**
The `vite.config.ts` conditionally disables the `@cloudflare/vite-plugin` during `serve` mode to use the Vite proxy instead of worker runtime. This prevents service binding resolution errors in default development while keeping the plugin active for production builds.

## Deployment (Cloudflare Wrangler)

- API deploy: `bun run deploy:api`
- Web deploy: `bun run deploy:web`
- Full deploy (API then web): `bun run deploy`
- CI deploy on `main`: `.github/workflows/deploy-cloudflare.yml`
- Runbook: `docs/cloudflare-deployment.md`

## Project Structure

```
cricket247/
├── apps/
│   ├── web/         # Frontend application (React + TanStack Router)
│   └── server/      # Backend API (Hono, ORPC)
```

## Available Scripts

- `bun dev`: Start all applications in development mode
- `bun build`: Build all applications
- `bun dev:web`: Start only the web application
- `bun dev:server`: Start only the server
- `bun check`: Lint and format code with Biome
- `bun check-types`: Check TypeScript types across all apps
- `bun db:push`: Push schema changes to database
- `bun db:studio`: Open database studio UI
- `cd apps/server && bun db:local`: Start the local SQLite database

## Development Guidelines

This repository includes comprehensive instructions for developers and AI coding agents:

- **[COPILOT_INSTRUCTIONS.md](./COPILOT_INSTRUCTIONS.md)** - Overview of all instruction files and how to use them
- **[AGENTS.md](./AGENTS.md)** - Development guidelines, build commands, and code style patterns
- **[.github/copilot-instructions.md](./.github/copilot-instructions.md)** - Repository-wide coding standards and rules
- **[apps/server/.instructions.md](./apps/server/.instructions.md)** - Backend-specific patterns and best practices
- **[apps/web/.instructions.md](./apps/web/.instructions.md)** - Frontend-specific patterns and best practices

**Before contributing**, please read `AGENTS.md` and the relevant instruction files to understand project conventions.
