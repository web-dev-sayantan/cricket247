# AGENTS.md - Cricket247 Development Guidelines

## Build/Lint/Test Commands

### Root Commands (Monorepo)

- **Lint & Format**: `bun run check` - Runs Biome check with auto-fix
- **Build All**: `bun run build` - Builds all apps via Turbo
- **Type Check**: `bun run check-types` - TypeScript checking across all apps
- **Test**: `bun run test` - Run test suites
- **Dev All**: `bun run dev` - Starts all apps in development mode
- **Database Studio**: `bun run db:studio` - Open Drizzle Studio for database management
- **Database Generate**: `bun run db:generate` - Generate database migrations
- **Database Migrate**: `bun run db:migrate` - Run database migrations

### Server Commands

- **Build**: `bun run build` - Builds with tsdown
- **Type Check**: `bun run check-types` - TypeScript compilation check
- **Dev**: `bun run dev` - Hot reload development server
- **Database**: `bun run db:push` - Push schema changes to database

### Web Commands

- **Build**: `bun run build` - Vite production build
- **Type Check**: `bun run check-types` - TypeScript checking
- **Test**: `bun run test` - Run tests (from `apps/web`)
- **Test Watch**: `bun run test:watch` - Run tests in watch mode (from `apps/web`)
- **Dev**: `bun run dev` - Vite dev server on port 3001
- **Deploy**: `bun run deploy` - Build and deploy to Cloudflare

### Testing

Run `bun run test` at the root. For web tests, run `bun run test` or `bun run test:watch` from `apps/web`.

## Code Style Guidelines

### Core Principles

- **Zero Configuration**: Follow Ultracite rules (Biome-based)
- **Maximum Type Safety**: Strict TypeScript with null checks
- **Accessibility First**: WCAG compliance required
- **AI-Friendly**: Consistent patterns for automated tooling

### TypeScript

- Use `strictNullChecks: true`
- No `any` or `unknown` types
- No non-null assertions (`!`)
- No TypeScript enums
- Use `as const` for literal types
- `import type` for type-only imports
- `export type` for type exports

### Imports & Modules

- Relative imports with `@/` alias (e.g., `@/lib/utils`)
- No namespace imports
- No default exports in most cases
- Group imports: external libs, then internal modules

### Naming Conventions

- **Variables/Functions**: camelCase
- **Components**: PascalCase
- **Types/Interfaces**: PascalCase
- **Files**: kebab-case for components, camelCase for utilities
- **Constants**: UPPER_SNAKE_CASE

### React Patterns

- Functional components with hooks
- TanStack Router for routing
- TanStack Query for data fetching
- No class components
- Arrow functions preferred
- Destructure props at component level

### Error Handling

```typescript
// ✅ Good: Comprehensive error handling
try {
  const result = await fetchData();
  return { success: true, data: result };
} catch (error) {
  console.error("API call failed:", error);
  return { success: false, error: error.message };
}

// ❌ Bad: Swallowing errors
try {
  return await fetchData();
} catch (e) {
  console.log(e);
}
```

### Formatting

- Biome handles all formatting automatically
- 2-space indentation
- Single quotes for strings
- Semicolons required
- Trailing commas in multiline structures

### Accessibility (Critical)

- All interactive elements must be keyboard accessible
- Semantic HTML elements required
- ARIA attributes only when necessary
- Alt text for all images
- Proper heading hierarchy
- Focus management for modals/dialogs

### Database

- Drizzle ORM for queries
- SQLite with Turso
- Schema defined in TypeScript
- Migrations via drizzle-kit

### Authentication

- Better Auth with social providers
- Email OTP for passwordless auth
- Passkey support
- Role-based access control

### Performance

- React 19 with compiler
- Vite for fast builds
- Tree shaking enabled
- Code splitting via routes

## Ultracite Rules (Critical)

Follow all rules from `.rules` and `.github/copilot-instructions.md`:

### Key Restrictions

- No `console.log` in production code
- No `debugger` statements
- No `eval()` or `with` statements
- No bitwise operators
- No `var` declarations
- No function declarations in blocks
- No duplicate keys in objects
- No unused variables/imports
- No empty catch blocks
- No nested ternary expressions
- No yoda conditions
- No magic numbers without constants

### React Specific

- No `dangerouslySetInnerHTML` without validation
- No array indices as keys
- No `onClick` without keyboard handlers
- Proper dependency arrays in hooks
- No side effects in render

### Security

- No hardcoded secrets
- Input validation with Zod schemas
- Sanitize user inputs
- HTTPS only in production
- Secure cookie attributes

## Architecture

### Tech Stack

- **Frontend**: React 19, TanStack Router, Tailwind CSS
- **Backend**: Hono, Drizzle ORM, Better Auth
- **Database**: SQLite (Turso)
- **Deployment**: Cloudflare Pages/Workers
- **Tooling**: Biome, TypeScript, Vite, Turbo

### Project Structure

```text
apps/
  server/     # Hono API server
  web/        # React SPA
packages/     # Shared packages (if any)
```

### File Organization

- Components in `src/components/`
- Routes in `src/routes/`
- Utilities in `src/lib/`
- Types collocated with usage
- Database schema in `src/db/`

## Development Workflow

1. **Before coding**: Read existing patterns in similar files
2. **During coding**: Follow Ultracite rules strictly
3. **Before commit**: Run `bun run check` and `bun run check-types`
4. **Testing**: Manual testing + accessibility audit
5. **Code review**: Ensure all rules followed

## Common Patterns

### API Calls

```typescript
const { data, error } = await apiClient.method(params);
if (error) {
  toast.error(error.message);
  return;
}
// Handle success
```

### Form Handling

```typescript
const form = useForm({
  defaultValues: {
    /* ... */
  },
  onSubmit: async ({ value }) => {
    // Handle submission
  },
  validators: {
    onSubmit: schema,
  },
});
```

### Database Queries

```typescript
const result = await db.select().from(table).where(condition);
```

Remember: Always run `bun run check` before committing to catch style and correctness issues.
