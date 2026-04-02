# Tech Debt Priorities

Current cleanliness rating: 7.5/10.

This list is ordered by how much each refactor would improve maintainability, reduce risk, and raise the repo from "good with a few monsters" to genuinely clean.

## What "10/10 clean" means here

- No domain-critical file acts like a hidden subsystem.
- Complex business logic is split by responsibility, not just by helper function count.
- UI routes orchestrate state and composition instead of owning entire workflows.
- Lint suppressions for cognitive complexity are the exception, not the operating model.
- Tests follow module boundaries instead of concentrating around a few oversized files.

## Priority Order

### P0. Split the scoring backend monolith

- [ ] Refactor [apps/server/src/services/scoring.service.ts](../apps/server/src/services/scoring.service.ts) into focused scoring domain modules.

Why this is first:

- It is the single largest cleanliness drag in the repo at 4,212 lines.
- It concentrates validation, orchestration, state sync, and stats mutation in one place.
- It creates the highest regression risk and the worst onboarding cost.

Target shape:

- `scoring/validation/*`
- `scoring/session/*`
- `scoring/deliveries/*`
- `scoring/innings/*`
- `scoring/stats/*`
- `scoring/service.ts` as thin orchestration only

Done when:

- [ ] Delivery validation rules live in their own module tree.
- [ ] Innings state synchronization is extracted from the main service.
- [ ] Session assembly and match context loading are extracted.
- [ ] Stats recalculation and incremental updates are separated.
- [ ] The main scoring service is reduced below 800 lines.
- [ ] Existing complexity suppressions in the scoring service are removed or reduced to one narrowly justified case.
- [ ] Tests are reorganized around extracted modules, not just the top-level service.

Expected score lift: +1.0 to +1.5

### P1. Break the scoring page into route orchestration plus feature components

- [ ] Refactor [apps/web/src/routes/matches/$matchId/score.tsx](../apps/web/src/routes/matches/$matchId/score.tsx) into a route shell plus focused scoring features.

Why this is second:

- At 2,257 lines, the route is acting like an application, not a screen.
- It mixes data fetching, setup flow, scoring actions, and rendering concerns.
- This is where frontend maintainability will keep degrading as scoring evolves.

Target shape:

- `useScoreMatchData`
- `useScoringActions`
- `ScoreSetupPanel`
- `ScoreSessionPanel`
- `ScoreSummaryPanel`
- `ScoreErrorState`

Done when:

- [ ] The route file becomes an orchestration shell under 600 lines.
- [ ] Data querying and mutation setup move into hooks or feature modules.
- [ ] Setup-phase UI and active scoring UI are split into separate components.
- [ ] The route no longer owns long event handlers for every scoring action.
- [ ] UI tests cover the feature modules directly.

Expected score lift: +0.75 to +1.0

### P2. Split tournament planning logic into explicit pipelines

- [ ] Decompose [apps/server/src/services/tournament-fixture-builder.service.ts](../apps/server/src/services/tournament-fixture-builder.service.ts) and [apps/server/src/services/tournament-create.service.ts](../apps/server/src/services/tournament-create.service.ts).

Why this is third:

- These files show the same pattern as scoring: valid domain complexity trapped inside giant service files.
- The logic is business-heavy enough to justify modules, not enough to justify monoliths.

Target shape:

- `tournament-create/validation.ts`
- `tournament-create/template-inference.ts`
- `fixture-builder/brackets.ts`
- `fixture-builder/group-stage.ts`
- `fixture-builder/standings.ts`
- `fixture-builder/persistence.ts`

Done when:

- [ ] Tournament creation validation is isolated from persistence.
- [ ] Structure inference is isolated from entity creation.
- [ ] Fixture generation algorithms are grouped by format or stage type.
- [ ] Standings and tie-break logic are isolated from schedule creation.
- [ ] Both top-level service files are reduced below 700 lines each.

Expected score lift: +0.75

### P3. Replace generic CRUD sprawl with domain command/query modules where behavior diverges

