---
applyTo: "**/*.{ts,tsx,js,jsx}"
---

# Cricket247 - Live Cricket Scores & Updates

## About This Project
Cricket247 is a modern web application built with React 19, TanStack Router, Hono, and Drizzle ORM. It provides live cricket scores, match updates, and cricket-related features with a focus on performance, type safety, and accessibility.

**Tech Stack:**
- **Frontend**: React 19, TanStack Router, TailwindCSS, shadcn/ui
- **Backend**: Hono, oRPC, Better-Auth
- **Database**: SQLite/Turso with Drizzle ORM
- **Runtime**: Bun
- **Deployment**: Cloudflare Pages/Workers
- **Tooling**: Biome, Ultracite, TypeScript, Vite, Turborepo

## Project Structure
```
cricket247/
├── apps/
│   ├── web/         # Frontend application (React + TanStack Router)
│   └── server/      # Backend API (Hono, oRPC, Better-Auth)
├── packages/        # Shared packages
├── .github/         # GitHub configuration and workflows
└── AGENTS.md        # Development guidelines (READ THIS FIRST)
```

## Key Documents
- **AGENTS.md**: Comprehensive development guidelines, build commands, and code style patterns
- **README.md**: Getting started guide and project overview
- **.rules**: Ultracite rules for code quality (referenced below)

# Development Workflow

## Common Commands (Monorepo)
- `bun run check` - Lint & format with Biome (run before committing)
- `bun run build` - Build all apps via Turbo
- `bun run check-types` - TypeScript checking across all apps
- `bun run dev` - Start all apps in development mode
- `bun run dev:web` - Start only web app (port 3001)
- `bun run dev:server` - Start only server (port 3000)
- `bun run db:push` - Push schema changes to database
- `bun run db:studio` - Open Drizzle Studio for database management
- `bun run db:generate` - Generate database migrations
- `bun run db:migrate` - Run database migrations

## Development Process
1. **Before coding**: Read `AGENTS.md` and analyze existing patterns in similar files
2. **During coding**: Follow Ultracite rules strictly (enforced by Biome)
3. **Before commit**: Run `bun run check` and `bun run check-types`
4. **Testing**: Manual testing + accessibility audit (no test framework currently configured)

## Task Guidelines
**Good tasks for AI coding agents:**
- Bug fixes with clear reproduction steps
- New UI components following existing patterns
- API endpoints with clear input/output specs
- Database schema changes with migration scripts
- Documentation updates
- Refactoring to improve code quality
- Adding TypeScript types

**Tasks requiring human review:**
- Authentication/security changes
- Database migrations on production
- Breaking API changes
- Complex business logic
- Performance-critical code

# Ultracite Code Quality Standards

Ultracite enforces strict type safety, accessibility standards, and consistent code quality for JavaScript/TypeScript projects using Biome's lightning-fast formatter and linter.

## Key Principles
- Zero configuration required
- Subsecond performance
- Maximum type safety
- AI-friendly code generation

## Before Writing Code
1. Analyze existing patterns in the codebase
2. Consider edge cases and error scenarios
3. Follow the rules below strictly
4. Validate accessibility requirements

## Rules

