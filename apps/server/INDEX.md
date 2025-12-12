# 📖 Cricket247 Backend - Complete Index

Welcome to the Cricket247 backend! This index will guide you to the right documentation.

## 🚀 Quick Start

1. **New to this project?** → Start with [README.md](./README.md)
2. **Understanding the structure?** → Read [ARCHITECTURE.md](./ARCHITECTURE.md)
3. **Need code examples?** → Check [QUICK_REFERENCE.md](./QUICK_REFERENCE.md)
4. **Want to know what changed?** → See [MIGRATION_SUMMARY.md](./MIGRATION_SUMMARY.md)
5. **Confused about folders?** → Open [FOLDER_STRUCTURE.md](./FOLDER_STRUCTURE.md)

## 📁 Project Structure Quick Reference

```
apps/server/
├── src/
│   ├── config/           # ⚙️  App configuration
│   ├── db/               # 🗄️  Database (Drizzle ORM)
│   ├── lib/              # 📚  Core libraries (Auth, ORPC)
│   ├── middleware/       # 🛡️  HTTP middleware
│   ├── routes/           # 🛣️  REST API routes
│   ├── routers/          # 🔌  ORPC type-safe RPC
│   ├── schemas/          # ✅  Zod validation
│   ├── services/         # 💼  Business logic
│   ├── utils/            # 🔧  Utility functions
│   └── index.ts          # 🚀  Entry point
│
├── README.md                    # 📖 Main documentation
├── ARCHITECTURE.md              # 🏛️  Architecture guide
├── QUICK_REFERENCE.md           # ⚡  Code snippets
├── FOLDER_STRUCTURE.md          # 📂  Folder organization
├── MIGRATION_SUMMARY.md         # 📊  What changed
└── package.json                 # 📦  Dependencies
```

## 🎯 Common Tasks - Quick Links

### Adding Features

