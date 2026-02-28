# Tournament Structures — Architecture & Schema Reference

## Overview

Cricket247 uses a stage-based tournament model designed to support league, grouped, knockout, and hybrid competitions.

This document keeps the original architectural rationale while aligning all structural details to the current Drizzle schema in `apps/server/src/db/schema/index.ts`.

---

## Architectural Decisions

### 1. Stage-Based Decomposition

**Decision:** Model tournaments as an ordered sequence of stages (`tournament_stages`) instead of a single flat tournament format.

**Why this helps:**

- Real competitions are often multi-phase (for example, group stage then knockouts).
- Stage boundaries provide a clean way to represent transitions and qualification.
- Per-stage metadata (`stageType`, `format`, `sequence`, `status`, `qualificationSlots`) avoids overloading the match record.

**Schema-aligned stage fields:**

- `id`, `tournamentId`, `name`, `code`
- `stageType` (default: `league`)
- `format` (default: `single_round_robin`)
- `sequence` (default: `1`)
- `status` (default: `upcoming`)
- `parentStageId` (self FK)
- `qualificationSlots` (default: `0`)
- `matchFormatId` (FK -> `match_formats.id`)
- `metadata` (json text)

---

### 2. Groups Within a Stage

**Decision:** Represent groups in `tournament_stage_groups` rather than embedding group data directly in stages.

**Why this helps:**

- Grouped and non-grouped stages can coexist cleanly.
- Group-level ordering and qualification can be managed independently.
- Group records stay queryable for standings/advancement logic.

**Schema-aligned group fields:**

- `id`, `stageId`, `name`, `code`
- `sequence` (default: `1`)
- `advancingSlots` (default: `0`)
- `metadata` (json text)

Constraint highlights:

- Unique sequence per stage: `tournament_stage_groups_stage_sequence_unique` on (`stageId`, `sequence`)

---

### 3. Explicit Team Entries Per Stage

**Decision:** Keep stage participation in `tournament_stage_team_entries` rather than inferring from `tournament_teams`.

**Why this helps:**

- Tournament registration and stage participation are distinct concepts.
- Teams can be seeded and tracked per stage/group.
- Qualification/elimination state is explicit and auditable.

**Schema-aligned entry fields:**

- `tournamentId`, `stageId`, `stageGroupId`, `teamId`
- `seed`
- `entrySource` (default: `direct`)
- `isQualified` (boolean integer, default: `false`)
- `isEliminated` (boolean integer, default: `false`)

Constraint highlights:

- Unique team per stage: `tournament_stage_team_entries_stage_team_unique` on (`stageId`, `teamId`)

---

### 4. Advancement Rules as Data

**Decision:** Store stage-to-stage qualification mapping in `tournament_stage_advancements`.

**Why this helps:**

- Progression rules vary by tournament design.
- Qualification becomes inspectable and editable as records.
- Seeding/scheduling logic can resolve transitions from data.

**Schema-aligned advancement fields:**

- `fromStageId`, `fromStageGroupId`, `positionFrom`
- `toStageId`, `toSlot`
- `qualificationType` (default: `position`)

Constraint highlights:

- Unique progression source key: `tournament_stage_advancements_from_position_unique` on (`fromStageId`, `fromStageGroupId`, `positionFrom`)

---

### 5. Match Participant Source Resolution

**Decision:** Use `match_participant_sources` to describe how each team slot in a match is derived.

**Why this helps:**

- Bracket matches can be created before exact teams are known.
- Slot origin can reference team, prior match, stage, and position.
- Deferred resolution supports dynamic bracket advancement.

**Schema-aligned source fields:**

- `matchId`, `teamSlot` (default: `1`)
- `sourceType` (default: `team`)
- `sourceTeamId`, `sourceMatchId`, `sourceStageId`, `sourceStageGroupId`, `sourcePosition`

Constraint highlights:

- Unique per match slot: `match_participant_sources_match_slot_unique` on (`matchId`, `teamSlot`)

---

### 6. Stage Metadata on Matches

**Decision:** Keep stage context directly on `matches` using nullable stage columns.

**Why this helps:**

- Stage-aware fixture queries are straightforward.
- Match rows preserve where each game belongs in tournament flow.
- Knockout legs are represented without a separate tie table.

**Schema-aligned stage columns on matches:**

