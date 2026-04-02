import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Calendar,
  Check,
  Pencil,
  Play,
  RefreshCcw,
  Trophy,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { formatMonthDay, formatMonthDayYear } from "@/lib/date";
import { cn } from "@/lib/utils";
import { client, orpc } from "@/utils/orpc";

type PageTab = "fixtures" | "overview" | "points";
type FixtureStatusFilter = "all" | "live" | "past" | "upcoming";
type ParticipantMode = "concrete" | "source";

const STATUS_FILTERS: FixtureStatusFilter[] = [
  "all",
  "live",
  "upcoming",
  "past",
];

type TournamentFixtureMatch = Awaited<
  ReturnType<typeof client.tournamentFixtures>
>[number];

export const Route = createFileRoute("/tournaments/$tournamentId/")({
  component: TournamentDetailPage,
});

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: page composes role-aware data queries, filters, and mutation handlers for the fixture workspace.
function TournamentDetailPage() {
  const { tournamentId } = Route.useParams();
  const numericTournamentId = Number(tournamentId);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: session } = authClient.useSession();
  const isAdmin =
    (session?.user as { role?: string } | undefined)?.role === "admin";

  const [activeTab, setActiveTab] = useState<PageTab>("overview");
  const [statusFilter, setStatusFilter] = useState<FixtureStatusFilter>("all");
  const [selectedDraftMatches, setSelectedDraftMatches] = useState<Set<number>>(
    new Set()
  );
  const [participantMode, setParticipantMode] =
    useState<ParticipantMode>("concrete");
  const [team1Id, setTeam1Id] = useState("");
  const [team2Id, setTeam2Id] = useState("");
  const [source1Type, setSource1Type] = useState<"match" | "position" | "team">(
    "position"
  );
  const [source2Type, setSource2Type] = useState<"match" | "position" | "team">(
    "position"
  );
  const [source1MatchId, setSource1MatchId] = useState("");
  const [source2MatchId, setSource2MatchId] = useState("");
  const [source1Position, setSource1Position] = useState("");
  const [source2Position, setSource2Position] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState<null | number>(null);

  const { data: tournamentView, isLoading: isLoadingTournament } = useQuery(
    orpc.tournamentView.queryOptions({
      input: {
        tournamentId: numericTournamentId,
      },
    })
  );

  const stageOptions = tournamentView?.stages ?? [];
  const [selectedStageId, setSelectedStageId] = useState<null | number>(null);
  const effectiveStageId = selectedStageId ?? stageOptions[0]?.id ?? null;

  const { data: fixtureRows = [], isLoading: isLoadingFixtures } = useQuery(
    orpc.tournamentFixtures.queryOptions({
      input: {
        tournamentId: numericTournamentId,
        stageId: effectiveStageId ?? undefined,
        includeDraft: isAdmin,
        status: statusFilter,
      },
    })
  );

  const { data: standingsData, isLoading: isLoadingStandings } = useQuery(
    orpc.tournamentStandings.queryOptions({
      input: {
        tournamentId: numericTournamentId,
        stageId: effectiveStageId ?? undefined,
        stageGroupId: selectedGroupId ?? undefined,
        includeDraft: false,
      },
    })
  );

  const selectedStage = useMemo(
    () => stageOptions.find((stage) => stage.id === effectiveStageId) ?? null,
    [stageOptions, effectiveStageId]
  );

  const teamsForTournament =
    tournamentView?.teams
      ?.map((entry) => entry.team)
      .filter((team): team is NonNullable<typeof team> => Boolean(team)) ?? [];

  const draftFixtures = fixtureRows.filter(
    (match) => match.fixtureStatus === "draft"
  );
  const publishedFixtures = fixtureRows.filter(
    (match) => match.fixtureStatus === "published"
  );
  const areAllDraftFixturesSelected =
    draftFixtures.length > 0 &&
    draftFixtures.every((match) => selectedDraftMatches.has(match.id));

  const autoGenerateMutation = useMutation({
    mutationFn: async () =>
      client.autoGenerateFixtures({
        tournamentId: numericTournamentId,
        scope: "stage",
        stageId: effectiveStageId ?? 0,
        stageGroupId: selectedGroupId ?? undefined,
        assignSchedule: true,
        respectExistingDrafts: true,
      }),
    onSuccess: async () => {
      toast.success("Fixtures auto-generated");
      await invalidateTournamentQueries(queryClient, numericTournamentId);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to auto-generate fixtures");
    },
  });

  const createDraftMutation = useMutation({
    mutationFn: async () => {
      if (!effectiveStageId) {
        throw new Error("Select a stage");
      }

      if (participantMode === "concrete") {
        return await client.createDraftFixtureMatch({
          tournamentId: numericTournamentId,
          stageId: effectiveStageId,
          stageGroupId: selectedGroupId ?? undefined,
          participantMode: "concrete",
          team1Id: Number.parseInt(team1Id, 10),
          team2Id: Number.parseInt(team2Id, 10),
          notes: notes.trim() || undefined,
        });
      }

      return await client.createDraftFixtureMatch({
        tournamentId: numericTournamentId,
        stageId: effectiveStageId,
        stageGroupId: selectedGroupId ?? undefined,
        participantMode: "source",
        notes: notes.trim() || undefined,
        participantSources: [
          {
            teamSlot: 1,
            sourceType: source1Type,
            sourceMatchId:
              source1Type === "match"
                ? Number.parseInt(source1MatchId, 10)
                : undefined,
            sourcePosition:
              source1Type === "position"
                ? Number.parseInt(source1Position, 10)
                : undefined,
          },
          {
            teamSlot: 2,
            sourceType: source2Type,
            sourceMatchId:
              source2Type === "match"
                ? Number.parseInt(source2MatchId, 10)
                : undefined,
            sourcePosition:
              source2Type === "position"
                ? Number.parseInt(source2Position, 10)
                : undefined,
          },
        ],
      });
    },
    onSuccess: async () => {
      toast.success("Draft fixture created");
      setTeam1Id("");
      setTeam2Id("");
      setSource1MatchId("");
      setSource2MatchId("");
      setSource1Position("");
      setSource2Position("");
      setNotes("");
      await invalidateTournamentQueries(queryClient, numericTournamentId);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create draft fixture");
    },
  });

  const publishMutation = useMutation({
    mutationFn: async () =>
      client.publishFixtureMatches({
        tournamentId: numericTournamentId,
        matchIds: Array.from(selectedDraftMatches),
      }),
    onSuccess: async () => {
      toast.success("Selected fixtures published");
      setSelectedDraftMatches(new Set());
      await invalidateTournamentQueries(queryClient, numericTournamentId);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to publish fixtures");
    },
  });

  const deleteDraftMutation = useMutation({
    mutationFn: async (matchId: number) =>
      client.deleteDraftFixtureMatch({
        tournamentId: numericTournamentId,
        matchId,
      }),
    onSuccess: async () => {
      toast.success("Draft fixture deleted");
      await invalidateTournamentQueries(queryClient, numericTournamentId);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete draft fixture");
    },
  });

  const deleteSelectedDraftMutation = useMutation({
    mutationFn: async () => {
      const selectedMatchIds = Array.from(selectedDraftMatches);
      await Promise.all(
        selectedMatchIds.map(async (matchId) =>
          client.deleteDraftFixtureMatch({
            tournamentId: numericTournamentId,
            matchId,
          })
        )
      );
    },
    onSuccess: async () => {
      toast.success("Selected draft fixtures deleted");
      setSelectedDraftMatches(new Set());
      await invalidateTournamentQueries(queryClient, numericTournamentId);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete selected draft fixtures");
    },
  });

  if (isLoadingTournament) {
    return (
      <PageShell className="hero-surface" maxWidth="wide">
        <p className="text-muted-foreground">Loading tournament...</p>
      </PageShell>
    );
  }

  if (!tournamentView) {
    return (
      <PageShell className="hero-surface" maxWidth="wide">
        <p className="text-muted-foreground">Tournament not found.</p>
      </PageShell>
    );
  }

  const currentStageGroups = selectedStage?.groups ?? [];
  const canShowPoints = selectedStage
    ? selectedStage.stageType !== "knockout" &&
      selectedStage.stageType !== "playoff"
    : false;
  const handleScheduleUpdated = async () => {
    await invalidateTournamentQueries(queryClient, numericTournamentId);
  };

  return (
    <PageShell
      className="hero-surface"
      contentClassName="space-y-10"
      maxWidth="wide"
    >
      {/* ── HEADER ── */}
      <section className="animate-stagger-1 space-y-6">
        <Link
          className="inline-flex items-center gap-1.5 text-[0.68rem] text-muted-foreground uppercase tracking-[0.28em] transition-colors hover:text-foreground"
          to="/tournaments"
        >
          <ArrowLeft className="size-3.5" />
          Tournaments
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <h1 className="font-serif text-[clamp(2rem,5vw,3.5rem)] leading-[1.05] tracking-tight">
              {tournamentView.tournament.name}
            </h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.8rem] text-muted-foreground">
              <span className="border border-foreground/15 bg-background/60 px-2.5 py-0.5 text-[0.68rem] uppercase tracking-[0.2em]">
                {tournamentView.tournament.type}
              </span>
              <span>
                {formatMonthDayYear(tournamentView.tournament.startDate)} —{" "}
                {formatMonthDayYear(tournamentView.tournament.endDate)}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isAdmin ? (
              <Link
                params={{ tournamentId: String(numericTournamentId) }}
                to="/tournaments/$tournamentId/edit"
              >
                <Button size="sm" variant="outline">
                  <Pencil className="mr-1 size-4" />
                  Edit
                </Button>
              </Link>
            ) : null}
          </div>
        </div>

        {/* Tabs */}
        <nav className="flex gap-1 border-foreground/10 border-b pb-px">
          {(["overview", "fixtures", "points"] as const).map((tab) => (
            <button
              className={cn(
                "relative px-4 py-2.5 font-medium text-[0.78rem] uppercase tracking-[0.12em] transition-colors",
                activeTab === tab
                  ? "text-foreground after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
              key={tab}
              onClick={() => setActiveTab(tab)}
              type="button"
            >
              {tab === "points" ? "Points Table" : tab}
            </button>
          ))}
        </nav>
      </section>

      {/* ── STAGE SELECTOR ── */}
      <section className="animate-stagger-2 space-y-3">
        <p className="text-[0.68rem] text-muted-foreground uppercase tracking-[0.28em]">
          Stage
        </p>
        <div className="flex flex-wrap gap-2">
          {stageOptions.map((stage) => (
            <button
              className={cn(
                "border px-4 py-2 text-sm transition-colors",
                effectiveStageId === stage.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-foreground/10 bg-background/55 text-muted-foreground hover:border-foreground/20 hover:text-foreground"
              )}
              key={stage.id}
              onClick={() => {
                setSelectedStageId(stage.id);
                setSelectedGroupId(null);
              }}
              type="button"
            >
              {stage.sequence}. {stage.name}
            </button>
          ))}
        </div>
      </section>

      {/* ── OVERVIEW TAB ── */}
      {activeTab === "overview" && (
        <div className="animate-stagger-3 space-y-10">
          {/* Match Overview */}
          <section className="space-y-5">
            <h2 className="font-semibold text-xl tracking-tight">Fixtures</h2>

            <div className="flex flex-wrap gap-2">
              {STATUS_FILTERS.map((filter) => (
                <button
                  className={cn(
                    "border px-3 py-1.5 text-xs uppercase tracking-[0.12em] transition-colors",
                    statusFilter === filter
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-foreground/10 text-muted-foreground hover:border-foreground/20 hover:text-foreground"
                  )}
                  key={filter}
                  onClick={() => setStatusFilter(filter)}
                  type="button"
                >
                  {filter}
                </button>
              ))}
            </div>

            {isLoadingFixtures ? (
              <p className="text-muted-foreground text-sm">
                Loading fixtures...
              </p>
            ) : null}
            {!isLoadingFixtures && publishedFixtures.length === 0 ? (
              <div className="border border-foreground/15 border-dashed bg-background/70 px-5 py-6 text-muted-foreground text-sm">
                No matches to show.
              </div>
            ) : null}
            {!isLoadingFixtures && publishedFixtures.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {publishedFixtures.map((match) => (
                  <FixtureCard
                    enableScheduleActions={isAdmin}
                    enableScoringActions={true}
                    key={match.id}
                    match={match}
                    onScheduleUpdated={handleScheduleUpdated}
                    onStartScoring={(matchId) =>
                      navigate({
                        to: "/matches/$matchId/score",
                        params: { matchId: String(matchId) },
                      })
                    }
                    showDraftControls={false}
                  />
                ))}
              </div>
            ) : null}
          </section>

          {/* Teams */}
          <section className="space-y-5">
            <h2 className="font-semibold text-xl tracking-tight">Teams</h2>

            {teamsForTournament.length === 0 ? (
              <div className="border border-foreground/15 border-dashed bg-background/70 px-5 py-6 text-muted-foreground text-sm">
                No teams added yet.
              </div>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {teamsForTournament.map((team) => (
                  <div
                    className="flex items-center justify-between gap-3 border border-foreground/10 bg-background/55 px-4 py-3 transition-colors hover:border-foreground/20"
                    key={team.id}
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-sm">
                        {team.name || `Team #${String(team.id)}`}
                      </p>
                      <p className="text-[0.72rem] text-muted-foreground">
                        {team.shortName || `Team #${String(team.id)}`}
                      </p>
                    </div>

                    {isAdmin ? (
                      <Link
                        params={{ teamId: String(team.id) }}
                        search={{
                          tournamentId: String(numericTournamentId),
                        }}
                        to="/teams/$teamId/assign-players"
                      >
                        <Button size="sm" variant="outline">
                          Modify lineup
                        </Button>
                      </Link>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* ── FIXTURES TAB ── */}
      {activeTab === "fixtures" && (
        <div className="animate-stagger-3 space-y-10">
          {isAdmin ? (
            <section className="space-y-5 border border-foreground/10 bg-[color-mix(in_oklab,var(--color-card)_90%,var(--color-primary)_10%)] p-5 sm:p-6">
              <div className="space-y-1">
                <p className="text-[0.68rem] text-muted-foreground uppercase tracking-[0.28em]">
                  Admin
                </p>
                <h2 className="font-sans font-semibold text-xl tracking-tight">
                  Fixture Builder
                </h2>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  disabled={!effectiveStageId || autoGenerateMutation.isPending}
                  onClick={() => autoGenerateMutation.mutate()}
                  size="sm"
                >
                  <RefreshCcw className="mr-1 size-4" />
                  Auto-create Fixtures
                </Button>
                {selectedStage?.stageType === "swiss" && (
                  <Button
                    disabled={!effectiveStageId}
                    onClick={async () => {
                      if (!effectiveStageId) {
                        return;
                      }
                      try {
                        await client.autoGenerateNextSwissRound({
                          tournamentId: numericTournamentId,
                          stageId: effectiveStageId,
                        });
                        toast.success("Next Swiss round generated");
                        await invalidateTournamentQueries(
                          queryClient,
                          numericTournamentId
                        );
                      } catch (error) {
                        const message =
                          error instanceof Error
                            ? error.message
                            : "Failed to generate Swiss round";
                        toast.error(message);
                      }
                    }}
                    size="sm"
                    variant="outline"
                  >
                    Generate Next Swiss Round
                  </Button>
                )}
              </div>

              {currentStageGroups.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <button
                    className={cn(
                      "border px-3 py-1.5 text-xs uppercase tracking-[0.12em] transition-colors",
                      selectedGroupId === null
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-foreground/10 text-muted-foreground hover:text-foreground"
                    )}
                    onClick={() => setSelectedGroupId(null)}
                    type="button"
                  >
                    All Groups
                  </button>
                  {currentStageGroups.map((group) => (
                    <button
                      className={cn(
                        "border px-3 py-1.5 text-xs uppercase tracking-[0.12em] transition-colors",
                        selectedGroupId === group.id
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-foreground/10 text-muted-foreground hover:text-foreground"
                      )}
                      key={group.id}
                      onClick={() => setSelectedGroupId(group.id)}
                      type="button"
                    >
                      {group.name}
                    </button>
                  ))}
                </div>
              )}

              <div className="grid gap-3 md:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-sm">Participant mode</span>
                  <select
                    className="h-8 w-full rounded-none border border-input bg-transparent px-2 text-xs"
                    onChange={(event) =>
                      setParticipantMode(event.target.value as ParticipantMode)
                    }
                    value={participantMode}
                  >
                    <option value="concrete">Concrete Teams</option>
                    <option value="source">TBD by Source</option>
                  </select>
                </label>

                <label className="space-y-1" htmlFor="fixture-notes">
                  <span className="text-sm">Notes</span>
                  <Input
                    id="fixture-notes"
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="Optional notes"
                    value={notes}
                  />
                </label>

                {participantMode === "concrete" ? (
                  <>
                    <label className="space-y-1">
                      <span className="text-sm">Team 1</span>
                      <select
                        className="h-8 w-full rounded-none border border-input bg-transparent px-2 text-xs"
                        onChange={(event) => setTeam1Id(event.target.value)}
                        value={team1Id}
                      >
                        <option value="">Select team</option>
                        {teamsForTournament.map((team) => (
                          <option key={team.id} value={String(team.id)}>
                            {team.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="space-y-1">
                      <span className="text-sm">Team 2</span>
                      <select
                        className="h-8 w-full rounded-none border border-input bg-transparent px-2 text-xs"
                        onChange={(event) => setTeam2Id(event.target.value)}
                        value={team2Id}
                      >
                        <option value="">Select team</option>
                        {teamsForTournament.map((team) => (
                          <option key={team.id} value={String(team.id)}>
                            {team.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  </>
                ) : (
                  <>
                    <SourceField
                      label="Team Slot 1 Source"
                      matchId={source1MatchId}
                      onMatchIdChange={setSource1MatchId}
                      onPositionChange={setSource1Position}
                      onTypeChange={setSource1Type}
                      position={source1Position}
                      sourceType={source1Type}
                    />
                    <SourceField
                      label="Team Slot 2 Source"
                      matchId={source2MatchId}
                      onMatchIdChange={setSource2MatchId}
                      onPositionChange={setSource2Position}
                      onTypeChange={setSource2Type}
                      position={source2Position}
                      sourceType={source2Type}
                    />
                  </>
                )}
              </div>

              <Button
                disabled={createDraftMutation.isPending || !effectiveStageId}
                onClick={() => createDraftMutation.mutate()}
                size="sm"
              >
                Add Match Draft
              </Button>
            </section>
          ) : null}

          <div className="grid gap-10 lg:grid-cols-2">
            {isAdmin && (
              <section className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="font-sans font-semibold text-lg tracking-tight">
                    Drafts
                  </h3>
                  <div className="flex items-center gap-2">
                    <Button
                      disabled={draftFixtures.length === 0}
                      onClick={() => {
                        if (areAllDraftFixturesSelected) {
                          setSelectedDraftMatches(new Set());
                          return;
                        }
                        setSelectedDraftMatches(
                          new Set(draftFixtures.map((match) => match.id))
                        );
                      }}
                      size="sm"
                      variant="outline"
                    >
                      {areAllDraftFixturesSelected
                        ? "Clear Selection"
                        : "Select All"}
                    </Button>
                    <Button
                      disabled={
                        publishMutation.isPending ||
                        selectedDraftMatches.size === 0
                      }
                      onClick={() => publishMutation.mutate()}
                      size="sm"
                    >
                      <Check className="mr-1 size-4" />
                      Publish Selected
                    </Button>
                    <Button
                      disabled={
                        deleteSelectedDraftMutation.isPending ||
                        selectedDraftMatches.size === 0
                      }
                      onClick={() => deleteSelectedDraftMutation.mutate()}
                      size="sm"
                      variant="destructive"
                    >
                      Delete Selected
                    </Button>
                  </div>
                </div>

                {draftFixtures.length === 0 ? (
                  <div className="border border-foreground/15 border-dashed bg-background/70 px-5 py-6 text-muted-foreground text-sm">
                    No draft fixtures yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {draftFixtures.map((match) => (
                      <FixtureCard
                        key={match.id}
                        match={match}
                        onDelete={() => deleteDraftMutation.mutate(match.id)}
                        onToggleSelect={() => {
                          setSelectedDraftMatches((previous) => {
                            const next = new Set(previous);
                            if (next.has(match.id)) {
                              next.delete(match.id);
                            } else {
                              next.add(match.id);
                            }
                            return next;
                          });
                        }}
                        selected={selectedDraftMatches.has(match.id)}
                        showDraftControls={true}
                      />
                    ))}
                  </div>
                )}
              </section>
            )}

            <section className="space-y-4">
              <h3 className="font-sans font-semibold text-lg tracking-tight">
                Published
              </h3>

              {publishedFixtures.length === 0 ? (
                <div className="border border-foreground/15 border-dashed bg-background/70 px-5 py-6 text-muted-foreground text-sm">
                  No published fixtures yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {publishedFixtures.map((match) => (
                    <FixtureCard
                      enableScheduleActions={isAdmin}
                      key={match.id}
                      match={match}
                      onScheduleUpdated={handleScheduleUpdated}
                      showDraftControls={false}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      )}

      {/* ── POINTS TAB ── */}
      {activeTab === "points" && (
        <section className="animate-stagger-3 space-y-5">
          <h2 className="font-semibold text-xl tracking-tight">Points Table</h2>

          {canShowPoints ? (
            <>
              {currentStageGroups.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <button
                    className={cn(
                      "border px-3 py-1.5 text-xs uppercase tracking-[0.12em] transition-colors",
                      selectedGroupId === null
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-foreground/10 text-muted-foreground hover:text-foreground"
                    )}
                    onClick={() => setSelectedGroupId(null)}
                    type="button"
                  >
                    All Groups
                  </button>
                  {currentStageGroups.map((group) => (
                    <button
                      className={cn(
                        "border px-3 py-1.5 text-xs uppercase tracking-[0.12em] transition-colors",
                        selectedGroupId === group.id
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-foreground/10 text-muted-foreground hover:text-foreground"
                      )}
                      key={group.id}
                      onClick={() => setSelectedGroupId(group.id)}
                      type="button"
                    >
                      {group.name}
                    </button>
                  ))}
                </div>
              )}

              {isLoadingStandings ? (
                <p className="text-muted-foreground text-sm">
                  Loading points table...
                </p>
              ) : (
                <div className="overflow-x-auto border border-foreground/10">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-foreground/10 border-b bg-[color-mix(in_oklab,var(--color-card)_90%,var(--color-primary)_10%)]">
                        <th className="px-3 py-2.5 text-left font-medium text-[0.68rem] text-muted-foreground uppercase tracking-[0.2em]">
                          #
                        </th>
                        <th className="px-3 py-2.5 text-left font-medium text-[0.68rem] text-muted-foreground uppercase tracking-[0.2em]">
                          Team
                        </th>
                        <th className="px-3 py-2.5 text-right font-medium text-[0.68rem] text-muted-foreground uppercase tracking-[0.2em]">
                          P
                        </th>
                        <th className="px-3 py-2.5 text-right font-medium text-[0.68rem] text-muted-foreground uppercase tracking-[0.2em]">
                          W
                        </th>
                        <th className="px-3 py-2.5 text-right font-medium text-[0.68rem] text-muted-foreground uppercase tracking-[0.2em]">
                          L
                        </th>
                        <th className="px-3 py-2.5 text-right font-medium text-[0.68rem] text-muted-foreground uppercase tracking-[0.2em]">
                          T
                        </th>
                        <th className="px-3 py-2.5 text-right font-medium text-[0.68rem] text-muted-foreground uppercase tracking-[0.2em]">
                          D
                        </th>
                        <th className="px-3 py-2.5 text-right font-medium text-[0.68rem] text-muted-foreground uppercase tracking-[0.2em]">
                          NR
                        </th>
                        <th className="px-3 py-2.5 text-right font-medium text-[0.68rem] text-muted-foreground uppercase tracking-[0.2em]">
                          Pts
                        </th>
                        <th className="px-3 py-2.5 text-right font-medium text-[0.68rem] text-muted-foreground uppercase tracking-[0.2em]">
                          NRR
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {standingsData?.rows.length ? (
                        standingsData.rows.map((row) => (
                          <tr
                            className="border-foreground/5 border-b transition-colors hover:bg-foreground/2"
                            key={row.teamId}
                          >
                            <td className="px-3 py-2.5 font-semibold text-muted-foreground">
                              {row.rank}
                            </td>
                            <td className="px-3 py-2.5 font-semibold">
                              {row.teamName}
                            </td>
                            <td className="px-3 py-2.5 text-right">
                              {row.played}
                            </td>
                            <td className="px-3 py-2.5 text-right font-semibold text-primary">
                              {row.won}
                            </td>
                            <td className="px-3 py-2.5 text-right">
                              {row.lost}
                            </td>
                            <td className="px-3 py-2.5 text-right">
                              {row.tied}
                            </td>
                            <td className="px-3 py-2.5 text-right">
                              {row.drawn}
                            </td>
                            <td className="px-3 py-2.5 text-right">
                              {row.abandoned}
                            </td>
                            <td className="px-3 py-2.5 text-right font-bold">
                              {row.points}
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono text-xs">
                              {row.netRunRate.toFixed(2)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            className="px-3 py-6 text-muted-foreground"
                            colSpan={10}
                          >
                            No standings yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : (
            <div className="border border-foreground/15 border-dashed bg-background/70 px-5 py-6 text-muted-foreground text-sm">
              Points table isn't available for this stage type.
            </div>
          )}
        </section>
      )}
    </PageShell>
  );
}

function SourceField(props: {
  label: string;
  matchId: string;
  onMatchIdChange: (value: string) => void;
  onPositionChange: (value: string) => void;
  onTypeChange: (value: "match" | "position" | "team") => void;
  position: string;
  sourceType: "match" | "position" | "team";
}) {
  return (
    <div className="space-y-2 border p-2">
      <p className="font-medium text-xs">{props.label}</p>
      <select
        className="h-8 w-full rounded-none border border-input bg-transparent px-2 text-xs"
        onChange={(event) =>
          props.onTypeChange(
            event.target.value as "match" | "position" | "team"
          )
        }
        value={props.sourceType}
      >
        <option value="position">Position Source</option>
        <option value="match">Match Winner Source</option>
        <option value="team">Team Source</option>
      </select>
      {props.sourceType === "match" && (
        <Input
          onChange={(event) => props.onMatchIdChange(event.target.value)}
          placeholder="Source match ID"
          type="number"
          value={props.matchId}
        />
      )}
      {props.sourceType === "position" && (
        <Input
          onChange={(event) => props.onPositionChange(event.target.value)}
          placeholder="Group position (e.g. 1)"
          type="number"
          value={props.position}
        />
      )}
    </div>
  );
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: The fixture card intentionally keeps its status, scoring, and admin actions together.
function FixtureCard(props: {
  enableScheduleActions?: boolean;
  enableScoringActions?: boolean;
  match: TournamentFixtureMatch;
  onDelete?: () => void;
  onScheduleUpdated?: () => Promise<void> | void;
  onStartScoring?: (matchId: number) => void;
  onToggleSelect?: () => void;
  selected?: boolean;
  showDraftControls: boolean;
}) {
  const match = props.match;
  const team1Label = match.team1?.shortName ?? "TBD";
  const team2Label = match.team2?.shortName ?? "TBD";
  const matchStartAt = match.scheduledStartAt ?? match.matchDate;
  const canCurrentUserScore = match.canCurrentUserScore ?? false;
  const canShowScheduleEdit =
    props.enableScheduleActions &&
    match.fixtureStatus === "published" &&
    !match.isCompleted;
  const canShowStartScoring =
    props.enableScoringActions &&
    match.fixtureStatus === "published" &&
    !match.isLive &&
    isDateInLocalToday(matchStartAt) &&
    canCurrentUserScore;
  const canShowResumeScoring =
    props.enableScoringActions &&
    match.fixtureStatus === "published" &&
    Boolean(match.isLive) &&
    canCurrentUserScore;

  return (
    <div
      className={cn(
        "group border border-foreground/10 bg-background/55 p-4 transition-colors hover:border-foreground/20",
        props.showDraftControls &&
          props.selected &&
          "border-primary/40 bg-primary/4"
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          {props.showDraftControls ? (
            <Checkbox
              checked={props.selected ?? false}
              onCheckedChange={() => props.onToggleSelect?.()}
            />
          ) : null}
          <span className="font-semibold text-sm">
            {team1Label} <span className="mx-1 text-muted-foreground">vs</span>{" "}
            {team2Label}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {match.fixtureStatus === "draft" ? (
            <span className="border border-foreground/15 px-2 py-0.5 text-[0.66rem] text-muted-foreground uppercase tracking-[0.16em]">
              draft
            </span>
          ) : null}
          {match.isLive ? (
            <span className="flex items-center gap-1.5 font-semibold text-[0.66rem] text-primary uppercase tracking-[0.16em]">
              <span className="size-1.5 animate-pulse rounded-full bg-primary" />
              Live
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-2 flex items-center gap-3 text-[0.75rem] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Calendar className="size-3" />
          {formatMonthDay(match.scheduledStartAt ?? match.matchDate)}
        </span>
        <span>
          {match.stage?.name ?? "\u2014"}
          {match.stageGroup ? ` \u00b7 ${match.stageGroup.name}` : ""}
        </span>
      </div>

      {props.showDraftControls && (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button onClick={props.onDelete} size="sm" variant="destructive">
            Delete
          </Button>
        </div>
      )}

      {match.fixtureStatus === "published" ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {canShowStartScoring ? (
            <Button onClick={() => props.onStartScoring?.(match.id)} size="sm">
              <Play className="mr-1 size-4" />
              Start Scoring
            </Button>
          ) : null}

          {canShowResumeScoring ? (
            <Link
              params={{ matchId: String(match.id) }}
              to="/matches/$matchId/score"
            >
              <Button size="sm" variant="default">
                <Play className="mr-1 size-4" />
                Resume Scoring
              </Button>
            </Link>
          ) : null}

          {canShowScheduleEdit ? (
            <PublishedFixtureScheduleControl
              match={match}
              onScheduleUpdated={props.onScheduleUpdated}
            />
          ) : null}

          <Link
            params={{ matchId: String(match.id) }}
            to="/matches/$matchId/scorecard"
          >
            <Button size="sm" variant="outline">
              <Trophy className="mr-1 size-4" />
              Scorecard
            </Button>
          </Link>
        </div>
      ) : null}
    </div>
  );
}

function PublishedFixtureScheduleControl(props: {
  match: TournamentFixtureMatch;
  onScheduleUpdated?: () => Promise<void> | void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [scheduledStartValue, setScheduledStartValue] = useState("");
  const [scheduledEndValue, setScheduledEndValue] = useState("");

  const updateScheduleMutation = useMutation({
    mutationFn: () => {
      const scheduledStartAt = parseDateTimeLocalInput(scheduledStartValue);
      if (!scheduledStartAt) {
        throw new Error("Select a valid scheduled start time");
      }

      const scheduledEndAt = parseDateTimeLocalInput(scheduledEndValue);

      return client.updateMatchSchedule({
        matchId: props.match.id,
        scheduledEndAt: scheduledEndAt ?? undefined,
        scheduledStartAt,
      });
    },
    onSuccess: async () => {
      toast.success("Match schedule updated");
      setIsOpen(false);
      await props.onScheduleUpdated?.();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update match schedule");
    },
  });

  const openScheduleDialog = () => {
    setScheduledStartValue(
      formatDateTimeLocalInput(
        props.match.scheduledStartAt ?? props.match.matchDate
      )
    );
    setScheduledEndValue(formatDateTimeLocalInput(props.match.scheduledEndAt));
    setIsOpen(true);
  };

  const handleScheduledStartChange = (nextStartValue: string) => {
    setScheduledStartValue(nextStartValue);
    setScheduledEndValue((currentEndValue) =>
      getShiftedEndDateTimeLocalValue({
        currentEndValue,
        nextStartValue,
        previousStartValue: scheduledStartValue,
      })
    );
  };

  return (
    <>
      <Button
        onClick={openScheduleDialog}
        size="sm"
        type="button"
        variant="outline"
      >
        <Calendar className="size-4" />
        Reschedule
      </Button>

      <Dialog
        onOpenChange={(open) => {
          if (!(open || updateScheduleMutation.isPending)) {
            setIsOpen(false);
          }
        }}
        open={isOpen}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reschedule match</DialogTitle>
            <DialogDescription>
              Set a new start time. End time is optional.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3">
            <label
              className="space-y-1"
              htmlFor={`scheduled-start-${String(props.match.id)}`}
            >
              <span className="text-sm">Start time</span>
              <Input
                id={`scheduled-start-${String(props.match.id)}`}
                onChange={(event) =>
                  handleScheduledStartChange(event.target.value)
                }
                required
                type="datetime-local"
                value={scheduledStartValue}
              />
            </label>

            <label
              className="space-y-1"
              htmlFor={`scheduled-end-${String(props.match.id)}`}
            >
              <span className="text-sm">End time</span>
              <Input
                id={`scheduled-end-${String(props.match.id)}`}
                onChange={(event) => setScheduledEndValue(event.target.value)}
                type="datetime-local"
                value={scheduledEndValue}
              />
            </label>
          </div>

          <DialogFooter>
            <Button
              disabled={updateScheduleMutation.isPending}
              onClick={() => setIsOpen(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={updateScheduleMutation.isPending}
              onClick={() => updateScheduleMutation.mutate()}
              type="button"
            >
              {updateScheduleMutation.isPending ? "Saving..." : "Save schedule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function formatDateTimeLocalInput(date: Date | null | undefined) {
  if (!date) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${String(year)}-${month}-${day}T${hours}:${minutes}`;
}

function parseDateTimeLocalInput(value: string) {
  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return null;
  }

  const parsedDate = new Date(trimmedValue);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}

function getShiftedEndDateTimeLocalValue(params: {
  currentEndValue: string;
  nextStartValue: string;
  previousStartValue: string;
}) {
  if (!params.currentEndValue) {
    return params.currentEndValue;
  }

  const previousStartAt = parseDateTimeLocalInput(params.previousStartValue);
  const nextStartAt = parseDateTimeLocalInput(params.nextStartValue);
  const currentEndAt = parseDateTimeLocalInput(params.currentEndValue);

  if (!(previousStartAt && nextStartAt && currentEndAt)) {
    return params.currentEndValue;
  }

  const durationMs = currentEndAt.getTime() - previousStartAt.getTime();
  if (durationMs <= 0) {
    return params.currentEndValue;
  }

  return formatDateTimeLocalInput(new Date(nextStartAt.getTime() + durationMs));
}

function isDateInLocalToday(date: Date) {
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

async function invalidateTournamentQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  tournamentId: number
) {
  await Promise.all([
    queryClient.invalidateQueries(
      orpc.tournamentView.queryOptions({
        input: { tournamentId },
      })
    ),
    queryClient.invalidateQueries(
      orpc.tournamentFixtures.queryOptions({
        input: {
          tournamentId,
          includeDraft: true,
          status: "all",
        },
      })
    ),
    queryClient.invalidateQueries(
      orpc.tournamentStandings.queryOptions({
        input: {
          tournamentId,
          includeDraft: false,
        },
      })
    ),
  ]);
}
