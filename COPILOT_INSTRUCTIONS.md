# Copilot Instructions Overview

This document provides an overview of the Copilot instruction files in this repository and how to use them effectively.

## Instruction Files

### 1. `.github/copilot-instructions.md` (Repository-wide)
**Scope**: All TypeScript/JavaScript files (`**/*.{ts,tsx,js,jsx}`)

This is the main instruction file that applies to the entire repository. It contains:
- Project overview and tech stack
- Development workflow and common commands
- Task delegation guidelines for AI agents
- Complete Ultracite code quality rules (accessibility, TypeScript, React, etc.)
- Framework-specific guidance (React 19, TanStack Router, Hono, Drizzle, etc.)
- Practical examples for common development tasks
- Pre-submission checklist

**When to read**: Always read this first when working on any task in the repository.

### 2. `apps/server/.instructions.md` (Backend-specific)
**Scope**: All files in `apps/server/` directory

Focused instructions for backend development:
- Server architecture and directory structure
- API route handler patterns
- Database query patterns with Drizzle ORM
- Authentication with Better-Auth
- Security and performance best practices
- Cloudflare Workers deployment constraints
- Common backend tasks (adding endpoints, database tables, etc.)

**When to read**: When working on API endpoints, database schemas, authentication, or server-side logic.

### 3. `apps/web/.instructions.md` (Frontend-specific)
**Scope**: All files in `apps/web/` directory

Focused instructions for frontend development:
- React component patterns and best practices
- TanStack Router file-based routing
- TanStack Query data fetching patterns
- Accessibility requirements (critical)
- Styling with Tailwind CSS and shadcn/ui
- Common frontend tasks (adding pages, components, etc.)
- Cloudflare Pages deployment

**When to read**: When working on UI components, pages, routing, or client-side logic.

### 4. `AGENTS.md` (Development Guidelines)
**Scope**: Reference document for all development

Comprehensive development guidelines including:
- Build, lint, and test commands for all apps
- Code style guidelines and naming conventions
- Architecture overview
- Common patterns for API calls, forms, database queries
- Security best practices

**When to read**: Before starting development to understand project conventions and available commands.

## How to Use These Instructions

### For AI Coding Agents (like GitHub Copilot)

Copilot will automatically read and follow the instructions based on the file you're working on:

1. **Working on backend code** (`apps/server/`):
   - Copilot reads `.github/copilot-instructions.md` (repository-wide rules)
   - Copilot reads `apps/server/.instructions.md` (backend-specific patterns)

2. **Working on frontend code** (`apps/web/`):
   - Copilot reads `.github/copilot-instructions.md` (repository-wide rules)
   - Copilot reads `apps/web/.instructions.md` (frontend-specific patterns)

3. **Working on root-level files**:
   - Copilot reads `.github/copilot-instructions.md` only

### For Human Developers

1. **Starting a new task**: Read `AGENTS.md` to understand available commands and project structure
2. **Writing code**: Refer to the relevant `.instructions.md` file for patterns and examples
3. **Before committing**: Use the checklist in `.github/copilot-instructions.md`

## Best Practices for Working with Copilot

### Creating Good Issues/Tasks

When creating issues for Copilot coding agent:

✅ **Good Issue**:
```
Title: Add match score update API endpoint

Description:
Create a new API endpoint to update match scores.

Requirements:
- POST /api/matches/:id/score
- Accept matchId, runs, wickets, overs in request body
- Validate input with Zod
- Update database using Drizzle
- Return updated match data
- Add proper error handling

Acceptance Criteria:
- Endpoint validates all inputs
- Database is updated correctly
- Returns appropriate status codes
- Follows existing API patterns
```

❌ **Bad Issue**:
```
Title: Fix the match thing

Description:
The match scores aren't working right. Fix it.
```

### Good Tasks for AI Agents

- **Bug fixes** with clear reproduction steps
- **New features** with specific requirements
- **Refactoring** to improve code quality
- **Documentation** updates
- **UI components** following existing patterns
- **API endpoints** with clear input/output specs

### Tasks Requiring Human Review

- **Security-critical changes** (authentication, authorization)
- **Database migrations** on production
- **Breaking changes** to APIs
- **Complex business logic** requiring domain knowledge
- **Performance optimization** of critical paths

## File Organization

```
cricket247/
├── .github/
│   └── copilot-instructions.md    # Repository-wide instructions
├── apps/
│   ├── server/
│   │   ├── .instructions.md       # Backend-specific instructions
│   │   └── src/                   # Server source code
│   └── web/
│       ├── .instructions.md       # Frontend-specific instructions
│       └── src/                   # Web app source code
├── AGENTS.md                      # Development guidelines
├── COPILOT_INSTRUCTIONS.md        # This file
└── README.md                      # Getting started guide
```

## Updating Instructions

When project patterns or requirements change:

1. **Update relevant instruction files** to reflect new patterns
2. **Keep examples up-to-date** with actual code patterns
3. **Test instructions** by creating sample tasks for Copilot
4. **Document new patterns** as they emerge
5. **Keep instructions focused** - remove outdated content

## Quick Reference

| Working on... | Read these files |
|--------------|------------------|
| Backend API | `.github/copilot-instructions.md` + `apps/server/.instructions.md` + `AGENTS.md` |
| Frontend UI | `.github/copilot-instructions.md` + `apps/web/.instructions.md` + `AGENTS.md` |
| Database | `.github/copilot-instructions.md` + `apps/server/.instructions.md` |
| Build/Deploy | `AGENTS.md` + `README.md` |
| New feature | All of the above |

## Resources

- [GitHub Copilot Best Practices](https://docs.github.com/en/copilot/tutorials/coding-agent/get-the-best-results)
- [Copilot Coding Agent 101](https://github.blog/ai-and-ml/github-copilot/github-copilot-coding-agent-101-getting-started-with-agentic-workflows-on-github/)
- [Better-T-Stack Documentation](https://github.com/AmanVarshney01/create-better-t-stack)
- Repository: [cricket247 on GitHub](https://github.com/web-dev-sayantan/cricket247)

---

**Remember**: These instructions help Copilot understand your codebase and coding standards. Keep them updated as your project evolves!