- `stageId`, `stageGroupId`
- `stageRound`, `stageSequence`
- `knockoutLeg` (default: `1`)

---

### 7. Tournament-Level Classification and Defaults

**Decision:** Keep high-level tournament metadata in `tournaments`.

**Why this helps:**

- Enables filtering and presentation by competition type.
- Supports demographic constraints and age categories.
- Provides tournament-wide default match format.

**Schema-aligned fields:**

- `type` (default: `league`)
- `genderAllowed` (default: `open`)
- `ageLimit` (default: `100`)
- `defaultMatchFormatId` (FK -> `match_formats.id`)

---

### 8. Match Format Flexibility Across Tournament Levels

**Decision:** Allow match format to be set at tournament, stage, and match levels.

**Why this helps:**

- Different stages can have different playing conditions.
- Individual matches can override format where needed.
- Snapshot fields preserve match-time rules for stats/scoring stability.

**Schema-aligned representation:**

- Tournament default: `tournaments.defaultMatchFormatId`
- Stage-level format: `tournament_stages.matchFormatId`
- Match override: `matches.matchFormatId`
- Snapshot fields on `matches`:
  - `inningsPerSide`, `oversPerSide`, `maxOverPerBowler`
  - `ballsPerOverSnapshot`, `maxLegalBallsPerInningsSnapshot`, `maxOversPerBowlerSnapshot`, `playersPerSide`

---

## Exact Table Reference (Current Schema)

### `tournaments`

- `id` (PK, not null)
- `name` (text, not null)
- `category` (text, not null, default: `competitive`)
- `season` (text, nullable)
- `type` (text, not null, default: `league`)
- `genderAllowed` (text, not null, default: `open`)
- `ageLimit` (integer, nullable, default: `100`)
- `organizationId` (FK -> `organizations.id`, not null)
- `startDate` (timestamp, not null)
- `endDate` (timestamp, not null)
- `defaultMatchFormatId` (FK -> `match_formats.id`, not null)
- `championTeamId` (FK -> `teams.id`, nullable)
- `createdAt`, `updatedAt` (timestamp_ms, not null)

Index:

- `tournament_organization_idx` on (`organizationId`)

---

### `tournament_teams`

- `id` (PK)
- `tournamentId` (FK -> `tournaments.id`, not null)
- `teamId` (FK -> `teams.id`, not null)
- `points` (integer, default: `0`)
- `matchesPlayed` (integer, default: `0`)
- `matchesWon` (integer, default: `0`)
- `matchesLost` (integer, default: `0`)
- `matchesTied` (integer, default: `0`)
- `matchesDrawn` (integer, default: `0`)
- `createdAt`, `updatedAt` (timestamp_ms, not null)

Constraint:

- `unique_tournament_team` on (`tournamentId`, `teamId`)

---

### `tournament_stages`

- `id` (PK, not null)
- `tournamentId` (FK -> `tournaments.id`, not null)
- `name` (text, not null)
- `code` (text, nullable)
- `stageType` (text, not null, default: `league`)
- `format` (text, not null, default: `single_round_robin`)
- `sequence` (integer, not null, default: `1`)
- `status` (text, not null, default: `upcoming`)
- `parentStageId` (self FK -> `tournament_stages.id`, nullable)
- `qualificationSlots` (integer, not null, default: `0`)
- `matchFormatId` (FK -> `match_formats.id`, not null)
- `metadata` (json text, nullable)
- `createdAt`, `updatedAt` (timestamp_ms, not null)

Indexes/constraints:

- `tournament_stages_tournament_idx` on (`tournamentId`)
- `tournament_stages_sequence_idx` on (`tournamentId`, `sequence`)
- `tournament_stages_tournament_sequence_unique` on (`tournamentId`, `sequence`)
- `fk_tournament_stages_parent_stage` (`parentStageId` -> `id`)

---

### `tournament_stage_groups`

- `id` (PK, not null)
- `stageId` (FK -> `tournament_stages.id`, not null)
- `name` (text, not null)
- `code` (text, nullable)
- `sequence` (integer, not null, default: `1`)
- `advancingSlots` (integer, not null, default: `0`)
- `metadata` (json text, nullable)
- `createdAt`, `updatedAt` (timestamp_ms, not null)

Indexes/constraints:

