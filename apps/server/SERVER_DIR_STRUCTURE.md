# 📁 Folder Structure Reference

## Complete Directory Tree

```
apps/server/
├── .env                          # Environment variables (gitignored)
├── .env.example                  # Environment template
├── .gitignore                    # Git ignore rules
├── drizzle.config.ts             # Drizzle ORM configuration
├── package.json                  # Dependencies and scripts
├── tsconfig.json                 # TypeScript configuration
├── README.md                     # Main documentation
├── ARCHITECTURE.md               # Architecture diagrams
├── QUICK_REFERENCE.md            # Quick reference guide
│
└── src/                          # Source code
    ├── index.ts                  # 🚀 Application entry point
    │
    ├── config/                   # ⚙️ Configuration files
    │   ├── constants.ts          # App constants (roles, status, etc.)
    │   ├── cors.ts               # CORS configuration
    │   └── env.ts                # Environment validation with Zod
    │
    ├── db/                       # 🗄️ Database layer
    │   ├── index.ts              # Database client export
    │   ├── types.ts              # Database type definitions
    │   ├── schema/               # Drizzle schema definitions
    │   │   └── index.ts          # All table schemas
    │   └── relations/            # Table relations
    │       └── index.ts          # All relations
    │
    ├── lib/                      # 📚 Core libraries
    │   ├── auth.ts               # Better Auth configuration
    │   ├── context.ts            # Request context creation
    │   └── orpc.ts               # ORPC procedures (publicProcedure, protectedProcedure)
    │
    ├── middleware/               # 🛡️ HTTP middleware
    │   ├── index.ts              # Middleware exports
    │   ├── auth.ts               # Auth guards (requireAuth, requireAdmin, requireScorer)
    │   ├── error-handler.ts      # Global error handling
    │   ├── rate-limit.ts         # Rate limiting logic
    │   └── response.ts           # Response helpers (successResponse, errorResponse)
    │
    ├── routes/                   # 🛣️ REST API routes
    │   ├── index.ts              # Route aggregation & API versioning
    │   ├── health.routes.ts      # Health check endpoints
    │   ├── match.routes.ts       # Match CRUD operations
    │   ├── player.routes.ts      # Player CRUD operations
    │   ├── scoring.routes.ts     # Live scoring endpoints
    │   └── team.routes.ts        # Team CRUD operations
    │
    ├── routers/                  # 🔌 ORPC routers (type-safe RPC)
    │   └── index.ts              # ORPC router definitions
    │
    ├── schemas/                  # ✅ Validation schemas
    │   ├── index.ts              # Schema exports
    │   └── validation.schemas.ts # All Zod validation schemas
    │
    ├── services/                 # 💼 Business logic layer
    │   ├── ball.service.ts       # Ball recording logic
    │   ├── email.service.ts      # Email sending logic
    │   ├── innings.service.ts    # Innings management
    │   ├── match.service.ts      # Match business logic
    │   ├── player.service.ts     # Player management
    │   ├── scoring.service.ts    # Scoring calculations
    │   ├── team.service.ts       # Team management
    │   └── venue.service.ts      # Venue management
    │
    └── utils/                    # 🔧 Utility functions
        ├── index.ts              # Utility exports
        ├── cricket.utils.ts      # Cricket-specific calculations
        ├── date.utils.ts         # Date formatting & manipulation
        ├── string.utils.ts       # String manipulation
        └── validation.utils.ts   # Validation helpers
```

## 📂 Folder Purposes

### `/config`

**Purpose**: Application-wide configuration and constants  
**Contents**:

- Environment variable validation
- API constants (roles, status enums, rate limits)
- CORS settings
- API versioning

**When to use**: Add new constants, update environment variables, modify CORS rules

---

### `/db`

**Purpose**: Database schema, relations, and client  
**Contents**:

- Drizzle ORM schema definitions
- Table relations
- Database client instance
- Type exports

**When to use**: Add new tables, modify schemas, define relationships

---

### `/lib`

**Purpose**: Core application libraries and setup  
**Contents**:

- Authentication configuration (Better Auth)
- Request context creation
- ORPC procedure definitions
- Third-party service integrations

**When to use**: Configure auth providers, modify context structure, add new procedures

---

### `/middleware`

**Purpose**: HTTP request/response processing  
**Contents**:

- Authentication guards
- Authorization checks
- Error handling
- Rate limiting
- Response formatting

**When to use**: Add new middleware, modify auth guards, update error handling

---

### `/routes`

**Purpose**: REST API endpoint definitions  
**Contents**:

- HTTP route handlers
- Request validation
- Response formatting
- Route grouping

