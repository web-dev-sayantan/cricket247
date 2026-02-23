# Tournament Structures — Architecture & Design Reference

## Overview

Cricket247 supports flexible, multi-stage tournament structures capable of modelling any real-world cricket competition format: straight leagues, knockout brackets, hybrid group-stage-then-knockout events, and multi-leg ties.

This document records the architectural decisions made during the implementation of the stage-based tournament system, the reasoning behind each choice, the formats currently supported, and concrete examples of how to create and seed each format.

---

## Architectural Decisions

### 1. Stage-Based Decomposition

**Decision:** Model a tournament as a sequence of *stages* rather than a monolithic structure.

**Reasoning:**

- Most real cricket tournaments are naturally multi-phase (group stage → Super 8s → knockouts).
- A single-level model cannot represent advancement from one phase to another without either hard-coding phase logic or forcing denormalisation in the `matches` table.
- Stages can be independently typed (`league`, `group`, `knockout`, `round_robin`, `super_over`) and formatted (`single_elimination`, `double_elimination`, `round_robin`, `swiss`), giving maximum flexibility without schema changes.

**Schema:**

```sql
tournament_stages (
  id, tournament_id, name, code,
  stage_type, format, sequence, status,
  parent_stage_id,   -- self-FK for derived/sub-stages
  qualification_slots,
  metadata           -- arbitrary JSON for extra config
)
```

---

### 2. Groups Within a Stage

**Decision:** Introduce a `tournament_stage_groups` table as a child of `tournament_stages`.

**Reasoning:**

- League stages routinely split teams into named pools (Group A, Group B, Pool 1 …).
- Groups are optional: a stage with no groups is treated as a single pool.
- Keeping groups as a separate table (rather than a column on stages) avoids null-heavy schemas and enables querying group standings independently.

**Schema:**

```sql
tournament_stage_groups (
  id, stage_id, name, code,
  sequence, advancing_slots, metadata
)
```

---

### 3. Explicit Team Entry Records

**Decision:** Record each team's presence in a specific stage (and optionally a group) via `tournament_stage_team_entries`, separate from the top-level `tournament_teams`.

**Reasoning:**

- A team registered for a tournament may not participate in every stage (e.g., eliminated before Super 8s).
- Tracking entry per stage allows proper seeding (`seed` column), clear qualification/elimination flags, and an audit trail of *how* a team entered (`direct`, `qualified_from_stage`, `wildcard`).
- The unique constraint on `(stage_id, team_id)` prevents duplicate assignments while still allowing a team to appear in different stages.

---

### 4. Advancement Rules as First-Class Data

**Decision:** Store inter-stage progression rules in a dedicated `tournament_stage_advancements` table rather than embedding them in code or the stage record.

**Reasoning:**

- Advancement logic is highly variable: "top 2 from each group", "3rd-place play-offs", "best runner-up wild cards".
- Encoding this as data means the seeding service can read and apply rules without knowing the specific tournament structure in advance.
- It also makes the rules inspectable and editable via the admin API without deploying code.

**Schema:**

```sql
tournament_stage_advancements (
  id,
  from_stage_id, from_stage_group_id, position_from,
  to_stage_id, to_slot,
  qualification_type  -- 'automatic' | 'playoff' | 'wildcard'
)
```

---

### 5. Match Participant Source Resolution

**Decision:** Add a `match_participant_sources` table to record where each team slot in a match comes from.

**Reasoning:**

- In knockout brackets, match slots are often "winner of match X" or "1st in Group B" rather than a known team at scheduling time.
- Storing this separately from the match itself means matches can be created speculatively (for bracket generation) before results are known, and the source can be resolved lazily once prerequisites are complete.

---

### 6. Lightweight Stage Metadata on Matches

**Decision:** Extend the `matches` table with `stage_id`, `stage_group_id`, `stage_round`, `stage_sequence`, and `knockout_leg` columns.

**Reasoning:**

- Joining back to stages on every match query is expensive and verbose.
- Denormalising these five columns onto `matches` gives instant context for scorecards, fixtures lists, and standings calculations.
- `knockout_leg` (default `1`) enables two-legged ties (SuperSeries, bilateral finals) without a separate table.

---

### 7. Tournament-Level Metadata Additions

**Decision:** Add `type`, `gender_allowed`, and `age_limit` to `tournaments`.

**Reasoning:**

- `type` (`league`, `knockout`, `hybrid`, `bilateral`) classifies the competition at the highest level for filtering and UI display.
- `gender_allowed` (`open`, `men`, `women`, `mixed`) enables gender-specific tournament browsing.
- `age_limit` (default `100`, meaning unlimited) supports age-group events (U19, U23) without a separate entity.

---

### 8. Template Seeding as a Single RPC Call

**Decision:** Implement a `seedTournamentTemplate` admin RPC that creates all stages, groups, team entries, and advancement rules in one transaction-like call.

**Reasoning:**

- Creating a tournament structure manually (stage → group → entries → advancements) requires 10–30 sequential API calls; a template reduces this to one.
- Templates encode opinionated but common configurations that cover 90% of real tournaments.
- Escaping the template is still possible: seed first, then patch individual records via the granular CRUD endpoints.
- `resetExisting: true` (default) makes re-seeding idempotent — safe to repeat without leaving orphaned records.

---

## Supported Formats

### Format 1 — Straight League (`straight_league`)

All registered teams compete in a single round-robin pool. Every team plays every other team (home, away, or neutral depending on tournament config). Final standings determine the winner.

