import { useForm, useStore } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useTeamSearch } from "@/hooks/use-team-search";
import { MatchFormSchema } from "@/lib/schema/match-schema";
import { client, orpc } from "@/utils/orpc";

export const Route = createFileRoute("/matches/create-match")({
  component: RouteComponent,
});

const MATCH_FORMATS = [
  { value: "T5", label: "T5" },
  { value: "T6", label: "T6" },
  { value: "T7", label: "T7" },
  { value: "T8", label: "T8" },
  { value: "T10", label: "T10" },
  { value: "T12", label: "T12" },
  { value: "T20", label: "T20" },
  { value: "ODI", label: "ODI" },
  { value: "Test", label: "Test" },
  { value: "Custom", label: "Custom" },
];

const TOSS_DECISIONS = [
  { value: "bat", label: "Bat" },
  { value: "bowl", label: "Bowl" },
];

function RouteComponent() {
  const navigate = useNavigate();
  const [team1SearchInput, setTeam1SearchInput] = useState("");
  const [team2SearchInput, setTeam2SearchInput] = useState("");
  const {
    data: tournaments = [],
    error: tournamentsError,
    isLoading: isLoadingTournaments,
  } = useQuery(orpc.tournaments.queryOptions());

  // Search teams using custom hook
  const {
    data: team1Results = [],
    isLoading: loadingTeam1,
    error: team1Error,
  } = useTeamSearch(team1SearchInput);

  const {
    data: team2Results = [],
    isLoading: loadingTeam2,
    error: team2Error,
  } = useTeamSearch(team2SearchInput);

  // Show error toast if team searching fails
  useEffect(() => {
    if (team1Error) {
      toast.error("Failed to search teams");
    }
  }, [team1Error]);

  useEffect(() => {
    if (team2Error) {
      toast.error("Failed to search teams");
    }
  }, [team2Error]);

  useEffect(() => {
    if (tournamentsError) {
      toast.error("Failed to load tournaments");
    }
  }, [tournamentsError]);

  const loadingTeams = loadingTeam1 || loadingTeam2;

  const defaultValues: z.infer<typeof MatchFormSchema> = {
    tournamentId: 0,
    matchDate: new Date(),
    tossWinnerId: 0,
    tossDecision: "bat",
    team1Id: 0,
    team2Id: 0,
    oversPerSide: 6,
    maxOverPerBowler: 2,
    hasLBW: false,
    hasBye: false,
    hasLegBye: false,
    hasBoundaryOut: false,
    hasSuperOver: false,
    format: "T6",
  };

  const form = useForm({
    defaultValues,
    validators: {
      onSubmit: MatchFormSchema,
    },
    onSubmit: async ({ value }) => {
      try {
        await client.createMatch(value);
        toast.success("Match created successfully!");
        navigate({ to: "/" });
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to create match";
        toast.error(errorMessage);
      }
    },
  });

  const team1Id = useStore(form.store, (state) => state.values.team1Id);
  const team2Id = useStore(form.store, (state) => state.values.team2Id);

  return (
    <Card className="mx-3 mt-4 max-w-2xl">
      <CardHeader>
        <h1 className="font-bold text-2xl">Create Match</h1>
      </CardHeader>
      <CardContent>
        <form
          className="flex flex-col gap-6"
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit(e);
          }}
        >
          <FieldGroup>
            <form.Field name="tournamentId">
              {(field) => (
                <Field orientation="vertical">
                  <FieldLabel htmlFor="tournamentId">Tournament</FieldLabel>
                  <Select
                    onValueChange={(value) =>
                      value && field.handleChange(Number.parseInt(value, 10))
                    }
                    value={
                      field.state.value > 0 ? field.state.value.toString() : ""
                    }
                  >
                    <SelectTrigger
                      disabled={isLoadingTournaments}
                      id="tournamentId"
                    >
                      <SelectValue placeholder="Select tournament" />
                    </SelectTrigger>
                    <SelectContent>
                      {tournaments.map((tournament) => (
                        <SelectItem
                          key={tournament.id}
                          value={tournament.id.toString()}
                        >
                          {tournament.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {field.state.meta.errors.length > 0 && (
                    <span className="text-red-500 text-sm">
                      {String(field.state.meta.errors[0])}
                    </span>
                  )}
                </Field>
              )}
            </form.Field>
          </FieldGroup>

          {/* Match Date */}
          <FieldGroup>
            <form.Field name="matchDate">
              {(field) => (
                <Field orientation="vertical">
                  <FieldLabel htmlFor={field.name}>Match Date</FieldLabel>
                  <input
                    className="rounded border border-input bg-background px-3 py-2"
                    id={field.name}
                    onChange={(e) =>
                      field.handleChange(new Date(e.target.value))
                    }
                    type="date"
                    value={field.state.value.toISOString().substring(0, 10)}
                  />
                  {field.state.meta.errors.length > 0 && (
                    <span className="text-red-500 text-sm">
                      {String(field.state.meta.errors[0])}
                    </span>
                  )}
                </Field>
              )}
            </form.Field>
          </FieldGroup>

          {/* Format Selection */}
          <FieldGroup>
            <form.Field name="format">
              {(field) => (
                <Field orientation="vertical">
                  <FieldLabel htmlFor="format">Match Format</FieldLabel>
                  <Select
                    onValueChange={(value) =>
                      value && field.handleChange(value)
                    }
                    value={field.state.value}
                  >
                    <SelectTrigger id="format">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MATCH_FORMATS.map((fmt) => (
                        <SelectItem key={fmt.value} value={fmt.value}>
                          {fmt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {field.state.meta.errors.length > 0 && (
                    <span className="text-red-500 text-sm">
                      {String(field.state.meta.errors[0])}
                    </span>
                  )}
                </Field>
              )}
            </form.Field>
          </FieldGroup>

          {/* Team 1 - Autocomplete */}
          <FieldGroup>
            <form.Field name="team1Id">
              {(field) => (
                <Field orientation="vertical">
                  <FieldLabel htmlFor="team1">Team 1</FieldLabel>
                  <div className="relative">
                    <Input
                      className="relative"
                      disabled={loadingTeams}
                      id="team1"
                      onChange={(e) => setTeam1SearchInput(e.target.value)}
                      placeholder="Search or select team 1..."
                      value={team1SearchInput || ""}
                    />
                    {team1SearchInput ? (
                      <div className="absolute top-full right-0 left-0 z-50 mt-1 rounded-md border border-input bg-background shadow-md">
                        {team1Results.length > 0 ? (
                          team1Results.map((team) => (
                            <button
                              className="block w-full px-3 py-2 text-left first:rounded-t-md last:rounded-b-md hover:bg-accent"
                              key={team.id}
                              onClick={() => {
                                field.handleChange(team.id);
                                setTeam1SearchInput(team.name);
                              }}
                              type="button"
                            >
                              <div className="font-medium">{team.name}</div>
                              <div className="text-muted-foreground text-xs">
                                {team.shortName}
                              </div>
                            </button>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-muted-foreground text-sm">
                            No teams found
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                  {field.state.meta.errors.length > 0 && (
                    <span className="text-red-500 text-sm">
                      {String(field.state.meta.errors[0])}
                    </span>
                  )}
                </Field>
              )}
            </form.Field>
          </FieldGroup>

          {/* Team 2 - Autocomplete */}
          <FieldGroup>
            <form.Field name="team2Id">
              {(field) => (
                <Field orientation="vertical">
                  <FieldLabel htmlFor="team2">Team 2</FieldLabel>
                  <div className="relative">
                    <Input
                      disabled={loadingTeams}
                      id="team2"
                      onChange={(e) => setTeam2SearchInput(e.target.value)}
                      placeholder="Search or select team 2..."
                      value={team2SearchInput || ""}
                    />
                    {team2SearchInput ? (
                      <div className="absolute top-full right-0 left-0 z-50 mt-1 rounded-md border border-input bg-background shadow-md">
                        {team2Results.length > 0 ? (
                          team2Results.map((team) => (
                            <button
                              className="block w-full px-3 py-2 text-left first:rounded-t-md last:rounded-b-md hover:bg-accent"
                              key={team.id}
                              onClick={() => {
                                field.handleChange(team.id);
                                setTeam2SearchInput(team.name);
                              }}
                              type="button"
                            >
                              <div className="font-medium">{team.name}</div>
                              <div className="text-muted-foreground text-xs">
                                {team.shortName}
                              </div>
                            </button>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-muted-foreground text-sm">
                            No teams found
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                  {field.state.meta.errors.length > 0 && (
                    <span className="text-red-500 text-sm">
                      {String(field.state.meta.errors[0])}
                    </span>
                  )}
                </Field>
              )}
            </form.Field>
          </FieldGroup>

          {/* Toss Winner */}
          {team1Id && team2Id ? (
            <FieldGroup>
              <form.Field name="tossWinnerId">
                {(field) => (
                  <Field orientation="vertical">
                    <FieldLabel htmlFor="tossWinner">Toss Winner</FieldLabel>
                    <Select
                      onValueChange={(value) =>
                        value && field.handleChange(Number.parseInt(value, 10))
                      }
                      value={field.state.value?.toString() || ""}
                    >
                      <SelectTrigger id="tossWinner">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={team1Id.toString()}>
                          {team1Id}
                        </SelectItem>
                        <SelectItem value={team2Id.toString()}>
                          {team2Id}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {field.state.meta.errors.length > 0 && (
                      <span className="text-red-500 text-sm">
                        {String(field.state.meta.errors[0])}
                      </span>
                    )}
                  </Field>
                )}
              </form.Field>
            </FieldGroup>
          ) : null}

          {/* Toss Decision */}
          {team1Id && team2Id ? (
            <FieldGroup>
              <form.Field name="tossDecision">
                {(field) => (
                  <Field orientation="vertical">
                    <FieldLabel htmlFor="tossDecision">
                      Toss Decision
                    </FieldLabel>
                    <Select
                      onValueChange={(value) =>
                        value && field.handleChange(value)
                      }
                      value={field.state.value}
                    >
                      <SelectTrigger id="tossDecision">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TOSS_DECISIONS.map((decision) => (
                          <SelectItem
                            key={decision.value}
                            value={decision.value}
                          >
                            {decision.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {field.state.meta.errors.length > 0 && (
                      <span className="text-red-500 text-sm">
                        {String(field.state.meta.errors[0])}
                      </span>
                    )}
                  </Field>
                )}
              </form.Field>
            </FieldGroup>
          ) : null}

          {/* Overs Per Side - Conditional */}
          {
            <form.Subscribe selector={(state) => state.values.format}>
              {(format) =>
                format === "Custom" && (
                  <FieldGroup>
                    <form.Field name="oversPerSide">
                      {(field) => (
                        <Field orientation="vertical">
                          <FieldLabel htmlFor="oversPerSide">
                            Overs Per Side
                          </FieldLabel>
                          <Input
                            id="oversPerSide"
                            min="1"
                            onChange={(e) =>
                              field.handleChange(
                                Number.parseInt(e.target.value, 10) || 0
                              )
                            }
                            placeholder="Enter overs per side"
                            step="1"
                            type="number"
                            value={field.state.value}
                          />
                          {field.state.meta.errors.length > 0 && (
                            <span className="text-red-500 text-sm">
                              {String(field.state.meta.errors[0])}
                            </span>
                          )}
                        </Field>
                      )}
                    </form.Field>
                  </FieldGroup>
                )
              }
            </form.Subscribe>
          }

          {/* Max Over Per Bowler */}
          <FieldGroup>
            <form.Field name="maxOverPerBowler">
              {(field) => (
                <Field orientation="vertical">
                  <FieldLabel htmlFor="maxOverPerBowler">
                    Max Overs Per Bowler
                  </FieldLabel>
                  <Input
                    id="maxOverPerBowler"
                    min="1"
                    onChange={(e) =>
                      field.handleChange(
                        Number.parseInt(e.target.value, 10) || 0
                      )
                    }
                    placeholder="Enter max overs per bowler"
                    step="1"
                    type="number"
                    value={field.state.value}
                  />
                  {field.state.meta.errors.length > 0 && (
                    <span className="text-red-500 text-sm">
                      {String(field.state.meta.errors[0])}
                    </span>
                  )}
                </Field>
              )}
            </form.Field>
          </FieldGroup>

          {/* Rule Toggles */}
          <div className="space-y-3 rounded-lg border border-input bg-muted/30 p-4">
            <h3 className="font-semibold">Match Rules</h3>

            <FieldGroup>
              <form.Field name="hasLBW">
                {(field) => (
                  <Field orientation="horizontal">
                    <FieldLabel htmlFor="hasLBW">Enable LBW</FieldLabel>
                    <Switch
                      checked={field.state.value}
                      id="hasLBW"
                      onCheckedChange={(checked) => field.handleChange(checked)}
                    />
                  </Field>
                )}
              </form.Field>
            </FieldGroup>

            <FieldGroup>
              <form.Field name="hasBye">
                {(field) => (
                  <Field orientation="horizontal">
                    <FieldLabel htmlFor="hasBye">Enable Bye</FieldLabel>
                    <Switch
                      checked={field.state.value}
                      id="hasBye"
                      onCheckedChange={(checked) => field.handleChange(checked)}
                    />
                  </Field>
                )}
              </form.Field>
            </FieldGroup>

            <FieldGroup>
              <form.Field name="hasLegBye">
                {(field) => (
                  <Field orientation="horizontal">
                    <FieldLabel htmlFor="hasLegBye">Enable Leg Bye</FieldLabel>
                    <Switch
                      checked={field.state.value}
                      id="hasLegBye"
                      onCheckedChange={(checked) => field.handleChange(checked)}
                    />
                  </Field>
                )}
              </form.Field>
            </FieldGroup>

            <FieldGroup>
              <form.Field name="hasBoundaryOut">
                {(field) => (
                  <Field orientation="horizontal">
                    <FieldLabel htmlFor="hasBoundaryOut">
                      Enable Boundary Out
                    </FieldLabel>
                    <Switch
                      checked={field.state.value}
                      id="hasBoundaryOut"
                      onCheckedChange={(checked) => field.handleChange(checked)}
                    />
                  </Field>
                )}
              </form.Field>
            </FieldGroup>

            <FieldGroup>
              <form.Field name="hasSuperOver">
                {(field) => (
                  <Field orientation="horizontal">
                    <FieldLabel htmlFor="hasSuperOver">
                      Enable Super Over
                    </FieldLabel>
                    <Switch
                      checked={field.state.value}
                      id="hasSuperOver"
                      onCheckedChange={(checked) => field.handleChange(checked)}
                    />
                  </Field>
                )}
              </form.Field>
            </FieldGroup>
          </div>

          {/* Submit Button */}
          <div className="flex gap-3 pt-4">
            <Button
              className="flex-1"
              disabled={form.state.isSubmitting}
              type="submit"
            >
              {form.state.isSubmitting ? "Creating..." : "Create Match"}
            </Button>
            <Button
              onClick={() => navigate({ to: "/" })}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
