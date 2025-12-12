# @cricket247/types

Centralized type definitions for the Cricket247 monorepo. This package exports types that are shared between the backend (Hono server) and frontend (React web app).

## Usage

### Import all types

```typescript
import type { Tournament, Team, Player } from "@cricket247/types";
```

### Import database types specifically

```typescript
import type { Match, Innings, Ball } from "@cricket247/types/database";
```

## Types

### Database Entity Types (Select)

- `Tournament` - Tournament data
- `Team` - Team data
- `Venue` - Venue data
- `Player` - Player data
- `Match` - Match data
- `Innings` - Innings data
- `Ball` - Ball data
- `TournamentTeam` - Tournament-Team association
- `TeamPlayer` - Team-Player association
- `PlayerMatchPerformance` - Player performance in a match
- `PlayerTournamentStats` - Player statistics in a tournament
- `PlayerCareerStats` - Player career statistics

### Database Entity Types (Insert)

Insert types are prefixed with `New`:

- `NewTournament`, `NewTeam`, `NewVenue`, etc.

These types represent the shape of data when creating new records.

## Architecture

The types are exported from:

- `src/database.ts` - Re-exports Drizzle ORM types from the server

This re-export pattern allows the frontend to access database types without a direct dependency on the server package, while keeping the server as the single source of truth.

## Path Aliases

Both apps have configured path aliases to import from this package:

```typescript
// In apps/server/tsconfig.json and apps/web/tsconfig.json
"@cricket247/types": ["../../packages/types/src/index.ts"]
```

This allows imports like:

```typescript
import type { Tournament } from "@cricket247/types";
```

Instead of relative paths like:

```typescript
import type { Tournament } from "../../packages/types/src/index.ts";
```