### Accessibility (a11y)
- Don't use `accessKey` attribute on any HTML element.
- Don't set `aria-hidden="true"` on focusable elements.
- Don't add ARIA roles, states, and properties to elements that don't support them.
- Don't use distracting elements like `<marquee>` or `<blink>`.
- Only use the `scope` prop on `<th>` elements.
- Don't assign non-interactive ARIA roles to interactive HTML elements.
- Make sure label elements have text content and are associated with an input.
- Don't assign interactive ARIA roles to non-interactive HTML elements.
- Don't assign `tabIndex` to non-interactive HTML elements.
- Don't use positive integers for `tabIndex` property.
- Don't include "image", "picture", or "photo" in img alt prop.
- Don't use explicit role property that's the same as the implicit/default role.
- Make static elements with click handlers use a valid role attribute.
- Always include a `title` element for SVG elements.
- Give all elements requiring alt text meaningful information for screen readers.
- Make sure anchors have content that's accessible to screen readers.
- Assign `tabIndex` to non-interactive HTML elements with `aria-activedescendant`.
- Include all required ARIA attributes for elements with ARIA roles.
- Make sure ARIA properties are valid for the element's supported roles.
- Always include a `type` attribute for button elements.
- Make elements with interactive roles and handlers focusable.
- Give heading elements content that's accessible to screen readers (not hidden with `aria-hidden`).
- Always include a `lang` attribute on the html element.
- Always include a `title` attribute for iframe elements.
- Accompany `onClick` with at least one of: `onKeyUp`, `onKeyDown`, or `onKeyPress`.
- Accompany `onMouseOver`/`onMouseOut` with `onFocus`/`onBlur`.
- Include caption tracks for audio and video elements.
- Use semantic elements instead of role attributes in JSX.
- Make sure all anchors are valid and navigable.
- Ensure all ARIA properties (`aria-*`) are valid.
- Use valid, non-abstract ARIA roles for elements with ARIA roles.
- Use valid ARIA state and property values.
- Use valid values for the `autocomplete` attribute on input elements.
- Use correct ISO language/country codes for the `lang` attribute.

### Code Complexity and Quality
- Don't use consecutive spaces in regular expression literals.
- Don't use the `arguments` object.
- Don't use primitive type aliases or misleading types.
- Don't use the comma operator.
- Don't use empty type parameters in type aliases and interfaces.
- Don't write functions that exceed a given Cognitive Complexity score.
- Don't nest describe() blocks too deeply in test files.
- Don't use unnecessary boolean casts.
- Don't use unnecessary callbacks with flatMap.
- Use for...of statements instead of Array.forEach.
- Don't create classes that only have static members (like a static namespace).
- Don't use this and super in static contexts.
- Don't use unnecessary catch clauses.
- Don't use unnecessary constructors.
- Don't use unnecessary continue statements.
- Don't export empty modules that don't change anything.
- Don't use unnecessary escape sequences in regular expression literals.
- Don't use unnecessary fragments.
- Don't use unnecessary labels.
- Don't use unnecessary nested block statements.
- Don't rename imports, exports, and destructured assignments to the same name.
- Don't use unnecessary string or template literal concatenation.
- Don't use String.raw in template literals when there are no escape sequences.
- Don't use useless case statements in switch statements.
- Don't use ternary operators when simpler alternatives exist.
- Don't use useless `this` aliasing.
- Don't use any or unknown as type constraints.
- Don't initialize variables to undefined.
- Don't use the void operators (they're not familiar).
- Use arrow functions instead of function expressions.
- Use Date.now() to get milliseconds since the Unix Epoch.
- Use .flatMap() instead of map().flat() when possible.
- Use literal property access instead of computed property access.
- Don't use parseInt() or Number.parseInt() when binary, octal, or hexadecimal literals work.
- Use concise optional chaining instead of chained logical expressions.
- Use regular expression literals instead of the RegExp constructor when possible.
- Don't use number literal object member names that aren't base 10 or use underscore separators.
- Remove redundant terms from logical expressions.
- Use while loops instead of for loops when you don't need initializer and update expressions.
- Don't pass children as props.
- Don't reassign const variables.
- Don't use constant expressions in conditions.
- Don't use `Math.min` and `Math.max` to clamp values when the result is constant.
- Don't return a value from a constructor.
- Don't use empty character classes in regular expression literals.
- Don't use empty destructuring patterns.
- Don't call global object properties as functions.
- Don't declare functions and vars that are accessible outside their block.
- Make sure builtins are correctly instantiated.
- Don't use super() incorrectly inside classes. Also check that super() is called in classes that extend other constructors.
- Don't use variables and function parameters before they're declared.
- Don't use 8 and 9 escape sequences in string literals.
- Don't use literal numbers that lose precision.