- [ ] Reduce overreliance on [apps/server/src/services/crud.service.ts](../apps/server/src/services/crud.service.ts) and generic registration in [apps/server/src/routes/management.routes.ts](../apps/server/src/routes/management.routes.ts).

Why this matters:

- The abstraction is useful for simple entities, but it starts hiding domain differences once rules become non-trivial.
- Generic CRUD is clean until the tenth exception, then it becomes a polite trap.

Done when:

- [ ] Pure CRUD entities stay generic.
- [ ] Behavior-rich entities get dedicated commands and query services.
- [ ] Error mapping moves closer to domain-specific handlers.
- [ ] Management routes stop being the place where entity nuance gets papered over.

Expected score lift: +0.5

### P4. Attack the other oversized frontend routes before they become permanent architecture

- [ ] Refactor [apps/web/src/routes/tournaments/$tournamentId/index.tsx](../apps/web/src/routes/tournaments/$tournamentId/index.tsx), [apps/web/src/routes/tournaments/-tournament-wizard-form.tsx](../apps/web/src/routes/tournaments/-tournament-wizard-form.tsx), and [apps/web/src/routes/players/index.tsx](../apps/web/src/routes/players/index.tsx).

Why this matters:

- The web app is accumulating feature depth in route files instead of establishing reusable feature boundaries.
- The current structure works, but it scales by making routes denser.

Done when:

- [ ] Each large route has a clear container/presenter split.
- [ ] Tables, filters, and bulk actions are moved into reusable components or hooks.
- [ ] Page-level state machines are named and isolated.
- [ ] No routine route file exceeds 500 to 700 lines without strong justification.

Expected score lift: +0.5

### P5. Turn complexity suppressions into design pressure, not policy

- [ ] Audit and remove `biome-ignore lint/complexity/noExcessiveCognitiveComplexity` suppressions across server and web files.

Why this matters:

- The suppressions are honest, but they also normalize oversized workflows.
- A clean repo treats complexity warnings as refactor prompts, not explanatory labels.

Done when:

- [ ] Every remaining suppression has a short, defensible reason and a small scope.
- [ ] The scoring, tournament, and fixture hotspots lose most of their suppressions because the structure improves.
- [ ] New feature work does not add more complexity suppressions by default.

Expected score lift: +0.5

### P6. Rebalance test coverage around module seams instead of mega-files

- [ ] Expand tests for extracted frontend and backend modules as refactors land.

Why this matters:

- A repo feels cleaner when test boundaries mirror architecture boundaries.
- Right now, some large files are test magnets because they own too much logic.

Done when:

- [ ] Scoring tests target validation, state sync, and stat calculation separately.
- [ ] Tournament generation tests target planners and standings modules separately.
- [ ] Frontend feature tests cover extracted hooks and components instead of only giant route flows.

Expected score lift: +0.25 to +0.5

### P7. Set and enforce file-size and responsibility thresholds

- [ ] Document practical limits for service, route, and component size in repo guidance.

Why this matters:

- This repo does not have a style problem.
- It has a success problem: good code kept growing until a few files became private frameworks.

Done when:

- [ ] Service files over 700 to 800 lines require explicit justification.
- [ ] Route files over 500 to 600 lines trigger decomposition review.
- [ ] New domain logic must name its boundary before joining an existing mega-file.
- [ ] The guideline is added to repo docs or instructions and followed in PR review.

Expected score lift: +0.25

## If You Only Do Three Things

- [ ] Finish P0.
- [ ] Finish P1.
- [ ] Finish P2.

Those three changes remove the largest cleanliness liabilities in both the backend and frontend. Without them, the repo stays in the 7.5 to 8.5 range no matter how polished the rest looks.

## Blunt Summary

The repo does not need a style cleanup. It needs structural weight loss in the few files that are behaving like hidden subsystems. The fastest path from 7.5 to 10 is not more linting, more comments, or more abstraction. It is cutting the biggest domains into real modules with clear ownership.