- [Create a new endpoint](./QUICK_REFERENCE.md#creating-a-new-rest-api-endpoint)
- [Add validation schema](./QUICK_REFERENCE.md#adding-validation-schema)
- [Create a service](./QUICK_REFERENCE.md#creating-a-service)
- [Add middleware](./QUICK_REFERENCE.md#creating-protected-routes)

### Understanding the Code

- [Request flow](./ARCHITECTURE.md#-request-flow)
- [Security layers](./ARCHITECTURE.md#-security-layers)
- [Design patterns](./ARCHITECTURE.md#-design-patterns)
- [Module dependencies](./ARCHITECTURE.md#-module-dependencies)

### Working with Data

- [Database queries](./QUICK_REFERENCE.md#database-queries-with-drizzle)
- [Validation](./QUICK_REFERENCE.md#using-validation-schema)
- [Error handling](./QUICK_REFERENCE.md#error-handling-in-services)

### Configuration

- [Environment variables](./README.md#-environment-variables)
- [Constants](./QUICK_REFERENCE.md#using-constants)
- [CORS setup](./src/config/cors.ts)

## 📚 Documentation Map

### Level 1: Getting Started

| Document                                       | Purpose                                | When to Read                  |
| ---------------------------------------------- | -------------------------------------- | ----------------------------- |
| [README.md](./README.md)                       | Project overview, setup, API endpoints | First time setup              |
| [MIGRATION_SUMMARY.md](./MIGRATION_SUMMARY.md) | What's new and what changed            | Understanding the restructure |

### Level 2: Understanding

| Document                                     | Purpose                        | When to Read              |
| -------------------------------------------- | ------------------------------ | ------------------------- |
| [ARCHITECTURE.md](./ARCHITECTURE.md)         | System design, patterns, flows | Learning the architecture |
| [FOLDER_STRUCTURE.md](./FOLDER_STRUCTURE.md) | File organization, naming      | Navigating the codebase   |

### Level 3: Building

| Document                                   | Purpose                 | When to Read         |
| ------------------------------------------ | ----------------------- | -------------------- |
| [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) | Code examples, snippets | Writing new features |

## 🔍 Find What You Need

### By Role

#### 👨‍💻 Backend Developer

1. Start: [README.md](./README.md)
2. Learn: [ARCHITECTURE.md](./ARCHITECTURE.md)
3. Code: [QUICK_REFERENCE.md](./QUICK_REFERENCE.md)
4. Reference: [FOLDER_STRUCTURE.md](./FOLDER_STRUCTURE.md)

#### 🎨 Frontend Developer

1. API Docs: [README.md#-api-endpoints](./README.md#-api-endpoints)
2. Authentication: [README.md#-authentication--authorization](./README.md#-authentication--authorization)
3. Response Format: [QUICK_REFERENCE.md#using-response-helpers](./QUICK_REFERENCE.md#using-response-helpers)

#### 📊 DevOps Engineer

1. Setup: [README.md#-getting-started](./README.md#-getting-started)
2. Environment: [README.md#-environment-variables](./README.md#-environment-variables)
3. Database: [README.md#-database-management](./README.md#-database-management)
4. Architecture: [ARCHITECTURE.md](./ARCHITECTURE.md)

#### 🧪 QA Engineer

1. Endpoints: [README.md#-api-endpoints](./README.md#-api-endpoints)
2. Testing: [QUICK_REFERENCE.md#testing-endpoints-with-curl](./QUICK_REFERENCE.md#testing-endpoints-with-curl)
3. Response Format: [ARCHITECTURE.md#-design-patterns](./ARCHITECTURE.md#-design-patterns)

### By Task

#### 🆕 Creating New Features

1. [Route creation](./QUICK_REFERENCE.md#creating-a-new-rest-api-endpoint)
2. [Service pattern](./QUICK_REFERENCE.md#creating-a-service)
3. [Validation](./QUICK_REFERENCE.md#adding-validation-schema)
4. [File naming](./FOLDER_STRUCTURE.md#-file-naming-conventions)

#### 🔐 Security & Auth

1. [Auth overview](./README.md#-authentication--authorization)
2. [Protected routes](./QUICK_REFERENCE.md#creating-protected-routes)
3. [Middleware](./ARCHITECTURE.md#-security-layers)
4. [User roles](./README.md#user-roles)

#### 🗄️ Database Work

1. [Drizzle queries](./QUICK_REFERENCE.md#database-queries-with-drizzle)
2. [Database management](./README.md#-database-management)
3. [Schema location](./FOLDER_STRUCTURE.md#db)

#### 🐛 Debugging

1. [Error handling](./ARCHITECTURE.md#-design-patterns)
2. [Debugging tips](./QUICK_REFERENCE.md#-debugging-tips)
3. [Common patterns](./QUICK_REFERENCE.md#-common-patterns)

#### 📈 Scaling

1. [Scalability](./ARCHITECTURE.md#-scalability-considerations)
2. [Performance](./ARCHITECTURE.md#-performance-optimizations)
3. [Best practices](./README.md#-best-practices)

## 🛠️ Development Commands

```bash
# Development
bun run dev              # Start dev server
bun run check-types      # TypeScript check
bun run build            # Build for production

# Database
bun run db:push          # Push schema changes
bun run db:studio        # Open Drizzle Studio
bun run db:generate      # Generate migrations
bun run db:migrate       # Run migrations
```

## 📊 Code Statistics

| Metric                 | Count             |
| ---------------------- | ----------------- |
| Total Files            | 27 new + existing |
| API Endpoints          | 20+ defined       |
| Middleware Functions   | 5                 |
| Validation Schemas     | 15+               |
| Utility Functions      | 20+               |
| Documentation Pages    | 5                 |
| Lines of Documentation | 1,500+            |

## 🎓 Learning Path

### Beginner Path

1. ✅ Read [README.md](./README.md) intro
2. ✅ Follow setup instructions
3. ✅ Test health endpoint
4. ✅ Review [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) examples
5. ✅ Create your first endpoint

### Intermediate Path

1. ✅ Study [ARCHITECTURE.md](./ARCHITECTURE.md)
2. ✅ Understand request flow
3. ✅ Learn middleware patterns
4. ✅ Explore service layer
5. ✅ Add protected routes

### Advanced Path

1. ✅ Master [FOLDER_STRUCTURE.md](./FOLDER_STRUCTURE.md)
2. ✅ Implement complex features
3. ✅ Optimize database queries
4. ✅ Add caching layer
5. ✅ Design microservices split

## 🔗 External Resources

- [Hono Documentation](https://hono.dev/)
- [Drizzle ORM Guide](https://orm.drizzle.team/)
- [Better Auth Docs](https://www.better-auth.com/)
- [Zod Documentation](https://zod.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

## 📞 Need Help?

1. **Can't find what you need?** Check the [QUICK_REFERENCE.md](./QUICK_REFERENCE.md)
2. **Architecture questions?** See [ARCHITECTURE.md](./ARCHITECTURE.md)
3. **Setup issues?** Review [README.md](./README.md)
4. **File organization?** Open [FOLDER_STRUCTURE.md](./FOLDER_STRUCTURE.md)

## ✅ Next Steps

1. ✅ Setup environment variables (`.env`)
2. ✅ Run `bun install`
3. ✅ Run `bun run db:push`
4. ✅ Run `bun run dev`
5. ✅ Test `http://localhost:3000/api/v1/health`
6. ✅ Start building! 🚀

---

**Happy Coding! 🎉**

For the most up-to-date information, always refer to the README.md file.
