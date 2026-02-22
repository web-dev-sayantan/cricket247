# Quick Reference Guide

## 🎯 Common Tasks

### Creating a New REST API Endpoint

1. **Create/Update Route File** (`src/routes/*.routes.ts`):

```typescript
import { Hono } from "hono";
import { successResponse, errorResponse, requireAuth } from "@/middleware";
import { mySchema } from "@/schemas";
import { getMyData, createMyData } from "@/services/my.service";

const myRoutes = new Hono();

// GET /api/v1/my-resource
myRoutes.get("/", async (c) => {
  try {
    const data = await getMyData();
    return successResponse(c, data);
  } catch (error) {
    return errorResponse(c, "Failed to fetch data", 500);
  }
});

// POST /api/v1/my-resource (protected)
myRoutes.post("/", requireAuth, async (c) => {
  try {
    const body = await c.req.json();
    const validated = mySchema.parse(body);
    const data = await createMyData(validated);
    return successResponse(c, data, "Created successfully", 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return validationErrorResponse(c, formatZodErrors(error));
    }
    return errorResponse(c, "Failed to create", 500);
  }
});

export default myRoutes;
```

2. **Register Route** (`src/routes/index.ts`):

```typescript
import myRoutes from "./my.routes";

apiRoutes.route("/my-resource", myRoutes);
```

### Creating a Service

Create file in `src/services/my.service.ts`:

```typescript
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { myTable } from "@/db/schema";
import type { InferSchema } from "@/schemas";
import type { createMyDataSchema } from "@/schemas";

export async function getMyData() {
  return await db.select().from(myTable);
}

export async function getMyDataById(id: number) {
  return await db.select().from(myTable).where(eq(myTable.id, id)).limit(1);
}

export async function createMyData(
  data: InferSchema<typeof createMyDataSchema>
) {
  return await db.insert(myTable).values(data).returning();
}

export async function updateMyData(
  id: number,
  data: Partial<InferSchema<typeof createMyDataSchema>>
) {
  return await db
    .update(myTable)
    .set(data)
    .where(eq(myTable.id, id))
    .returning();
}

export async function deleteMyData(id: number) {
  return await db.delete(myTable).where(eq(myTable.id, id));
}
```

### Adding Validation Schema

Add to `src/schemas/validation.schemas.ts`:

```typescript
export const createMyDataSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email"),
  age: z.number().int().positive().optional(),
});

export const updateMyDataSchema = createMyDataSchema.partial();
```

### Creating Protected Routes

```typescript
// Require any authenticated user
myRoutes.post("/", requireAuth, handler);

// Require admin role
myRoutes.delete("/:id", requireAuth, requireAdmin, handler);

// Require scorer or admin role
myRoutes.post("/score", requireAuth, requireScorer, handler);

// Custom role check
myRoutes.patch("/:id", requireAuth, requireRole("admin", "moderator"), handler);
```

### Using Response Helpers

```typescript
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
} from "@/middleware";

// Success response
return successResponse(c, data, "Optional message", 200);

// Error response
return errorResponse(c, "Error message", 400);

// Validation error response
return validationErrorResponse(c, {
  email: ["Invalid email format"],
  name: ["Name is required"],
});
```

### Database Queries with Drizzle

```typescript
import { eq, and, or, like, gte, lte, desc, asc } from "drizzle-orm";
import { db } from "@/db";
import { matches, teams } from "@/db/schema";
import { getCurrentDate } from "@/utils";

// Simple select
const allMatches = await db.select().from(matches);

// With where clause
const liveMatches = await db
  .select()
  .from(matches)
  .where(eq(matches.isLive, true));

// Multiple conditions
const upcomingMatches = await db
  .select()
  .from(matches)
  .where(
    and(eq(matches.status, "scheduled"), gte(matches.matchDate, getCurrentDate()))
  );

// With relations
const matchWithTeams = await db.query.matches.findFirst({
  where: eq(matches.id, matchId),
  with: {
    team1: true,
    team2: true,
    innings: {
      with: {
        balls: true,
      },
    },
  },
});

// Order by
const recentMatches = await db
  .select()
  .from(matches)
  .orderBy(desc(matches.matchDate))
  .limit(10);

// Insert
const newMatch = await db
  .insert(matches)
  .values({
    team1Id: 1,
    team2Id: 2,
    matchDate: getCurrentDate(),
    format: "t20",
  })
  .returning();

// Update
const updated = await db
  .update(matches)
  .set({ isLive: true })
  .where(eq(matches.id, matchId))
  .returning();

// Delete
await db.delete(matches).where(eq(matches.id, matchId));
```

### Rate Limiting Routes

