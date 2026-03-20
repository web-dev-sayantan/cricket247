# `recordScoringDelivery` Optimization Reference

This document summarizes the changes made to `recordScoringDelivery` so the same ideas can be applied to `updateScoringDelivery` and `deleteScoringDelivery`.

## Goal

Reduce end-to-end latency of scoring mutations by removing unnecessary database round trips and avoiding full innings replay work on the append path.

## What changed

### 1. Replaced full-session prefetch with a compact mutation context

Before:
- `recordScoringDelivery` loaded the full scoring session before insert.
- That pulled rosters, lineup data, innings data, deliveries, and match rules just to validate a single ball and determine the next write position.

Now:
- `getScoringDeliveryContext(inningsId)` loads only the data needed for a write:
  - innings counters and opening players
  - match rule flags and snapshot-based rules
  - saved lineup rows
  - last delivery only
  - existing player innings stats
  - precomputed entry context
- This is the key server-side optimization for the append path.

## 2. Switched append from replay-based sync to incremental updates

Before:
- Insert delivery
- Replay the entire innings
- Recompute innings totals
- Rebuild all player innings stats

Now:
- Insert the new delivery inside a transaction
- Update `innings` totals incrementally:
  - `totalScore`
  - `wickets`
  - `ballsBowled`
  - extras fields
- Upsert only the affected `player_innings_stats` rows:
  - striker
  - bowler
  - dismissed batter if any
  - assisting fielder if any
- Derive maiden-over effects with a small current-over read only when needed

Reusable idea for update/delete:
- Keep replay for correctness first if needed, but aim to move toward delta-based updates by reversing or recalculating only affected rows instead of rebuilding the whole innings.

## 3. Introduced a lightweight mutation response

Before:
- Delivery mutations returned the entire scoring session.

Now:
- Delivery mutations return `ScoringMutationResult`, which contains:
  - `action`
  - `affectedInnings`
  - `currentInnings`
  - `delivery` or `deletedDeliveryId`
  - `entryContext`
  - `availableBatters`
  - `availableBowlers`
  - `requiredSelections`
  - `phase`
  - `match` completion state
  - `nextInningsDefaults`

Reusable idea for update/delete:
- Keep using the same response shape.
- This lets the frontend patch the active scoring query without requiring a blocking full refetch.

## 4. Frontend now patches scorer state instead of replacing it

Changes:
- Delivery mutations use `patchScoringSetupWithMutationResult(...)`.
- Start/close innings mutations still use the full scoring setup response.
- The scorer cache is updated by merging the mutation payload into existing query data.

Reusable idea for update/delete:
- Continue returning `ScoringMutationResult`.
- Patch:
  - `currentInnings.deliveries`
  - innings summary entry
  - `entryContext`
  - selection state
  - match completion state

## 5. Session assembly was slimmed where practical

Changes:
- `getMatchScoringSetup` no longer does a redundant extra `getMatchById` read before `getMatchScoringSession`.
- Scoring session assembly now uses a slimmer match query and match snapshots for rules instead of the match-format lookup chain.

Reusable idea for update/delete:
- Avoid pulling full session data unless it is strictly needed for the fallback replay path.

## Instrumentation added

The append path now logs timing data for:
- compact context load
- write/update transaction
- auto-close step
- response assembly
- total mutation time
- payload size

This is useful for validating any future optimization on update/delete.

## Patterns worth reusing in `updateScoringDelivery`

Use these in order:

1. Keep `ScoringMutationResult` as the response contract.
2. Reuse compact context loading where possible instead of full session loading.
3. Short term:
   - keep replay for correctness
   - still return the smaller mutation result
4. Medium term:
   - compute delivery delta between old and new values
   - update innings counters incrementally
   - update only affected player stats
5. Only resequence if the edit actually changes ordering-sensitive fields.

## Patterns worth reusing in `deleteScoringDelivery`

Use these in order:

1. Keep `ScoringMutationResult` as the response contract.
2. Short term:
   - keep replay after delete for correctness
   - map replay output into the smaller mutation result
3. Medium term:
   - subtract deleted delivery effects from innings counters
   - decrement only affected player stats
   - resequence only the suffix after the deleted delivery

## Current limitations

- `recordScoringDelivery` is the optimized path.
- `updateScoringDelivery` and `deleteScoringDelivery` still use replay-based rewrite logic.
- Router-level auth still performs its own match lookup before calling the service.

## Good next steps

1. Extract a shared helper for rewrite-based mutations that:
   - runs replay
   - returns `ScoringMutationResult`
2. Add delta calculators for:
   - old delivery vs updated delivery
   - deleted delivery removal
3. Optimize resequencing to only touch the affected suffix.
4. Measure:
   - context load time
   - replay time
   - response assembly time
   before and after each change

## Key code locations

- `apps/server/src/services/scoring.service.ts`
  - `ScoringMutationResult`
  - `getScoringDeliveryContext`
  - `applyDeliveryToStats`
  - `recordScoringDelivery`
  - `buildScoringMutationResultFromSession`
- `apps/server/src/routers/scoring.router.ts`
  - delivery mutation handlers and timing logs
- `apps/web/src/routes/matches/$matchId/-score-mutation-utils.ts`
  - scorer cache patching
- `apps/web/src/routes/matches/$matchId/score.tsx`
  - split handling for full-session vs patch-style mutation responses
