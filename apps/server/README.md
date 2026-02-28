# Cricket247 Backend API

A modern, type-safe REST API built with Hono for managing cricket matches, live scoring, tournaments, and player statistics.

## 🏗️ Tech Stack

- **Framework**: [Hono](https://hono.dev/) - Ultra-fast web framework
- **Runtime**: [Bun](https://bun.sh/) - Fast JavaScript runtime
- **Database**: SQLite with [Turso](https://turso.tech/)
- **ORM**: [Drizzle ORM](https://orm.drizzle.team/)
- **Authentication**: [Better Auth](https://www.better-auth.com/)
- **Validation**: [Zod](https://zod.dev/)
- **Type Safety**: TypeScript with strict mode
- **RPC**: [ORPC](https://orpc.unnoq.com/) for type-safe client-server communication

## 📁 Project Structure

```text
src/
├── config/           # Configuration files
│   ├── constants.ts  # Application constants
│   ├── cors.ts       # CORS configuration
│   └── env.ts        # Environment validation
│
├── db/               # Database layer
│   ├── schema/       # Drizzle schema definitions
│   ├── relations/    # Database relations
│   ├── types.ts      # Database types
│   └── index.ts      # Database client
│
├── lib/              # Core libraries
│   ├── auth.ts       # Better Auth configuration
│   ├── context.ts    # Request context
│   └── orpc.ts       # ORPC procedures
│
├── middleware/       # HTTP middleware
│   ├── auth.ts       # Authentication guards
│   ├── error-handler.ts
│   ├── rate-limit.ts
│   ├── response.ts   # Response helpers
│   └── index.ts
│
├── routes/           # REST API routes
│   ├── health.routes.ts
│   ├── match.routes.ts
│   ├── player.routes.ts
│   ├── scoring.routes.ts
│   ├── team.routes.ts
│   └── index.ts
│
├── routers/          # ORPC routers (type-safe RPC)
│   └── index.ts
│
├── schemas/          # Zod validation schemas
│   ├── validation.schemas.ts
│   └── index.ts
│
├── services/         # Business logic layer
│   ├── ball.service.ts
│   ├── email.service.ts
│   ├── innings.service.ts
│   ├── match.service.ts
│   ├── player.service.ts
│   ├── scoring.service.ts
│   ├── team.service.ts
│   └── venue.service.ts
│
├── utils/            # Utility functions
│   ├── cricket.utils.ts
│   ├── date.utils.ts
│   ├── string.utils.ts
│   ├── validation.utils.ts
│   └── index.ts
│
└── index.ts          # Application entry point
```

## 🚀 Getting Started

### Prerequisites

- [Bun](https://bun.sh/) >= 1.0.0
- [Turso CLI](https://docs.turso.tech/cli/introduction) (for local development)

### Installation

1. Install dependencies:

```bash
bun install
```

1. Copy environment variables:

```bash
cp .env.example .env
```

1. Configure your `.env` file with required values:

```env
DATABASE_URL=libsql://your-database-url
DATABASE_AUTH_TOKEN=your-auth-token
BETTER_AUTH_SECRET=your-secret-key
BETTER_AUTH_URL=http://localhost:3000
CORS_ORIGIN=http://localhost:3001
RESEND_API_KEY=your-resend-api-key
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
FACEBOOK_CLIENT_ID=your-facebook-client-id
FACEBOOK_CLIENT_SECRET=your-facebook-client-secret
```

1. Generate database schema:

```bash
bun run db:generate
```

1. Push schema to database:

```bash
bun run db:push
```

### Development

Start the development server with hot reload:

```bash
bun run dev
```

The API will be available at `http://localhost:3000`

### Building

Build for production:

```bash
bun run build
```

Run production build:

```bash
bun run start
```

### Testing

Run unit tests for the server app:

```bash
bun run test
```

Testing conventions:

- Use co-located test files with `*.test.ts`
- Prefer unit tests for `src/utils` and service logic
- Mock `@/db` for DB-coupled service unit tests
- Do not import app entry files in unit tests

## 📡 API Endpoints

### Base URL: `/api/v1`

### Health Check

- `GET /api/v1/health` - Public health check
- `GET /api/v1/health/detailed` - Protected health check with DB status

### Tournament Management

- `GET /api/v1/tournaments` - List tournaments (public)
- `GET /api/v1/tournaments/:id` - Get tournament by ID (public)
- `POST /api/v1/tournaments` - Create tournament (authenticated admin only)
- `PATCH /api/v1/tournaments/:id` - Update tournament (authenticated admin only)
- `DELETE /api/v1/tournaments/:id` - Delete tournament (authenticated admin only)

Equivalent ORPC management procedures are available in `src/routers/index.ts` (`managementTournaments`, `managementTournamentById`, `createTournament`, `updateTournament`, `deleteTournament`) with the same admin expectation for write operations.

### Matches

- `GET /api/v1/matches` - Get all matches (paginated)
- `GET /api/v1/matches/live` - Get live matches
- `GET /api/v1/matches/:id` - Get match by ID
- `POST /api/v1/matches` - Create match (Admin only)
- `PATCH /api/v1/matches/:id` - Update match (Admin only)
- `DELETE /api/v1/matches/:id` - Delete match (Admin only)

### Teams

- `GET /api/v1/teams` - Get all teams
- `GET /api/v1/teams/:id` - Get team by ID
- `POST /api/v1/teams` - Create team (Authenticated)
- `PATCH /api/v1/teams/:id` - Update team (Authenticated)
- `DELETE /api/v1/teams/:id` - Delete team (Authenticated)

### Players

- `GET /api/v1/players` - Get all players
- `GET /api/v1/players/:id` - Get player by ID
- `POST /api/v1/players` - Create player (Authenticated)
- `PATCH /api/v1/players/:id` - Update player (Authenticated)
- `DELETE /api/v1/players/:id` - Delete player (Authenticated)

### Live Scoring

- `POST /api/v1/scoring/ball` - Record ball (Scorer/Admin only)
- `PATCH /api/v1/scoring/ball/:id` - Update ball (Scorer/Admin only)
- `POST /api/v1/scoring/innings/start` - Start innings (Scorer/Admin only)
- `POST /api/v1/scoring/innings/:id/end` - End innings (Scorer/Admin only)

### Authentication

- `POST /api/auth/sign-up` - Sign up with email/password
- `POST /api/auth/sign-in` - Sign in with email/password
- `POST /api/auth/sign-out` - Sign out
- `GET /api/auth/session` - Get current session

## 🔐 Authentication & Authorization

The API uses Better Auth for authentication with the following features:

- Email/Password authentication
- OAuth (Google, Facebook)
- Email OTP verification
- Passkey support

### User Roles

- **user** - Default role, can view public content
- **scorer** - Can record live scoring data
- **admin** - Full access to all endpoints

### Protected Routes

Use the following middleware in your routes:

- `requireAuth` - Requires authenticated user
- `requireScorer` - Requires scorer or admin role
- `requireAdmin` - Requires admin role

## 🛠️ Development Guidelines

### Adding New Routes

1. Create a route file in `src/routes/`:

```typescript
import { Hono } from "hono";
import { successResponse, errorResponse, requireAuth } from "@/middleware";

const myRoutes = new Hono();

myRoutes.get("/", async (c) => {
  // Your logic here
  return successResponse(c, data);
});

export default myRoutes;
```

1. Register in `src/routes/index.ts`:

```typescript
import myRoutes from "./my.routes";

apiRoutes.route("/my-resource", myRoutes);
```

### Adding New Services

Create service files in `src/services/` for business logic:

```typescript
import { db } from "@/db";
import { myTable } from "@/db/schema";

export async function getMyData() {
  return await db.select().from(myTable);
}
```

### Adding Validation Schemas

Define Zod schemas in `src/schemas/validation.schemas.ts`:

```typescript
export const mySchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});
```

### Response Format

All API responses follow this format:

```typescript
{
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}
```

## 📊 Database Management

### Drizzle Studio

Launch the database GUI:

```bash
bun run db:studio
```

### Migrations

Generate migrations after schema changes:

```bash
bun run db:generate
```

Push migrations to database:

```bash
bun run db:migrate
```

## 🧪 Best Practices

1. **Type Safety**: Use TypeScript strictly, no `any` types
2. **Validation**: Always validate input with Zod schemas
3. **Error Handling**: Use middleware for consistent error responses
4. **Authentication**: Protect sensitive endpoints with auth middleware
5. **Services**: Keep business logic in service layer
6. **Routes**: Keep route handlers thin, delegate to services
7. **Constants**: Use constants from `config/constants.ts`
8. **Utilities**: Extract reusable logic to utility functions
9. **Date Handling**: Use `date-fns` helpers and return API timestamps as ISO 8601 strings

## 📝 Environment Variables

| Variable                 | Description              | Required |
| ------------------------ | ------------------------ | -------- |
| `DATABASE_URL`           | Turso database URL       | Yes      |
| `DATABASE_AUTH_TOKEN`    | Turso auth token         | No       |
| `BETTER_AUTH_SECRET`     | Auth secret key          | Yes      |
| `BETTER_AUTH_URL`        | Auth callback URL        | Yes      |
| `CORS_ORIGIN`            | Allowed CORS origin      | Yes      |
| `RESEND_API_KEY`         | Resend email API key     | Yes      |
| `GOOGLE_CLIENT_ID`       | Google OAuth client ID   | Yes      |
| `GOOGLE_CLIENT_SECRET`   | Google OAuth secret      | Yes      |
| `FACEBOOK_CLIENT_ID`     | Facebook OAuth client ID | Yes      |
| `FACEBOOK_CLIENT_SECRET` | Facebook OAuth secret    | Yes      |

## 🚦 Rate Limiting

The API includes rate limiting middleware:

- General endpoints: 100 requests/minute
- Auth endpoints: 10 requests/minute
- Strict endpoints: 5 requests/minute

## 📚 Additional Resources

- [Hono Documentation](https://hono.dev/)
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [Better Auth Documentation](https://www.better-auth.com/)
- [Zod Documentation](https://zod.dev/)

## 📄 License

MIT
