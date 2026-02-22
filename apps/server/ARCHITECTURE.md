# Cricket247 Backend Architecture

## 🏛️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      Client Applications                    │
│              (React SPA, Mobile Apps, etc.)                 │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ HTTP/HTTPS
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                      Hono Server (Port 3000)                │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Global Middleware Layer                 │   │
│  │  • Logger (request/response logging)                 │   │
│  │  • CORS (cross-origin resource sharing)              │   │
│  │  • Error Handler (global error catching)             │   │
│  └─────────────────────────────────────────────────────┘    │
│                         │                                   │
│  ┌──────────────────────┼──────────────────────┐            │
│  │                      │                       │           │
│  ▼                      ▼                       ▼           │
│  ┌─────────┐   ┌───────────────┐   ┌──────────────────┐     │
│  │  Auth   │   │  REST API     │   │  ORPC (RPC)      │     │
│  │  Routes │   │  Routes       │   │  Routes          │     │
│  │ /auth/* │   │  /api/v1/*    │   │  /rpc/*          │     │
│  └─────────┘   └───────┬───────┘   └────────┬─────────┘     │
│                        │                     │              │
│                        ▼                     ▼              │
│              ┌─────────────────────────────────────┐       │
│              │    Route-Specific Middleware        │       │
│              │  • requireAuth                      │       │
│              │  • requireRole (admin/scorer)       │       │
│              │  • rateLimit                        │       │
│              │  • validation                       │       │
│              └─────────────┬───────────────────────┘       │
│                            │                               │
│                            ▼                               │
│              ┌─────────────────────────────────┐           │
│              │     Route Handlers              │           │
│              │  • health.routes.ts             │           │
│              │  • match.routes.ts              │           │
│              │  • team.routes.ts               │           │
│              │  • player.routes.ts             │           │
│              │  • scoring.routes.ts            │           │
│              └─────────────┬───────────────────┘           │
│                            │                               │
│                            ▼                               │
│              ┌─────────────────────────────────┐           │
│              │      Validation Layer           │           │
│              │  (Zod Schemas)                  │           │
│              │  • Input validation             │           │
│              │  • Type safety                  │           │
│              └─────────────┬───────────────────┘           │
│                            │                               │
│                            ▼                               │
│              ┌─────────────────────────────────┐           │
│              │      Service Layer              │           │
│              │  (Business Logic)               │           │
│              │  • match.service.ts             │           │
│              │  • team.service.ts              │           │
│              │  • player.service.ts            │           │
│              │  • scoring.service.ts           │           │
│              │  • innings.service.ts           │           │
│              │  • ball.service.ts              │           │
│              │  • venue.service.ts             │           │
│              │  • email.service.ts             │           │
│              └─────────────┬───────────────────┘           │
│                            │                               │
│                            ▼                               │
│              ┌─────────────────────────────────┐           │
│              │      Data Access Layer          │           │
│              │  (Drizzle ORM)                  │           │
│              │  • Type-safe queries            │           │
│              │  • Relations                    │           │
│              │  • Migrations                   │           │
│              └─────────────┬───────────────────┘           │
└──────────────────────────┼─────────────────────────────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │   SQLite Database      │
              │   (Turso)              │
              │                        │
              │  Tables:               │
              │  • user                │
              │  • session             │
              │  • account             │
              │  • match               │
              │  • team                │
              │  • player              │
              │  • innings             │
              │  • balls               │
              │  • venues              │
              └────────────────────────┘
```

## 🔄 Request Flow

### Standard REST API Request Flow

```
1. Client Request
   ↓
2. Logger Middleware (log request)
   ↓
3. CORS Middleware (validate origin)
   ↓
4. Error Handler Middleware (wrap for errors)
   ↓
5. Route Matching (/api/v1/matches)
   ↓
6. Auth Middleware (if protected)
   ↓
7. Rate Limit Middleware
   ↓
8. Route Handler
   ↓
9. Zod Validation
   ↓
10. Service Layer (business logic)
    ↓
11. Drizzle ORM (database query)
    ↓
12. Database
    ↓
13. Service Layer (process data)
    ↓
14. Route Handler (format response)
    ↓
15. Response Middleware
    ↓
16. Client Response
```

### Authentication Flow

```
1. Client sends credentials
   ↓
2. POST /api/auth/sign-in
   ↓
3. Better Auth validates
   ↓
4. Database lookup (user table)
   ↓
5. Create session (session table)
   ↓
6. Set session cookie
   ↓
7. Return user data
   ↓
8. Client stores session

Subsequent Requests:
1. Client includes session cookie
   ↓
2. requireAuth middleware
   ↓
3. Better Auth validates session
   ↓
4. Attach user to context
   ↓
5. Continue to route handler
```

## 📦 Module Dependencies

```
index.ts (Entry Point)
  ├── config/
  │   ├── env.ts (validates environment)
  │   ├── constants.ts (app constants)
  │   └── cors.ts (CORS config)
  │
  ├── middleware/
  │   ├── error-handler.ts
  │   ├── auth.ts (depends on lib/auth.ts)
  │   ├── rate-limit.ts
  │   └── response.ts
  │
  ├── routes/ (REST API)
  │   └── *.routes.ts (depends on middleware, services)
  │
  ├── routers/ (ORPC)
  │   └── index.ts (depends on lib/orpc.ts, services)
  │
  ├── lib/
  │   ├── auth.ts (Better Auth config)
  │   ├── context.ts (request context)
  │   └── orpc.ts (RPC procedures)
  │
  ├── services/ (Business Logic)
  │   └── *.service.ts (depends on db/, utils/)
  │
  ├── db/
  │   ├── schema/ (table definitions)
  │   ├── relations/ (table relations)
  │   └── index.ts (database client)
  │
  ├── schemas/ (Validation)
  │   └── validation.schemas.ts (Zod schemas)
  │
  └── utils/
      └── *.utils.ts (pure functions)
```

## 🔐 Security Layers

```
┌─────────────────────────────────────┐
│      1. Environment Validation      │
│  (env.ts validates all env vars)    │
└─────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────┐
│      2. CORS Protection             │
│  (Only allowed origins)             │
└─────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────┐
│      3. Rate Limiting               │
│  (Prevent abuse)                    │
└─────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────┐
│      4. Authentication              │
│  (Better Auth - session validation) │
└─────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────┐
│      5. Authorization               │
│  (Role-based access control)        │
└─────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────┐
│      6. Input Validation            │
│  (Zod schema validation)            │
└─────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────┐
│      7. SQL Injection Prevention    │
│  (Drizzle ORM parameterized queries)│
└─────────────────────────────────────┘
```

## 🎯 Design Patterns

### 1. Layered Architecture

- **Routes**: HTTP request handling
- **Services**: Business logic
- **Data Access**: Database operations
- **Clear separation of concerns**

### 2. Dependency Injection

- Context passed through middleware
- Services receive dependencies
- Testable and maintainable

### 3. Middleware Pipeline

- Composable middleware functions
- Request/response transformation
- Error handling at each layer

### 4. Repository Pattern

- Service layer abstracts data access
- Drizzle ORM as the repository
- Easy to mock for testing

### 5. Response Normalization

- Consistent API response format
- `successResponse()` and `errorResponse()`
- Timestamp and status included

## 🚀 Scalability Considerations

### Current Setup

- Monolithic Hono server
- SQLite database (Turso)
- Single deployment

### Future Scaling Options

1. **Horizontal Scaling**: Deploy multiple instances behind load balancer
2. **Database Replication**: Turso supports read replicas
3. **Caching Layer**: Add Redis for frequently accessed data
4. **Microservices**: Split by domain (matches, scoring, users)
5. **WebSockets**: Add real-time updates for live matches
6. **CDN**: Serve static assets from edge

## 📊 Performance Optimizations

1. **Bun Runtime**: Fast JavaScript execution
2. **Drizzle ORM**: Efficient SQL queries
3. **Connection Pooling**: Database connection reuse
4. **Query Optimization**: Selective field fetching
5. **Pagination**: Limit data transfer
6. **Rate Limiting**: Prevent resource exhaustion
7. **Zod**: Fast schema validation

## 🧪 Testing Strategy

### Unit Tests

- Service layer functions
- Utility functions
- Validation schemas

### Integration Tests

- API endpoints
- Database operations
- Authentication flows

### E2E Tests

- Complete user workflows
- Live scoring scenarios
- Tournament management