### React and JSX Best Practices
- Don't use the return value of React.render.
- Make sure all dependencies are correctly specified in React hooks.
- Make sure all React hooks are called from the top level of component functions.
- Don't forget key props in iterators and collection literals.
- Don't destructure props inside JSX components in Solid projects.
- Don't define React components inside other components.
- Don't use event handlers on non-interactive elements.
- Don't assign to React component props.
- Don't use both `children` and `dangerouslySetInnerHTML` props on the same element.
- Don't use dangerous JSX props.
- Don't use Array index in keys.
- Don't insert comments as text nodes.
- Don't assign JSX properties multiple times.
- Don't add extra closing tags for components without children.
- Use `<>...</>` instead of `<Fragment>...</Fragment>`.
- Watch out for possible "wrong" semicolons inside JSX elements.

### Correctness and Safety
- Don't assign a value to itself.
- Don't return a value from a setter.
- Don't compare expressions that modify string case with non-compliant values.
- Don't use lexical declarations in switch clauses.
- Don't use variables that haven't been declared in the document.
- Don't write unreachable code.
- Make sure super() is called exactly once on every code path in a class constructor before this is accessed if the class has a superclass.
- Don't use control flow statements in finally blocks.
- Don't use optional chaining where undefined values aren't allowed.
- Don't have unused function parameters.
- Don't have unused imports.
- Don't have unused labels.
- Don't have unused private class members.
- Don't have unused variables.
- Make sure void (self-closing) elements don't have children.
- Don't return a value from a function with the return type 'void'
- Use isNaN() when checking for NaN.
- Make sure "for" loop update clauses move the counter in the right direction.
- Make sure typeof expressions are compared to valid values.
- Make sure generator functions contain yield.
- Don't use await inside loops.
- Don't use bitwise operators.
- Don't use expressions where the operation doesn't change the value.
- Make sure Promise-like statements are handled appropriately.
- Don't use __dirname and __filename in the global scope.
- Prevent import cycles.
- Don't use configured elements.
- Don't hardcode sensitive data like API keys and tokens.
- Don't let variable declarations shadow variables from outer scopes.
- Don't use the TypeScript directive @ts-ignore.
- Prevent duplicate polyfills from Polyfill.io.
- Don't use useless backreferences in regular expressions that always match empty strings.
- Don't use unnecessary escapes in string literals.
- Don't use useless undefined.
- Make sure getters and setters for the same property are next to each other in class and object definitions.
- Make sure object literals are declared consistently (defaults to explicit definitions).
- Use static Response methods instead of new Response() constructor when possible.
- Make sure switch-case statements are exhaustive.
- Make sure the `preconnect` attribute is used when using Google Fonts.
- Use `Array#{indexOf,lastIndexOf}()` instead of `Array#{findIndex,findLastIndex}()` when looking for the index of an item.
- Make sure iterable callbacks return consistent values.
- Use `with { type: "json" }` for JSON module imports.
- Use numeric separators in numeric literals.
- Use object spread instead of `Object.assign()` when constructing new objects.
- Always use the radix argument when using `parseInt()`.
- Make sure JSDoc comment lines start with a single asterisk, except for the first one.
- Include a description parameter for `Symbol()`.
- Don't use spread (`...`) syntax on accumulators.
- Don't use the `delete` operator.
- Don't access namespace imports dynamically.
- Don't use namespace imports.
- Declare regex literals at the top level.
- Don't use `target="_blank"` without `rel="noopener"`.

### TypeScript Best Practices
- Don't use TypeScript enums.
- Don't export imported variables.
- Don't add type annotations to variables, parameters, and class properties that are initialized with literal expressions.
- Don't use TypeScript namespaces.
- Don't use non-null assertions with the `!` postfix operator.
- Don't use parameter properties in class constructors.
- Don't use user-defined types.
- Use `as const` instead of literal types and type annotations.
- Use either `T[]` or `Array<T>` consistently.
- Initialize each enum member value explicitly.
- Use `export type` for types.
- Use `import type` for types.
- Make sure all enum members are literal values.
- Don't use TypeScript const enum.
- Don't declare empty interfaces.
- Don't let variables evolve into any type through reassignments.
- Don't use the any type.
- Don't misuse the non-null assertion operator (!) in TypeScript files.
- Don't use implicit any type on variable declarations.
- Don't merge interfaces and classes unsafely.
- Don't use overload signatures that aren't next to each other.
- Use the namespace keyword instead of the module keyword to declare TypeScript namespaces.