**Stages created:** 1 (`league` stage, `round_robin` format)  
**Groups created:** 0 (single pool)  
**Advancement rules:** 0 (no further stage)

**Example call:**

```typescript
await rpc.seedTournamentTemplate({
  tournamentId: 5,
  template: "straight_league",
});
```

**Typical use:** Bilateral series, domestic league (IPL, BBL regular season), club round-robins.

---

### Format 2 — Straight Knockout (`straight_knockout`)

All (or a selected subset of) teams enter a single-elimination bracket. Matches are seeded 1 vs N, 2 vs N-1, etc. Teams must be a power of 2, or byes are added.

**Stages created:** 1 (`knockout` stage, `single_elimination` format)  
**Groups created:** 0  
**Advancement rules:** 0

**Example call:**

```typescript
// All registered teams
await rpc.seedTournamentTemplate({
  tournamentId: 8,
  template: "straight_knockout",
});

// Specific 8-team bracket
await rpc.seedTournamentTemplate({
  tournamentId: 8,
  template: "straight_knockout",
  teamIds: [3, 7, 12, 15, 18, 21, 24, 27],
});
```

**Typical use:** Cup competitions, finals days, one-off tournaments.

---

### Format 3 — Grouped League with Playoffs (`grouped_league_with_playoffs`)

Teams are distributed across N groups (default 2). Each group plays a round-robin. The top `advancingPerGroup` teams from each group qualify to a knockout playoff stage. Advancement rules are automatically created with a cross-seeding pattern (1st Group A vs 2nd Group B, etc.) for 2-group formats, and sequential seeding for larger group counts.

**Stages created:** 2 (`group` stage + `knockout` playoffs stage)  
**Groups created:** `groupCount` (default 2) under the group stage  
**Advancement rules:** `groupCount × advancingPerGroup` rows  

**Example calls:**

```typescript
// 4 groups, top 2 advance → 8-team knockout
await rpc.seedTournamentTemplate({
  tournamentId: 12,
  template: "grouped_league_with_playoffs",
  groupCount: 4,
  advancingPerGroup: 2,
});

// 2 groups, top 4 advance → 8-team knockout (ICC T20 World Cup style)
await rpc.seedTournamentTemplate({
  tournamentId: 14,
  template: "grouped_league_with_playoffs",
  groupCount: 2,
  advancingPerGroup: 4,
});

// Only seed from specific enrolled teams
await rpc.seedTournamentTemplate({
  tournamentId: 14,
  template: "grouped_league_with_playoffs",
  teamIds: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  groupCount: 3,
  advancingPerGroup: 2,
});
```

**Typical use:** ICC World Cups (group stage → Super 8s/knockouts), domestic cups with group phases, club tournaments with large team counts.

---

## Data Model Summary

```
tournaments
  └── tournament_stages          (sequence-ordered)
        ├── tournament_stage_groups    (sequence-ordered within stage)
        │     └── tournament_stage_team_entries
        ├── tournament_stage_team_entries  (entries without a group)
        └── tournament_stage_advancements  (from → to rules)

matches
  ├── stage_id  ──────────────────► tournament_stages
  ├── stage_group_id  ────────────► tournament_stage_groups
  └── match_participant_sources   (per-slot source resolution)
```

---

## API Reference

### RPC Endpoints (ORPC — admin required)

| Procedure | Input | Description |
|---|---|---|
| `seedTournamentTemplate` | `{ tournamentId, template, teamIds?, resetExisting?, groupCount?, advancingPerGroup? }` | Seed a full structure from a template |
| `createTournamentStage` | Stage body | Create a single stage |
| `updateTournamentStage` | `{ id, data }` | Update a stage |
| `deleteTournamentStage` | `{ id }` | Delete a stage |
| `createTournamentStageGroup` | Group body | Create a group within a stage |
| `updateTournamentStageGroup` | `{ id, data }` | Update a group |
| `deleteTournamentStageGroup` | `{ id }` | Delete a group |

### RPC Endpoints (public read)

| Procedure | Input | Description |
|---|---|---|
| `tournamentStructure` | `{ tournamentId }` | Full structure with stages, groups, entries, advancements |
| `stageGroupsByStage` | `{ stageId }` | Groups belonging to a stage, ordered by sequence |

### REST Management Routes

All standard CRUD operations are also available under `/management/tournament-stages` and `/management/tournament-stage-groups` via the server's REST management router.

---

## Error Codes (`SeedTournamentTemplateError`)

| Code | Meaning |
|---|---|
| `TOURNAMENT_NOT_FOUND` | No tournament with the given id |
| `NO_TOURNAMENT_TEAMS` | Tournament has no registered teams to seed from |
| `INVALID_TEAM_SELECTION` | One or more provided `teamIds` are not registered for this tournament |
| `INVALID_TEMPLATE_CONFIGURATION` | `groupCount` / `advancingPerGroup` yields an impossible structure (e.g. more advancing than teams per group) |

---

## Extending the System

1. **Add a new stage type or format**: Update the `stageType` / `format` check constraints in the schema and add a new template branch in `tournament-template.service.ts`.
2. **Custom advancement logic**: Insert rows into `tournament_stage_advancements` manually via CRUD endpoints after seeding.
3. **Two-legged ties**: Set `knockout_leg = 2` on the second match in a pair; aggregate scoring is handled at the service layer.
4. **Sub-stages (Super Over, Play-offs)**: Use `parent_stage_id` to attach a sub-stage to its parent stage.
