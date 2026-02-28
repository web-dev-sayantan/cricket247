import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Calendar, Check, RefreshCcw, Trophy } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { formatWeekdayMonthDayYear } from "@/lib/date";
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

export const Route = createFileRoute("/tournaments/$tournamentId")({
  component: TournamentDetailPage,
});

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: page composes role-aware data queries, filters, and mutation handlers for the fixture workspace.
function TournamentDetailPage() {
  const { tournamentId } = Route.useParams();
  const numericTournamentId = Number(tournamentId);
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
      <div className="min-h-screen px-4 py-8 md:px-8">
        <p className="text-muted-foreground">Loading tournament...</p>
      </div>
    );
  }

  if (!tournamentView) {
    return (
      <div className="min-h-screen px-4 py-8 md:px-8">
        <p className="text-muted-foreground">Tournament not found.</p>
      </div>
    );
  }

  const currentStageGroups = selectedStage?.groups ?? [];
  const canShowPoints = selectedStage
    ? selectedStage.stageType !== "knockout" &&
      selectedStage.stageType !== "playoff"
    : false;

  return (
    <div className="min-h-screen bg-background pb-16">
      <header className="space-y-4 border-b px-4 py-6 md:px-8">
        <Link className="inline-flex items-center text-sm" to="/tournaments">
          <ArrowLeft className="mr-1 size-4" />
          Back to Tournaments
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-bold text-3xl tracking-tight">
              {tournamentView.tournament.name}
            </h1>
            <p className="text-muted-foreground text-sm">
              {tournamentView.tournament.type} •{" "}
              {formatWeekdayMonthDayYear(tournamentView.tournament.startDate)}{" "}
              to {formatWeekdayMonthDayYear(tournamentView.tournament.endDate)}
            </p>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline">
              Published: {tournamentView.counts.publishedMatchCount}
            </Badge>
            <Badge variant="secondary">
              Draft: {tournamentView.counts.draftMatchCount}
            </Badge>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <TabButton
            active={activeTab === "overview"}
            label="Overview"
            onClick={() => setActiveTab("overview")}
          />
          <TabButton
            active={activeTab === "fixtures"}
            label="Fixtures"
            onClick={() => setActiveTab("fixtures")}
          />
          <TabButton
            active={activeTab === "points"}
            label="Points Table"
            onClick={() => setActiveTab("points")}
          />
        </div>
      </header>

      <main className="space-y-6 px-4 py-6 md:px-8">
        <Card>
          <CardHeader>
            <CardTitle>Stage</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {stageOptions.map((stage) => (
              <Button
                key={stage.id}
                onClick={() => {
                  setSelectedStageId(stage.id);
                  setSelectedGroupId(null);
                }}
                size="sm"
                variant={effectiveStageId === stage.id ? "default" : "outline"}
              >
                {stage.sequence}. {stage.name}
              </Button>
            ))}
          </CardContent>
        </Card>

        {activeTab === "overview" && (
          <Card>
            <CardHeader>
              <CardTitle>Match Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {STATUS_FILTERS.map((filter) => (
                  <Button
                    key={filter}
                    onClick={() => setStatusFilter(filter)}
                    size="sm"
                    variant={statusFilter === filter ? "default" : "outline"}
                  >
                    {filter}
                  </Button>
                ))}
              </div>
              {isLoadingFixtures ? (
                <p className="text-muted-foreground text-sm">
                  Loading fixtures...
                </p>
              ) : (
                <div className="space-y-3">
                  {publishedFixtures.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                      No published matches in this view.
                    </p>
                  ) : (
                    publishedFixtures.map((match) => (
                      <FixtureCard
                        key={match.id}
                        match={match}
                        showDraftControls={false}
                      />
                    ))
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === "fixtures" && (
          <div className="space-y-6">
            {isAdmin ? (
              <Card>
                <CardHeader>
                  <CardTitle>Admin Fixture Builder</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      disabled={
                        !effectiveStageId || autoGenerateMutation.isPending
                      }
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
                      <Button
                        onClick={() => setSelectedGroupId(null)}
                        size="sm"
                        variant={
                          selectedGroupId === null ? "default" : "outline"
                        }
                      >
                        All Groups
                      </Button>
                      {currentStageGroups.map((group) => (
                        <Button
                          key={group.id}
                          onClick={() => setSelectedGroupId(group.id)}
                          size="sm"
                          variant={
                            selectedGroupId === group.id ? "default" : "outline"
                          }
                        >
                          {group.name}
                        </Button>
                      ))}
                    </div>
                  )}

                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="space-y-1">
                      <span className="text-sm">Participant mode</span>
                      <select
                        className="h-8 w-full rounded-none border border-input bg-transparent px-2 text-xs"
                        onChange={(event) =>
                          setParticipantMode(
                            event.target.value as ParticipantMode
                          )
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
                    disabled={
                      createDraftMutation.isPending || !effectiveStageId
                    }
                    onClick={() => createDraftMutation.mutate()}
                    size="sm"
                  >
                    Add Match Draft
                  </Button>
                </CardContent>
              </Card>
            ) : null}

            <div className="grid gap-6 lg:grid-cols-2">
              {isAdmin && (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Draft Fixtures</CardTitle>
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
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {draftFixtures.length === 0 ? (
                      <p className="text-muted-foreground text-sm">
                        No draft fixtures yet.
                      </p>
                    ) : (
                      draftFixtures.map((match) => (
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
                      ))
                    )}
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>Published Fixtures</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {publishedFixtures.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                      No published fixtures yet.
                    </p>
                  ) : (
                    publishedFixtures.map((match) => (
                      <FixtureCard
                        key={match.id}
                        match={match}
                        showDraftControls={false}
                      />
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {activeTab === "points" && (
          <Card>
            <CardHeader>
              <CardTitle>Points Table</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {canShowPoints ? (
                <>
                  {currentStageGroups.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        onClick={() => setSelectedGroupId(null)}
                        size="sm"
                        variant={
                          selectedGroupId === null ? "default" : "outline"
                        }
                      >
                        All Groups
                      </Button>
                      {currentStageGroups.map((group) => (
                        <Button
                          key={group.id}
                          onClick={() => setSelectedGroupId(group.id)}
                          size="sm"
                          variant={
                            selectedGroupId === group.id ? "default" : "outline"
                          }
                        >
                          {group.name}
                        </Button>
                      ))}
                    </div>
                  )}

                  {isLoadingStandings ? (
                    <p className="text-muted-foreground text-sm">
                      Loading points table...
                    </p>
                  ) : (
                    <div className="overflow-x-auto border">
                      <table className="w-full text-xs">
                        <thead className="bg-muted/40">
                          <tr>
                            <th className="px-2 py-2 text-left">#</th>
                            <th className="px-2 py-2 text-left">Team</th>
                            <th className="px-2 py-2 text-right">P</th>
                            <th className="px-2 py-2 text-right">W</th>
                            <th className="px-2 py-2 text-right">L</th>
                            <th className="px-2 py-2 text-right">T</th>
                            <th className="px-2 py-2 text-right">D</th>
                            <th className="px-2 py-2 text-right">NR</th>
                            <th className="px-2 py-2 text-right">Pts</th>
                            <th className="px-2 py-2 text-right">NRR</th>
                          </tr>
                        </thead>
                        <tbody>
                          {standingsData?.rows.length ? (
                            standingsData.rows.map((row) => (
                              <tr className="border-t" key={row.teamId}>
                                <td className="px-2 py-2">{row.rank}</td>
                                <td className="px-2 py-2">{row.teamName}</td>
                                <td className="px-2 py-2 text-right">
                                  {row.played}
                                </td>
                                <td className="px-2 py-2 text-right">
                                  {row.won}
                                </td>
                                <td className="px-2 py-2 text-right">
                                  {row.lost}
                                </td>
                                <td className="px-2 py-2 text-right">
                                  {row.tied}
                                </td>
                                <td className="px-2 py-2 text-right">
                                  {row.drawn}
                                </td>
                                <td className="px-2 py-2 text-right">
                                  {row.abandoned}
                                </td>
                                <td className="px-2 py-2 text-right">
                                  {row.points}
                                </td>
                                <td className="px-2 py-2 text-right">
                                  {row.netRunRate.toFixed(2)}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td
                                className="px-2 py-3 text-muted-foreground"
                                colSpan={10}
                              >
                                No standings data available yet.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground text-sm">
                  Points table is not applicable for this stage.
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}

function TabButton(props: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      onClick={props.onClick}
      size="sm"
      variant={props.active ? "default" : "outline"}
    >
      {props.label}
    </Button>
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

function FixtureCard(props: {
  match: Awaited<ReturnType<typeof client.tournamentFixtures>>[number];
  onDelete?: () => void;
  onToggleSelect?: () => void;
  selected?: boolean;
  showDraftControls: boolean;
}) {
  const match = props.match;
  const team1Label = match.team1?.shortName ?? "TBD";
  const team2Label = match.team2?.shortName ?? "TBD";

  return (
    <div className="space-y-2 border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="font-semibold text-sm">
          {team1Label} vs {team2Label}
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant={
              match.fixtureStatus === "published" ? "default" : "secondary"
            }
          >
            {match.fixtureStatus}
          </Badge>
          <Badge variant="outline">{match.temporalStatus}</Badge>
        </div>
      </div>

      <div className="flex items-center gap-2 text-muted-foreground text-xs">
        <Calendar className="size-3.5" />
        <span>
          {match.scheduledStartAt
            ? formatWeekdayMonthDayYear(match.scheduledStartAt)
            : formatWeekdayMonthDayYear(match.matchDate)}
        </span>
      </div>

      <div className="text-muted-foreground text-xs">
        Stage: {match.stage?.name ?? "N/A"} • Group:{" "}
        {match.stageGroup?.name ?? "N/A"}
      </div>

      {props.showDraftControls && (
        <div className="flex flex-wrap gap-2 pt-1">
          <div className="flex items-center gap-2 border px-2 py-1 text-xs">
            <Checkbox
              checked={props.selected ?? false}
              onCheckedChange={() => props.onToggleSelect?.()}
            />
            {props.selected ? "Selected" : "Select"}
          </div>
          <Button onClick={props.onDelete} size="sm" variant="destructive">
            Delete
          </Button>
        </div>
      )}

      {match.fixtureStatus === "published" ? (
        <Link
          params={{ matchId: String(match.id) }}
          to="/matches/$matchId/scorecard"
        >
          <Button size="sm" variant="outline">
            <Trophy className="mr-1 size-4" />
            Scorecard
          </Button>
        </Link>
      ) : null}
    </div>
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