### Style and Consistency
- Don't use global `eval()`.
- Don't use callbacks in asynchronous tests and hooks.
- Don't use negation in `if` statements that have `else` clauses.
- Don't use nested ternary expressions.
- Don't reassign function parameters.
- This rule lets you specify global variable names you don't want to use in your application.
- Don't use specified modules when loaded by import or require.
- Don't use constants whose value is the upper-case version of their name.
- Use `String.slice()` instead of `String.substr()` and `String.substring()`.
- Don't use template literals if you don't need interpolation or special-character handling.
- Don't use `else` blocks when the `if` block breaks early.
- Don't use yoda expressions.
- Don't use Array constructors.
- Use `at()` instead of integer index access.
- Follow curly brace conventions.
- Use `else if` instead of nested `if` statements in `else` clauses.
- Use single `if` statements instead of nested `if` clauses.
- Use `new` for all builtins except `String`, `Number`, and `Boolean`.
- Use consistent accessibility modifiers on class properties and methods.
- Use `const` declarations for variables that are only assigned once.
- Put default function parameters and optional function parameters last.
- Include a `default` clause in switch statements.
- Use the `**` operator instead of `Math.pow`.
- Use `for-of` loops when you need the index to extract an item from the iterated array.
- Use `node:assert/strict` over `node:assert`.
- Use the `node:` protocol for Node.js builtin modules.
- Use Number properties instead of global ones.
- Use assignment operator shorthand where possible.
- Use function types instead of object types with call signatures.
- Use template literals over string concatenation.
- Use `new` when throwing an error.
- Don't throw non-Error values.
- Use `String.trimStart()` and `String.trimEnd()` over `String.trimLeft()` and `String.trimRight()`.
- Use standard constants instead of approximated literals.
- Don't assign values in expressions.
- Don't use async functions as Promise executors.
- Don't reassign exceptions in catch clauses.
- Don't reassign class members.
- Don't compare against -0.
- Don't use labeled statements that aren't loops.
- Don't use void type outside of generic or return types.
- Don't use console.
- Don't use control characters and escape sequences that match control characters in regular expression literals.
- Don't use debugger.
- Don't assign directly to document.cookie.
- Use `===` and `!==`.
- Don't use duplicate case labels.
- Don't use duplicate class members.
- Don't use duplicate conditions in if-else-if chains.
- Don't use two keys with the same name inside objects.
- Don't use duplicate function parameter names.
- Don't have duplicate hooks in describe blocks.
- Don't use empty block statements and static blocks.
- Don't let switch clauses fall through.
- Don't reassign function declarations.
- Don't allow assignments to native objects and read-only global variables.
- Use Number.isFinite instead of global isFinite.
- Use Number.isNaN instead of global isNaN.
- Don't assign to imported bindings.
- Don't use irregular whitespace characters.
- Don't use labels that share a name with a variable.
- Don't use characters made with multiple code points in character class syntax.
- Make sure to use new and constructor properly.
- Don't use shorthand assign when the variable appears on both sides.
- Don't use octal escape sequences in string literals.
- Don't use Object.prototype builtins directly.
- Don't redeclare variables, functions, classes, and types in the same scope.
- Don't have redundant "use strict".
- Don't compare things where both sides are exactly the same.
- Don't let identifiers shadow restricted names.
- Don't use sparse arrays (arrays with holes).
- Don't use template literal placeholder syntax in regular strings.
- Don't use the then property.
- Don't use unsafe negation.
- Don't use var.
- Don't use with statements in non-strict contexts.
- Make sure async functions actually use await.
- Make sure default clauses in switch statements come last.
- Make sure to pass a message value when creating a built-in error.
- Make sure get methods always return a value.
- Use a recommended display strategy with Google Fonts.
- Make sure for-in loops include an if statement.
- Use Array.isArray() instead of instanceof Array.
- Make sure to use the digits argument with Number#toFixed().
- Make sure to use the "use strict" directive in script files.

### Next.js Specific Rules
- Don't use `<img>` elements in Next.js projects.
- Don't use `<head>` elements in Next.js projects.
- Don't import next/document outside of pages/_document.jsx in Next.js projects.
- Don't use the next/head module in pages/_document.js on Next.js projects.