- `tournament_stage_groups_stage_idx` on (`stageId`)
- `tournament_stage_groups_stage_sequence_unique` on (`stageId`, `sequence`)

---

### `tournament_stage_team_entries`

- `id` (PK, not null)
- `tournamentId` (FK -> `tournaments.id`, not null)
- `stageId` (FK -> `tournament_stages.id`, not null)
- `stageGroupId` (FK -> `tournament_stage_groups.id`, nullable)
- `teamId` (FK -> `teams.id`, not null)
- `seed` (integer, nullable)
- `entrySource` (text, not null, default: `direct`)
- `isQualified` (boolean integer, not null, default: `false`)
- `isEliminated` (boolean integer, not null, default: `false`)
- `createdAt`, `updatedAt` (timestamp_ms, not null)

Indexes/constraints:

- `tournament_stage_team_entries_stage_team_unique` on (`stageId`, `teamId`)
- `tournament_stage_team_entries_tournament_idx` on (`tournamentId`)
- `tournament_stage_team_entries_group_idx` on (`stageGroupId`)

---

### `tournament_stage_advancements`

- `id` (PK, not null)
- `fromStageId` (FK -> `tournament_stages.id`, not null)
- `fromStageGroupId` (FK -> `tournament_stage_groups.id`, nullable)
- `positionFrom` (integer, not null)
- `toStageId` (FK -> `tournament_stages.id`, not null)
- `toSlot` (integer, not null)
- `qualificationType` (text, not null, default: `position`)
- `createdAt`, `updatedAt` (timestamp_ms, not null)

Indexes/constraints:

- `tournament_stage_advancements_from_position_unique` on (`fromStageId`, `fromStageGroupId`, `positionFrom`)
- `tournament_stage_advancements_to_stage_idx` on (`toStageId`)

---

### `matches` (tournament-stage related fields)

- `tournamentId` (FK -> `tournaments.id`, not null)
- `matchFormatId` (FK -> `match_formats.id`, nullable)
- `stageId` (FK -> `tournament_stages.id`, nullable)
- `stageGroupId` (FK -> `tournament_stage_groups.id`, nullable)
- `stageRound` (integer, nullable)
- `stageSequence` (integer, nullable)
- `knockoutLeg` (integer, not null, default: `1`)

Format/snapshot fields:

- `inningsPerSide` (default: `1`)
- `oversPerSide` (default: `20`)
- `maxOverPerBowler` (default: `4`)
- `ballsPerOverSnapshot` (default: `6`)
- `maxLegalBallsPerInningsSnapshot` (nullable)
- `maxOversPerBowlerSnapshot` (nullable)
- `playersPerSide` (default: `11`)

Index:

- `matches_format_idx` on (`matchFormatId`)

---

### `match_participant_sources`

- `id` (PK, not null)
- `matchId` (FK -> `matches.id`, not null)
- `teamSlot` (integer, not null, default: `1`)
- `sourceType` (text, not null, default: `team`)
- `sourceTeamId` (FK -> `teams.id`, nullable)
- `sourceMatchId` (FK -> `matches.id`, nullable)
- `sourceStageId` (FK -> `tournament_stages.id`, nullable)
- `sourceStageGroupId` (FK -> `tournament_stage_groups.id`, nullable)
- `sourcePosition` (integer, nullable)
- `createdAt`, `updatedAt` (timestamp_ms, not null)

Indexes/constraints:

- `match_participant_sources_match_slot_unique` on (`matchId`, `teamSlot`)
- `match_participant_sources_source_match_idx` on (`sourceMatchId`)
- `match_participant_sources_source_stage_idx` on (`sourceStageId`)

---

## Data Model Summary

```text
tournaments
  ├── tournament_teams
  └── tournament_stages          (ordered by sequence)
        ├── tournament_stage_groups (ordered by sequence)
        │     └── tournament_stage_team_entries
        ├── tournament_stage_team_entries
        └── tournament_stage_advancements

matches
  ├── stageId / stageGroupId
  └── match_participant_sources
```

## Notes

- Categorical fields are stored as `text` with defaults; this schema file does not define enum/check constraints for them.
- Booleans are represented as SQLite integer booleans (`integer({ mode: 'boolean' })`).
- Timestamp columns `createdAt`/`updatedAt` are shared across these tables via common helpers.