```typescript
import { rateLimit } from "@/middleware";
import { RATE_LIMITS } from "@/config/constants";

// Apply rate limit to specific route
myRoutes.post("/", rateLimit(RATE_LIMITS.AUTH), handler);

// Apply to all routes in file
const myRoutes = new Hono();
myRoutes.use("*", rateLimit(RATE_LIMITS.GENERAL));
```

### Error Handling in Services

```typescript
export async function getMatchById(id: number) {
  try {
    const match = await db.query.matches.findFirst({
      where: eq(matches.id, id),
    });

    if (!match) {
      throw new Error("Match not found");
    }

    return match;
  } catch (error) {
    console.error("Error fetching match:", error);
    throw error;
  }
}
```

### Using Constants

```typescript
import {
  USER_ROLES,
  MATCH_STATUS,
  PAGINATION,
  API_PREFIX,
} from "@/config/constants";

// Check user role
if (user.role === USER_ROLES.ADMIN) {
  // admin logic
}

// Update match status
await updateMatch(id, { status: MATCH_STATUS.LIVE });

// Pagination
const limit = Math.min(
  Number.parseInt(c.req.query("limit") || String(PAGINATION.DEFAULT_LIMIT)),
  PAGINATION.MAX_LIMIT
);
```

### Using Utility Functions

```typescript
import {
  calculateStrikeRate,
  formatOvers,
  slugify,
  formatDateForDisplay,
} from "@/utils";

// Cricket calculations
const strikeRate = calculateStrikeRate(runs, ballsFaced);
const oversDisplay = formatOvers(totalBalls); // "15.3"

// String utilities
const slug = slugify("Test Match 2024"); // "test-match-2024"

// Date utilities
const displayDate = formatDateForDisplay(match.matchDate); // "December 10, 2025"
```

### Environment Variables

```typescript
import { env } from "@/config/env";

// Access validated environment variables
const dbUrl = env.DATABASE_URL;
const corsOrigin = env.CORS_ORIGIN;
```

### Pagination Pattern

```typescript
import { PAGINATION } from "@/config/constants";

myRoutes.get("/", async (c) => {
  const page = Number.parseInt(
    c.req.query("page") || String(PAGINATION.DEFAULT_PAGE)
  );
  const limit = Math.min(
    Number.parseInt(c.req.query("limit") || String(PAGINATION.DEFAULT_LIMIT)),
    PAGINATION.MAX_LIMIT
  );

  const data = await getAllData();
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedData = data.slice(startIndex, endIndex);

  return successResponse(c, {
    items: paginatedData,
    pagination: {
      page,
      limit,
      total: data.length,
      totalPages: Math.ceil(data.length / limit),
    },
  });
});
```

### Testing Endpoints with cURL

```bash
# Health check
curl http://localhost:3000/api/v1/health

# Get live matches
curl http://localhost:3000/api/v1/matches/live

# Get match by ID
curl http://localhost:3000/api/v1/matches/1

# Create match (requires auth)
curl -X POST http://localhost:3000/api/v1/matches \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "team1Id": 1,
    "team2Id": 2,
    "matchDate": "2024-12-20T10:00:00Z",
    "format": "t20"
  }'

# Login
curl -X POST http://localhost:3000/api/auth/sign-in \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

## 📝 File Naming Conventions

```
Routes:       match.routes.ts
Services:     match.service.ts
Schemas:      validation.schemas.ts
Utilities:    cricket.utils.ts
Middleware:   error-handler.ts
Config:       constants.ts
```

## 🔍 Common Patterns

### Controller Pattern (Route Handler)

```typescript
myRoutes.get("/:id", async (c) => {
  // 1. Extract parameters
  const id = Number.parseInt(c.req.param("id"));

  // 2. Validate
  if (Number.isNaN(id)) {
    return errorResponse(c, "Invalid ID");
  }

  // 3. Call service
  const data = await getDataById(id);

  // 4. Check result
  if (!data) {
    return errorResponse(c, "Not found", 404);
  }

  // 5. Return response
  return successResponse(c, data);
});
```

### Service Pattern

```typescript
export async function getData() {
  // 1. Query database
  const data = await db.select().from(table);

  // 2. Transform data (if needed)
  const transformed = data.map((item) => ({
    ...item,
    displayName: formatName(item.name),
  }));

  // 3. Return
  return transformed;
}
```

## 🛠️ Debugging Tips

```typescript
// Log request details
app.use("*", async (c, next) => {
  console.log("Method:", c.req.method);
  console.log("URL:", c.req.url);
  console.log("Headers:", c.req.header());
  await next();
});

// Log service calls
export async function myService() {
  console.log("myService called");
  const result = await db.query.table.findMany();
  console.log("Result:", result);
  return result;
}
```