### Testing Best Practices
- Don't use export or module.exports in test files.
- Don't use focused tests.
- Make sure the assertion function, like expect, is placed inside an it() function call.
- Don't use disabled tests.

## Common Tasks
- `npx ultracite init` - Initialize Ultracite in your project
- `npx ultracite fix` - Format and fix code automatically
- `npx ultracite check` - Check for issues without fixing

## Example: Error Handling
```typescript
// ✅ Good: Comprehensive error handling
try {
  const result = await fetchData();
  return { success: true, data: result };
} catch (error) {
  console.error('API call failed:', error);
  return { success: false, error: error.message };
}

// ❌ Bad: Swallowing errors
try {
  return await fetchData();
} catch (e) {
  console.log(e);
}
```
 
### Frameworks & Libraries (Repository-specific guidance)
- **General patterns**: Follow existing project conventions: use `import type` for types, avoid default exports, prefer arrow functions, use `@/` for internal aliases, and keep components in `src/components/` and route modules in `src/routes/`.
- **React 19**: Use functional components and hooks only. Keep hooks at the top level of components. Provide keyboard handlers alongside `onClick`. Avoid class components, non-null assertions `!`, and `any` types. Use strict TypeScript and prefer controlled form components.
- **TanStack Router**: Implement route modules inside `src/routes/` following existing patterns. Use route-level loaders and actions where appropriate. Keep route generation (`routeTree.gen.ts`) in sync by following the route file conventions.
- **TanStack Query**: Use for client caching/fetching. Put queries in `src/lib/` or `src/services/`. Use stable query keys, handle errors explicitly, and avoid side effects during render.
- **Tailwind CSS**: Use utility classes for styling and keep inline style usage minimal. Ensure accessible color contrast and responsive utilities. Prefer semantic elements with Tailwind classes rather than role-based fallbacks.
- **Vite / Bun**: Development and build tasks use `bun` scripts as defined in `package.json` and `AGENTS.md` (`bun run dev`, `bun run build`, `bun run check`). Generated code should respect Vite hot-module patterns and Bun runtime quirks.
- **Hono (server)**: Server code lives in `apps/server/src/`. Write small, testable route handlers that validate input (use Zod) and return typed JSON responses. Use the project's `Context` helpers (`lib/context.ts`), avoid console statements, and prefer `Response` helper methods when available.
- **Drizzle ORM & Turso**: Keep schema and relations in `apps/server/src/db/schema` and `relations`. Use typed queries from Drizzle, keep migrations generated with `bun run db:generate`, and run `bun run db:migrate` as part of deploy workflows. Put DB access in `src/db/` modules and avoid raw SQL string concatenation.
- **Better Auth / Authentication**: Use existing helpers in `apps/server/src/lib/auth.ts`. Do not hardcode secrets; rely on environment variables and the project's auth abstractions. Maintain role-based checks in services.
- **Cloudflare Workers / Wrangler**: For edge deployments, follow `wrangler.jsonc` constraints: keep bundles small, avoid Node-only APIs, and ensure compatibility with Workers runtime (no heavy native modules). Use environment bindings for secrets.
- **Drizzle/Server patterns**: Keep data access, business logic, and route glue separated — `db/*` → `services/*` → `routers/*`. Export minimal surface area from each module.
- **Biome / Ultracite**: Formatting and linting are enforced via Biome/Ultracite. Run `bun run check` or `npx ultracite fix` before committing. Follow the style rules in this file strictly.
- **Accessibility (a11y)**: Reinforce a11y rules when using frameworks — always add keyboard handlers, `title` on SVGs, meaningful `alt` text, and correct `lang` on `html`.

When generating code for any of the frameworks or libraries above, preserve existing directory structures, follow naming conventions in `AGENTS.md`, avoid introducing new top-level architectural patterns, and prefer small, incremental changes that match current idioms.

## Common Development Tasks

### Adding a New React Component
1. Create component in `apps/web/src/components/` with kebab-case filename
2. Use functional component with TypeScript
3. Import from `@/` alias for internal modules
4. Add keyboard handlers for any `onClick` events
5. Ensure proper ARIA attributes and semantic HTML
6. Use Tailwind classes for styling
7. Export as named export (not default)