**When to use**: Create new endpoints, modify existing routes, version APIs

---

### `/routers`

**Purpose**: Type-safe RPC endpoints (ORPC)  
**Contents**:

- ORPC router definitions
- Type-safe procedures
- Client type exports

**When to use**: Create type-safe RPC endpoints for React client

---

### `/schemas`

**Purpose**: Request/response validation  
**Contents**:

- Zod validation schemas
- Type inference helpers
- Reusable schema components

**When to use**: Add validation for new endpoints, create reusable schemas

---

### `/services`

**Purpose**: Business logic and data operations  
**Contents**:

- Domain-specific business logic
- Database query orchestration
- Data transformation
- Complex calculations

**When to use**: Implement business rules, complex queries, data processing

---

### `/utils`

**Purpose**: Pure utility functions  
**Contents**:

- Cricket calculations
- Date/time formatting
- String manipulation
- Generic helpers

**When to use**: Add reusable pure functions, helper methods

---

## 🔄 Data Flow by Folder

```
HTTP Request
    ↓
index.ts (entry point)
    ↓
middleware/ (auth, rate-limit, error handling)
    ↓
routes/ (endpoint matching & request parsing)
    ↓
schemas/ (input validation)
    ↓
services/ (business logic)
    ↓
db/ (database queries via Drizzle ORM)
    ↓
Database
    ↓
services/ (data transformation)
    ↓
routes/ (response formatting via middleware/response.ts)
    ↓
HTTP Response
```

## 📋 File Naming Conventions

| Type       | Pattern                                   | Example                       |
| ---------- | ----------------------------------------- | ----------------------------- |
| Routes     | `{resource}.routes.ts`                    | `match.routes.ts`             |
| Services   | `{resource}.service.ts`                   | `match.service.ts`            |
| Schemas    | `{type}.schemas.ts`                       | `validation.schemas.ts`       |
| Utils      | `{purpose}.utils.ts`                      | `cricket.utils.ts`            |
| Middleware | `{purpose}.ts` or `{purpose}-{detail}.ts` | `auth.ts`, `error-handler.ts` |
| Config     | `{purpose}.ts`                            | `constants.ts`, `env.ts`      |

## 🎯 When to Create New Files

### New Route File

Create when adding a new resource (e.g., `tournament.routes.ts`)

```typescript
// src/routes/tournament.routes.ts
import { Hono } from "hono";
const tournamentRoutes = new Hono();
// ... routes
export default tournamentRoutes;
```

### New Service File

Create when adding domain logic (e.g., `tournament.service.ts`)

```typescript
// src/services/tournament.service.ts
export async function getTournaments() { ... }
export async function createTournament() { ... }
```

### New Utility File

Create when adding a new category of helpers (e.g., `math.utils.ts`)

```typescript
// src/utils/math.utils.ts
export function average(numbers: number[]) { ... }
export function sum(numbers: number[]) { ... }
```

### New Middleware File

Create for new cross-cutting concerns (e.g., `cache.ts`)

```typescript
// src/middleware/cache.ts
export function cacheMiddleware() { ... }
```

## 🚫 What NOT to Create

- ❌ Don't create nested route folders (keep flat in `/routes`)
- ❌ Don't create `controllers/` folder (use routes + services)
- ❌ Don't create `models/` folder (use `/db/schema`)
- ❌ Don't create `helpers/` folder (use `/utils`)
- ❌ Don't create `constants/` folder (use `/config/constants.ts`)
- ❌ Don't create separate files per constant (group in `constants.ts`)

## ✅ Best Practices

1. **Keep routes thin**: Move logic to services
2. **Services are pure**: No HTTP concerns (no `Request`/`Response`)
3. **One export per route file**: Default export the Hono router
4. **Group related schemas**: Keep in `validation.schemas.ts`
5. **Utils are pure functions**: No side effects, no database calls
6. **Middleware is reusable**: Don't hard-code business logic
7. **Config is readonly**: Export const objects

## 📊 Folder Size Guidelines

| Folder        | Expected File Count | When to Split                         |
| ------------- | ------------------- | ------------------------------------- |
| `/routes`     | 5-15 files          | Create sub-apps with Hono             |
| `/services`   | 10-20 files         | Extract shared logic to utils         |
| `/schemas`    | 1-3 files           | Group by resource type                |
| `/utils`      | 3-10 files          | Split by domain (cricket, math, etc.) |
| `/middleware` | 5-10 files          | Keep focused and reusable             |
| `/config`     | 2-5 files           | Extract to `/config/{domain}.ts`      |