**Example:**
```typescript
// apps/web/src/components/match-card.tsx
import type { Match } from '@/types/match';
import { Card } from '@/components/ui/card';

interface MatchCardProps {
  match: Match;
  onSelect?: (matchId: string) => void;
}

export const MatchCard = ({ match, onSelect }: MatchCardProps) => {
  const handleClick = () => {
    onSelect?.(match.id);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleClick();
    }
  };

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className="cursor-pointer hover:shadow-lg transition-shadow"
    >
      <h3 className="text-lg font-semibold">{match.title}</h3>
      <p className="text-sm text-muted-foreground">{match.status}</p>
    </Card>
  );
};
```

### Adding a New API Endpoint
1. Create route handler in `apps/server/src/routers/`
2. Validate input with Zod schemas
3. Use Drizzle for database queries
4. Return typed JSON responses
5. Handle errors explicitly
6. Add authentication/authorization if needed

**Example:**
```typescript
// apps/server/src/routers/matches.ts
import { z } from 'zod';
import { db } from '@/db';
import { matches } from '@/db/schema';
import { eq } from 'drizzle-orm';

const getMatchSchema = z.object({
  id: z.string().uuid(),
});

export const getMatch = async (c: Context) => {
  try {
    const { id } = getMatchSchema.parse(await c.req.json());
    
    const match = await db
      .select()
      .from(matches)
      .where(eq(matches.id, id))
      .limit(1);

    if (match.length === 0) {
      return c.json({ error: 'Match not found' }, 404);
    }

    return c.json({ data: match[0] });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Invalid request', details: error.errors }, 400);
    }
    console.error('Failed to fetch match:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
};
```

### Adding a Database Table
1. Define schema in `apps/server/src/db/schema/`
2. Add relations if needed in `apps/server/src/db/relations/`
3. Run `bun run db:generate` to create migration
4. Review migration file
5. Run `bun run db:migrate` to apply migration
6. Update TypeScript types as needed

**Example:**
```typescript
// apps/server/src/db/schema/matches.ts
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const matches = sqliteTable('matches', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  team1: text('team1').notNull(),
  team2: text('team2').notNull(),
  status: text('status').notNull(),
  startTime: integer('start_time', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});
```

### Adding a TanStack Router Route
1. Create route file in `apps/web/src/routes/` following file-based routing conventions
2. Use route-level loaders for data fetching
3. Implement proper error boundaries
4. Add loading states
5. Route file will auto-generate in `routeTree.gen.ts`

**Example:**
```typescript
// apps/web/src/routes/matches/$matchId.tsx
import { createFileRoute } from '@tanstack/react-router';
import { apiClient } from '@/utils/orpc';

export const Route = createFileRoute('/matches/$matchId')({
  loader: async ({ params }) => {
    const result = await apiClient.matches.get({ id: params.matchId });
    if (result.error) {
      throw new Error(result.error);
    }
    return result.data;
  },
  component: MatchDetail,
  errorComponent: ({ error }) => (
    <div role="alert" className="p-4 text-red-600">
      <p>Failed to load match: {error.message}</p>
    </div>
  ),
  pendingComponent: () => (
    <div className="flex items-center justify-center p-8">
      <Loader />
    </div>
  ),
});

function MatchDetail() {
  const match = Route.useLoaderData();
  return (
    <div>
      <h1 className="text-2xl font-bold">{match.title}</h1>
      {/* ... */}
    </div>
  );
}
```

## Checklist Before Submitting Work
- [ ] Code follows Ultracite rules (no Biome errors)
- [ ] TypeScript compiles without errors (`bun run check-types`)
- [ ] All interactive elements have keyboard handlers
- [ ] Proper ARIA attributes and semantic HTML used
- [ ] Error handling is comprehensive
- [ ] No hardcoded secrets or sensitive data
- [ ] No `console.log` statements in production code
- [ ] Imports use `@/` alias for internal modules
- [ ] Database migrations generated and reviewed (if schema changed)
- [ ] Code matches existing patterns in the codebase
- [ ] Edge cases and error scenarios considered