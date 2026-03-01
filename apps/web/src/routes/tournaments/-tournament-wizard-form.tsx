import {
  ArrowLeft,
  ArrowRight,
  MoveDown,
  MoveUp,
  Plus,
  Trash2,
  Trophy,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateInput, parseDateInput } from "@/lib/date";
import {
  buildTemplateDefaults,
  type GroupEditDraft,
  getTournamentTypeForTemplate,
  mergeGroupEdits,
  mergeStageEdits,
  type TournamentTemplateKind,
  type TournamentWizardValues,
} from "@/routes/tournaments/-create-wizard";

const STEPS = ["Basics", "Teams", "Structure", "Review"] as const;

const categoryOptions = [
  { label: "Competitive", value: "competitive" },
  { label: "Practice", value: "practice" },
  { label: "Recreational", value: "recreational" },
  { label: "One-off", value: "one_off" },
] as const;

const genderOptions = [
  { label: "Open", value: "open" },
  { label: "Male", value: "male" },
  { label: "Female", value: "female" },
] as const;

const templateOptions: Array<{ label: string; value: TournamentTemplateKind }> =
  [
    { label: "Straight League", value: "straight_league" },
    {
      label: "Grouped League + Playoffs",
      value: "grouped_league_with_playoffs",
    },
    { label: "Straight Knockout", value: "straight_knockout" },
  ];

const stepSchema = {
  basics: z.object({
    name: z.string().trim().min(2, "Tournament name is required"),
    ageLimit: z.number().int().min(1, "Age limit must be at least 1"),
    startDate: z.date(),
    endDate: z.date(),
    timeZone: z.string().trim().min(1, "Time zone is required"),
  }),
};

interface TournamentWizardFormProps {
  backLabel?: string;
  cancelLabel?: string;
  description: string;
  heading: string;
  initialValues: TournamentWizardValues;
  isLookupLoading: boolean;
  lockReasons?: {
    structureLocked?: string;
    structureUnsupported?: string;
    teamsLocked?: string;
  };
  matchFormats: Array<{ id: number; name: string }>;
  mode: "create" | "edit";
  onCancel: () => void;
  onSubmit: (values: TournamentWizardValues) => Promise<void>;
  organizations: Array<{ id: number; name: string }>;
  submitBusyLabel: string;
  submitIdleLabel: string;
  submitting: boolean;
  teams: Array<{ id: number; name: string; shortName: string }>;
}

function getBasicsStepError(values: TournamentWizardValues) {
  const basicsResult = stepSchema.basics.safeParse({
    name: values.name,
    ageLimit: values.ageLimit,
    startDate: values.startDate,
    endDate: values.endDate,
    timeZone: values.advanced.timeZone,
  });
  if (!basicsResult.success) {
    const firstIssue = basicsResult.error.issues[0];
    return firstIssue?.message ?? "Review tournament basics";
  }

  if (values.endDate.getTime() < values.startDate.getTime()) {
    return "End date must be on or after start date";
  }

  if (values.organization.mode === "existing") {
    if (typeof values.organization.existingId !== "number") {
      return "Select an organization";
    }
  } else if (
    values.organization.create.name.trim().length < 2 ||
    values.organization.create.slug.trim().length < 2
  ) {
    return "Provide organization name and slug when creating a new organization";
  }

  if (values.defaultMatchFormat.mode === "existing") {
    if (typeof values.defaultMatchFormat.existingId !== "number") {
      return "Select a default match format";
    }
  } else if (values.defaultMatchFormat.create.name.trim().length < 2) {
    return "Provide a match format name";
  }

  return null;
}

function getTeamsStepError(values: TournamentWizardValues) {
  const totalTeams =
    values.teams.existingTeamIds.length + values.teams.createTeams.length;
  if (totalTeams < 2) {
    return "Add at least two teams";
  }

  return null;
}

function getStructureStepError(values: TournamentWizardValues) {
  if (values.structure.template === "grouped_league_with_playoffs") {
    if (values.structure.groupCount < 1) {
      return "Group count must be at least 1";
    }
    if (values.structure.advancingPerGroup < 2) {
      return "Advancing per group must be at least 2";
    }

    const totalTeams =
      values.teams.existingTeamIds.length + values.teams.createTeams.length;
    const totalAdvancers =
      values.structure.groupCount * values.structure.advancingPerGroup;
    if (totalAdvancers > totalTeams) {
      return "Advancing slots cannot exceed total teams";
    }
  }

  for (const stage of values.structure.stageEdits) {
    if (stage.name.trim().length < 1) {
      return "Every stage needs a name";
    }
  }

  for (const group of values.structure.groupEdits) {
    if (group.name.trim().length < 1) {
      return "Every group needs a name";
    }
  }

  return null;
}

function getCurrentStepError(step: number, values: TournamentWizardValues) {
  if (step === 0) {
    return getBasicsStepError(values);
  }

  if (step === 1) {
    return getTeamsStepError(values);
  }

  if (step === 2) {
    return getStructureStepError(values);
  }

  return null;
}

export function TournamentWizardForm(props: TournamentWizardFormProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [globalError, setGlobalError] = useState<null | string>(null);
  const [teamSearchInput, setTeamSearchInput] = useState("");
  const [newTeamDraft, setNewTeamDraft] = useState({
    name: "",
    shortName: "",
    country: "",
  });
  const [values, setValues] = useState(props.initialValues);

  useEffect(() => {
    setValues(props.initialValues);
    setCurrentStep(0);
    setGlobalError(null);
  }, [props.initialValues]);

  const selectedExistingTeams = useMemo(() => {
    const teamById = new Map(props.teams.map((team) => [team.id, team]));
    return values.teams.existingTeamIds
      .map((teamId) => teamById.get(teamId))
      .filter((team): team is NonNullable<typeof team> => Boolean(team));
  }, [props.teams, values.teams.existingTeamIds]);

  const filteredTeams = useMemo(() => {
    const normalizedQuery = teamSearchInput.trim().toLowerCase();
    if (normalizedQuery.length === 0) {
      return props.teams;
    }

    return props.teams.filter((team) => {
      const name = team.name.toLowerCase();
      const shortName = team.shortName.toLowerCase();
      return (
        name.includes(normalizedQuery) || shortName.includes(normalizedQuery)
      );
    });
  }, [teamSearchInput, props.teams]);

  const teamOptionsForChampion = useMemo(() => {
    const byId = new Map(props.teams.map((team) => [team.id, team]));
    return values.teams.existingTeamIds
      .map((teamId) => byId.get(teamId))
      .filter((team): team is NonNullable<typeof team> => Boolean(team));
  }, [props.teams, values.teams.existingTeamIds]);

  const selectedOrganizationLabel = useMemo(() => {
    if (typeof values.organization.existingId !== "number") {
      return "Select organization";
    }

    return (
      props.organizations.find(
        (organization) => organization.id === values.organization.existingId
      )?.name ?? "Select organization"
    );
  }, [props.organizations, values.organization.existingId]);

  const selectedMatchFormatLabel = useMemo(() => {
    if (typeof values.defaultMatchFormat.existingId !== "number") {
      return "Select match format";
    }

    return (
      props.matchFormats.find(
        (format) => format.id === values.defaultMatchFormat.existingId
      )?.name ?? "Select match format"
    );
  }, [props.matchFormats, values.defaultMatchFormat.existingId]);

  const isTeamsLocked = Boolean(props.lockReasons?.teamsLocked);
  const isStructureLocked = Boolean(props.lockReasons?.structureLocked);
  const isStructureUnsupported = Boolean(
    props.lockReasons?.structureUnsupported
  );
  const isStructureReadOnly = isStructureLocked || isStructureUnsupported;

  const validateCurrentStep = () => {
    setGlobalError(null);
    const error =
      currentStep === 2 && isStructureReadOnly
        ? null
        : getCurrentStepError(currentStep, values);
    if (error) {
      setGlobalError(error);
      return false;
    }

    return true;
  };

  const updateStructureTemplate = (template: TournamentTemplateKind) => {
    if (isStructureReadOnly) {
      return;
    }

    const defaults = buildTemplateDefaults({
      template,
      groupCount: values.structure.groupCount,
      advancingPerGroup: values.structure.advancingPerGroup,
    });

    setValues((previous) => ({
      ...previous,
      structure: {
        ...previous.structure,
        template,
        stageEdits: mergeStageEdits(
          defaults.stageEdits,
          previous.structure.stageEdits
        ),
        groupEdits: mergeGroupEdits(
          defaults.groupEdits,
          previous.structure.groupEdits
        ),
      },
    }));
  };

  const updateGroupedStructureConfig = (params: {
    advancingPerGroup?: number;
    groupCount?: number;
  }) => {
    if (isStructureReadOnly) {
      return;
    }

    const nextGroupCount = params.groupCount ?? values.structure.groupCount;
    const nextAdvancingPerGroup =
      params.advancingPerGroup ?? values.structure.advancingPerGroup;
    const defaults = buildTemplateDefaults({
      template: values.structure.template,
      groupCount: nextGroupCount,
      advancingPerGroup: nextAdvancingPerGroup,
    });

    setValues((previous) => ({
      ...previous,
      structure: {
        ...previous.structure,
        groupCount: nextGroupCount,
        advancingPerGroup: nextAdvancingPerGroup,
        stageEdits: mergeStageEdits(
          defaults.stageEdits,
          previous.structure.stageEdits
        ),
        groupEdits: mergeGroupEdits(
          defaults.groupEdits,
          previous.structure.groupEdits
        ),
      },
    }));
  };

  const toggleExistingTeam = (teamId: number) => {
    if (isTeamsLocked) {
      return;
    }

    setValues((previous) => {
      const exists = previous.teams.existingTeamIds.includes(teamId);
      if (exists) {
        return {
          ...previous,
          teams: {
            ...previous.teams,
            existingTeamIds: previous.teams.existingTeamIds.filter(
              (selectedTeamId) => selectedTeamId !== teamId
            ),
          },
        };
      }

      return {
        ...previous,
        teams: {
          ...previous.teams,
          existingTeamIds: [...previous.teams.existingTeamIds, teamId],
        },
      };
    });
  };

  const moveExistingTeam = (index: number, direction: "up" | "down") => {
    if (isTeamsLocked) {
      return;
    }

    setValues((previous) => {
      const sourceIndex = index;
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (
        sourceIndex < 0 ||
        targetIndex < 0 ||
        sourceIndex >= previous.teams.existingTeamIds.length ||
        targetIndex >= previous.teams.existingTeamIds.length
      ) {
        return previous;
      }

      const reordered = [...previous.teams.existingTeamIds];
      const [moved] = reordered.splice(sourceIndex, 1);
      reordered.splice(targetIndex, 0, moved);

      return {
        ...previous,
        teams: {
          ...previous.teams,
          existingTeamIds: reordered,
        },
      };
    });
  };

  const addInlineTeam = () => {
    if (isTeamsLocked) {
      return;
    }

    const normalizedName = newTeamDraft.name.trim();
    const normalizedShortName = newTeamDraft.shortName.trim().toUpperCase();
    if (normalizedName.length < 2 || normalizedShortName.length < 2) {
      setGlobalError("Inline teams require a name and short code");
      return;
    }

    setValues((previous) => ({
      ...previous,
      teams: {
        ...previous.teams,
        createTeams: [
          ...previous.teams.createTeams,
          {
            name: normalizedName,
            shortName: normalizedShortName,
            country: newTeamDraft.country.trim() || undefined,
          },
        ],
      },
    }));
    setNewTeamDraft({
      name: "",
      shortName: "",
      country: "",
    });
  };

  const removeInlineTeam = (index: number) => {
    if (isTeamsLocked) {
      return;
    }

    setValues((previous) => ({
      ...previous,
      teams: {
        ...previous.teams,
        createTeams: previous.teams.createTeams.filter(
          (_team, teamIndex) => teamIndex !== index
        ),
      },
    }));
  };

  const moveInlineTeam = (index: number, direction: "up" | "down") => {
    if (isTeamsLocked) {
      return;
    }

    setValues((previous) => {
      const sourceIndex = index;
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (
        sourceIndex < 0 ||
        targetIndex < 0 ||
        sourceIndex >= previous.teams.createTeams.length ||
        targetIndex >= previous.teams.createTeams.length
      ) {
        return previous;
      }

      const reordered = [...previous.teams.createTeams];
      const [moved] = reordered.splice(sourceIndex, 1);
      reordered.splice(targetIndex, 0, moved);

      return {
        ...previous,
        teams: {
          ...previous.teams,
          createTeams: reordered,
        },
      };
    });
  };

  const updateStageEdit = (
    sequence: number,
    field: "code" | "name",
    value: string
  ) => {
    if (isStructureReadOnly) {
      return;
    }

    setValues((previous) => ({
      ...previous,
      structure: {
        ...previous.structure,
        stageEdits: previous.structure.stageEdits.map((stage) =>
          stage.sequence === sequence ? { ...stage, [field]: value } : stage
        ),
      },
    }));
  };

  const updateGroupEdit = (
    stageSequence: number,
    sequence: number,
    patch: Partial<GroupEditDraft>
  ) => {
    if (isStructureReadOnly) {
      return;
    }

    setValues((previous) => ({
      ...previous,
      structure: {
        ...previous.structure,
        groupEdits: previous.structure.groupEdits.map((group) => {
          if (
            group.stageSequence !== stageSequence ||
            group.sequence !== sequence
          ) {
            return group;
          }

          return {
            ...group,
            ...patch,
          };
        }),
      },
    }));
  };

  const submitTournament = async () => {
    if (!validateCurrentStep()) {
      return;
    }

    try {
      await props.onSubmit(values);
    } catch (error) {
      if (error instanceof Error) {
        setGlobalError(error.message || "Failed to submit tournament");
      } else {
        setGlobalError("Failed to submit tournament");
      }
    }
  };

  const renderBasicsStep = () => {
    return (
      <div className="space-y-5">
        <div className="grid gap-5 md:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="tournament-name">Tournament Name</FieldLabel>
            <Input
              id="tournament-name"
              onChange={(event) =>
                setValues((previous) => ({
                  ...previous,
                  name: event.target.value,
                }))
              }
              placeholder="e.g. City Premier League"
              value={values.name}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="tournament-season">Season</FieldLabel>
            <Input
              id="tournament-season"
              onChange={(event) =>
                setValues((previous) => ({
                  ...previous,
                  season: event.target.value,
                }))
              }
              placeholder="e.g. 2026"
              value={values.season}
            />
          </Field>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          <Field>
            <FieldLabel htmlFor="category">Category</FieldLabel>
            <Select
              onValueChange={(value) => {
                if (!value) {
                  return;
                }

                setValues((previous) => ({
                  ...previous,
                  category: value as (typeof previous)["category"],
                }));
              }}
              value={values.category}
            >
              <SelectTrigger id="category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categoryOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel htmlFor="gender-allowed">Gender Allowed</FieldLabel>
            <Select
              onValueChange={(value) => {
                if (!value) {
                  return;
                }

                setValues((previous) => ({
                  ...previous,
                  genderAllowed: value as (typeof previous)["genderAllowed"],
                }));
              }}
              value={values.genderAllowed}
            >
              <SelectTrigger id="gender-allowed">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {genderOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel htmlFor="age-limit">Age Limit</FieldLabel>
            <Input
              id="age-limit"
              min={1}
              onChange={(event) => {
                const parsedValue = Number.parseInt(event.target.value, 10);
                setValues((previous) => ({
                  ...previous,
                  ageLimit: Number.isNaN(parsedValue) ? 1 : parsedValue,
                }));
              }}
              type="number"
              value={String(values.ageLimit)}
            />
          </Field>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="start-date">Start Date</FieldLabel>
            <Input
              id="start-date"
              onChange={(event) => {
                const parsedDate = parseDateInput(event.target.value);
                if (!parsedDate) {
                  return;
                }

                setValues((previous) => ({
                  ...previous,
                  startDate: parsedDate,
                }));
              }}
              type="date"
              value={formatDateInput(values.startDate)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="end-date">End Date</FieldLabel>
            <Input
              id="end-date"
              onChange={(event) => {
                const parsedDate = parseDateInput(event.target.value);
                if (!parsedDate) {
                  return;
                }

                setValues((previous) => ({
                  ...previous,
                  endDate: parsedDate,
                }));
              }}
              type="date"
              value={formatDateInput(values.endDate)}
            />
          </Field>
        </div>

        <div className="space-y-4 rounded-lg border p-4">
          <div>
            <h3 className="font-medium text-sm">Advanced</h3>
            <p className="text-muted-foreground text-xs">
              Optional scheduling and completion metadata.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="time-zone">Time Zone</FieldLabel>
              <Input
                id="time-zone"
                onChange={(event) =>
                  setValues((previous) => ({
                    ...previous,
                    advanced: {
                      ...previous.advanced,
                      timeZone: event.target.value,
                    },
                  }))
                }
                placeholder="e.g. Asia/Kolkata"
                value={values.advanced.timeZone}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="champion-team">Champion Team</FieldLabel>
              <Select
                onValueChange={(value) => {
                  const championTeamId =
                    !value || value === "none"
                      ? null
                      : Number.parseInt(value, 10);
                  setValues((previous) => ({
                    ...previous,
                    advanced: {
                      ...previous.advanced,
                      championTeamId: Number.isNaN(championTeamId)
                        ? null
                        : championTeamId,
                    },
                  }));
                }}
                value={
                  typeof values.advanced.championTeamId === "number"
                    ? String(values.advanced.championTeamId)
                    : "none"
                }
              >
                <SelectTrigger id="champion-team">
                  <SelectValue placeholder="Select champion team" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not decided yet</SelectItem>
                  {teamOptionsForChampion.map((team) => (
                    <SelectItem key={team.id} value={String(team.id)}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
        </div>

        <div className="space-y-4 rounded-lg border p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-medium text-sm">Organization</h3>
              <p className="text-muted-foreground text-xs">
                Choose existing or create inline for this tournament.
              </p>
            </div>
            <Select
              onValueChange={(value) => {
                if (!value) {
                  return;
                }

                setValues((previous) => ({
                  ...previous,
                  organization: {
                    ...previous.organization,
                    mode: value as "create" | "existing",
                  },
                }));
              }}
              value={values.organization.mode}
            >
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="existing">Select Existing</SelectItem>
                <SelectItem value="create">Create Inline</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {values.organization.mode === "existing" ? (
            <Field>
              <FieldLabel htmlFor="organization-existing">
                Organization
              </FieldLabel>
              <Select
                onValueChange={(value) => {
                  if (!value) {
                    return;
                  }

                  setValues((previous) => ({
                    ...previous,
                    organization: {
                      ...previous.organization,
                      existingId: Number.parseInt(value, 10),
                    },
                  }));
                }}
                value={
                  typeof values.organization.existingId === "number"
                    ? String(values.organization.existingId)
                    : ""
                }
              >
                <SelectTrigger id="organization-existing">
                  <SelectValue placeholder="Select organization">
                    {selectedOrganizationLabel}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {props.organizations.map((organization) => (
                    <SelectItem
                      key={organization.id}
                      label={organization.name}
                      value={String(organization.id)}
                    >
                      {organization.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="organization-name">
                  Organization Name
                </FieldLabel>
                <Input
                  id="organization-name"
                  onChange={(event) =>
                    setValues((previous) => ({
                      ...previous,
                      organization: {
                        ...previous.organization,
                        create: {
                          ...previous.organization.create,
                          name: event.target.value,
                        },
                      },
                    }))
                  }
                  value={values.organization.create.name}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="organization-slug">Slug</FieldLabel>
                <Input
                  id="organization-slug"
                  onChange={(event) =>
                    setValues((previous) => ({
                      ...previous,
                      organization: {
                        ...previous.organization,
                        create: {
                          ...previous.organization.create,
                          slug: event.target.value,
                        },
                      },
                    }))
                  }
                  placeholder="e.g. city-cricket-association"
                  value={values.organization.create.slug}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="organization-short-name">
                  Short Name
                </FieldLabel>
                <Input
                  id="organization-short-name"
                  onChange={(event) =>
                    setValues((previous) => ({
                      ...previous,
                      organization: {
                        ...previous.organization,
                        create: {
                          ...previous.organization.create,
                          shortName: event.target.value,
                        },
                      },
                    }))
                  }
                  value={values.organization.create.shortName ?? ""}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="organization-country">Country</FieldLabel>
                <Input
                  id="organization-country"
                  onChange={(event) =>
                    setValues((previous) => ({
                      ...previous,
                      organization: {
                        ...previous.organization,
                        create: {
                          ...previous.organization.create,
                          country: event.target.value,
                        },
                      },
                    }))
                  }
                  value={values.organization.create.country ?? ""}
                />
              </Field>
            </div>
          )}
        </div>

        <div className="space-y-4 rounded-lg border p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-medium text-sm">Default Match Format</h3>
              <p className="text-muted-foreground text-xs">
                Choose existing or create inline for this tournament.
              </p>
            </div>
            <Select
              onValueChange={(value) => {
                if (!value) {
                  return;
                }

                setValues((previous) => ({
                  ...previous,
                  defaultMatchFormat: {
                    ...previous.defaultMatchFormat,
                    mode: value as "create" | "existing",
                  },
                }));
              }}
              value={values.defaultMatchFormat.mode}
            >
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="existing">Select Existing</SelectItem>
                <SelectItem value="create">Create Inline</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {values.defaultMatchFormat.mode === "existing" ? (
            <Field>
              <FieldLabel htmlFor="match-format-existing">
                Match Format
              </FieldLabel>
              <Select
                onValueChange={(value) => {
                  if (!value) {
                    return;
                  }

                  setValues((previous) => ({
                    ...previous,
                    defaultMatchFormat: {
                      ...previous.defaultMatchFormat,
                      existingId: Number.parseInt(value, 10),
                    },
                  }));
                }}
                value={
                  typeof values.defaultMatchFormat.existingId === "number"
                    ? String(values.defaultMatchFormat.existingId)
                    : ""
                }
              >
                <SelectTrigger id="match-format-existing">
                  <SelectValue placeholder="Select match format">
                    {selectedMatchFormatLabel}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {props.matchFormats.map((format) => (
                    <SelectItem
                      key={format.id}
                      label={format.name}
                      value={String(format.id)}
                    >
                      {format.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="match-format-name">Format Name</FieldLabel>
                <Input
                  id="match-format-name"
                  onChange={(event) =>
                    setValues((previous) => ({
                      ...previous,
                      defaultMatchFormat: {
                        ...previous.defaultMatchFormat,
                        create: {
                          ...previous.defaultMatchFormat.create,
                          name: event.target.value,
                        },
                      },
                    }))
                  }
                  placeholder="e.g. T20"
                  value={values.defaultMatchFormat.create.name}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="match-format-overs">Overs</FieldLabel>
                <Input
                  id="match-format-overs"
                  min={1}
                  onChange={(event) => {
                    const parsed = Number.parseInt(event.target.value, 10);
                    if (Number.isNaN(parsed)) {
                      return;
                    }
                    setValues((previous) => ({
                      ...previous,
                      defaultMatchFormat: {
                        ...previous.defaultMatchFormat,
                        create: {
                          ...previous.defaultMatchFormat.create,
                          noOfOvers: parsed,
                        },
                      },
                    }));
                  }}
                  type="number"
                  value={String(
                    values.defaultMatchFormat.create.noOfOvers ?? 20
                  )}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="match-format-innings">Innings</FieldLabel>
                <Input
                  id="match-format-innings"
                  min={1}
                  onChange={(event) => {
                    const parsed = Number.parseInt(event.target.value, 10);
                    if (Number.isNaN(parsed)) {
                      return;
                    }
                    setValues((previous) => ({
                      ...previous,
                      defaultMatchFormat: {
                        ...previous.defaultMatchFormat,
                        create: {
                          ...previous.defaultMatchFormat.create,
                          noOfInnings: parsed,
                        },
                      },
                    }));
                  }}
                  type="number"
                  value={String(
                    values.defaultMatchFormat.create.noOfInnings ?? 2
                  )}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="match-format-players">
                  Players Per Side
                </FieldLabel>
                <Input
                  id="match-format-players"
                  min={2}
                  onChange={(event) => {
                    const parsed = Number.parseInt(event.target.value, 10);
                    if (Number.isNaN(parsed)) {
                      return;
                    }
                    setValues((previous) => ({
                      ...previous,
                      defaultMatchFormat: {
                        ...previous.defaultMatchFormat,
                        create: {
                          ...previous.defaultMatchFormat.create,
                          playersPerSide: parsed,
                        },
                      },
                    }));
                  }}
                  type="number"
                  value={String(
                    values.defaultMatchFormat.create.playersPerSide ?? 11
                  )}
                />
              </Field>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderTeamsStep = () => {
    const selectedIds = new Set(values.teams.existingTeamIds);

    return (
      <div className="space-y-6">
        {props.lockReasons?.teamsLocked ? (
          <FieldError className="rounded border border-amber-500/40 bg-amber-500/5 p-3 text-amber-700 text-sm">
            {props.lockReasons.teamsLocked}
          </FieldError>
        ) : null}

        <div className="space-y-3 rounded-lg border p-4">
          <h3 className="font-medium text-sm">Select Existing Teams</h3>
          <Input
            disabled={isTeamsLocked}
            onChange={(event) => setTeamSearchInput(event.target.value)}
            placeholder="Search teams by name or short code"
            value={teamSearchInput}
          />
          <div className="max-h-64 space-y-2 overflow-auto pr-1">
            {filteredTeams.map((team) => (
              <label
                className="flex cursor-pointer items-center justify-between rounded border px-3 py-2 text-sm"
                htmlFor={`team-option-${team.id}`}
                key={team.id}
              >
                <div>
                  <div className="font-medium">{team.name}</div>
                  <div className="text-muted-foreground text-xs">
                    {team.shortName}
                  </div>
                </div>
                <input
                  checked={selectedIds.has(team.id)}
                  disabled={isTeamsLocked}
                  id={`team-option-${team.id}`}
                  onChange={() => toggleExistingTeam(team.id)}
                  type="checkbox"
                />
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-3 rounded-lg border p-4">
          <h3 className="font-medium text-sm">Quick Create Teams (Inline)</h3>
          <FieldGroup className="md:grid md:grid-cols-4">
            <Field>
              <FieldLabel htmlFor="inline-team-name">Team Name</FieldLabel>
              <Input
                disabled={isTeamsLocked}
                id="inline-team-name"
                onChange={(event) =>
                  setNewTeamDraft((previous) => ({
                    ...previous,
                    name: event.target.value,
                  }))
                }
                value={newTeamDraft.name}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="inline-team-short">Short Code</FieldLabel>
              <Input
                disabled={isTeamsLocked}
                id="inline-team-short"
                maxLength={12}
                onChange={(event) =>
                  setNewTeamDraft((previous) => ({
                    ...previous,
                    shortName: event.target.value.toUpperCase(),
                  }))
                }
                value={newTeamDraft.shortName}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="inline-team-country">Country</FieldLabel>
              <Input
                disabled={isTeamsLocked}
                id="inline-team-country"
                onChange={(event) =>
                  setNewTeamDraft((previous) => ({
                    ...previous,
                    country: event.target.value,
                  }))
                }
                value={newTeamDraft.country}
              />
            </Field>
            <Field className="justify-end">
              <FieldLabel className="invisible">Add</FieldLabel>
              <Button
                disabled={isTeamsLocked}
                onClick={addInlineTeam}
                type="button"
                variant="outline"
              >
                <Plus />
                Add Team
              </Button>
            </Field>
          </FieldGroup>
        </div>

        <div className="space-y-3 rounded-lg border p-4">
          <h3 className="font-medium text-sm">Seed Order (Existing Teams)</h3>
          {selectedExistingTeams.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No existing teams selected yet.
            </p>
          ) : (
            <div className="space-y-2">
              {selectedExistingTeams.map((team, index) => (
                <div
                  className="flex items-center justify-between rounded border px-3 py-2"
                  key={team.id}
                >
                  <div>
                    <p className="font-medium text-sm">{team.name}</p>
                    <p className="text-muted-foreground text-xs">
                      Seed #{index + 1}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      disabled={isTeamsLocked || index === 0}
                      onClick={() => moveExistingTeam(index, "up")}
                      size="icon-sm"
                      type="button"
                      variant="ghost"
                    >
                      <MoveUp />
                    </Button>
                    <Button
                      disabled={
                        isTeamsLocked ||
                        index === selectedExistingTeams.length - 1
                      }
                      onClick={() => moveExistingTeam(index, "down")}
                      size="icon-sm"
                      type="button"
                      variant="ghost"
                    >
                      <MoveDown />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-3 rounded-lg border p-4">
          <h3 className="font-medium text-sm">Seed Order (Inline Teams)</h3>
          {values.teams.createTeams.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No inline teams added yet.
            </p>
          ) : (
            <div className="space-y-2">
              {values.teams.createTeams.map((team, index) => (
                <div
                  className="flex items-center justify-between rounded border px-3 py-2"
                  key={`${team.name}-${team.shortName}-${index}`}
                >
                  <div>
                    <p className="font-medium text-sm">{team.name}</p>
                    <p className="text-muted-foreground text-xs">
                      {team.shortName} - Inline Team #{index + 1}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      disabled={isTeamsLocked || index === 0}
                      onClick={() => moveInlineTeam(index, "up")}
                      size="icon-sm"
                      type="button"
                      variant="ghost"
                    >
                      <MoveUp />
                    </Button>
                    <Button
                      disabled={
                        isTeamsLocked ||
                        index === values.teams.createTeams.length - 1
                      }
                      onClick={() => moveInlineTeam(index, "down")}
                      size="icon-sm"
                      type="button"
                      variant="ghost"
                    >
                      <MoveDown />
                    </Button>
                    <Button
                      disabled={isTeamsLocked}
                      onClick={() => removeInlineTeam(index)}
                      size="icon-sm"
                      type="button"
                      variant="ghost"
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderStructureStep = () => {
    return (
      <div className="space-y-5">
        {props.lockReasons?.structureLocked ? (
          <FieldError className="rounded border border-amber-500/40 bg-amber-500/5 p-3 text-amber-700 text-sm">
            {props.lockReasons.structureLocked}
          </FieldError>
        ) : null}
        {props.lockReasons?.structureUnsupported ? (
          <FieldError className="rounded border border-amber-500/40 bg-amber-500/5 p-3 text-amber-700 text-sm">
            {props.lockReasons.structureUnsupported}
          </FieldError>
        ) : null}

        <div className="grid gap-5 md:grid-cols-3">
          <Field className="md:col-span-2">
            <FieldLabel htmlFor="template">Template</FieldLabel>
            <Select
              onValueChange={(value) => {
                if (!value) {
                  return;
                }

                updateStructureTemplate(value as TournamentTemplateKind);
              }}
              value={values.structure.template}
            >
              <SelectTrigger disabled={isStructureReadOnly} id="template">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {templateOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="derived-type">Tournament Type</FieldLabel>
            <Input
              disabled
              id="derived-type"
              value={getTournamentTypeForTemplate(values.structure.template)}
            />
          </Field>
        </div>

        {values.structure.template === "grouped_league_with_playoffs" ? (
          <div className="grid gap-5 md:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="group-count">Group Count</FieldLabel>
              <Input
                disabled={isStructureReadOnly}
                id="group-count"
                max={8}
                min={1}
                onChange={(event) => {
                  const parsed = Number.parseInt(event.target.value, 10);
                  if (Number.isNaN(parsed)) {
                    return;
                  }

                  updateGroupedStructureConfig({ groupCount: parsed });
                }}
                type="number"
                value={String(values.structure.groupCount)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="advancing-per-group">
                Advancing Per Group
              </FieldLabel>
              <Input
                disabled={isStructureReadOnly}
                id="advancing-per-group"
                max={8}
                min={1}
                onChange={(event) => {
                  const parsed = Number.parseInt(event.target.value, 10);
                  if (Number.isNaN(parsed)) {
                    return;
                  }

                  updateGroupedStructureConfig({ advancingPerGroup: parsed });
                }}
                type="number"
                value={String(values.structure.advancingPerGroup)}
              />
            </Field>
          </div>
        ) : null}

        <div className="space-y-4 rounded-lg border p-4">
          <h3 className="font-medium text-sm">Stage Edits</h3>
          {values.structure.stageEdits.map((stage) => (
            <div className="grid gap-3 md:grid-cols-3" key={stage.sequence}>
              <Field>
                <FieldLabel>Stage #{stage.sequence} Name</FieldLabel>
                <Input
                  disabled={isStructureReadOnly}
                  onChange={(event) =>
                    updateStageEdit(stage.sequence, "name", event.target.value)
                  }
                  value={stage.name}
                />
              </Field>
              <Field>
                <FieldLabel>Stage #{stage.sequence} Code</FieldLabel>
                <Input
                  disabled={isStructureReadOnly}
                  onChange={(event) =>
                    updateStageEdit(stage.sequence, "code", event.target.value)
                  }
                  value={stage.code ?? ""}
                />
              </Field>
            </div>
          ))}
        </div>

        {values.structure.groupEdits.length > 0 ? (
          <div className="space-y-4 rounded-lg border p-4">
            <h3 className="font-medium text-sm">Group Edits</h3>
            {values.structure.groupEdits.map((group) => (
              <div
                className="grid gap-3 md:grid-cols-4"
                key={`${group.stageSequence}:${group.sequence}`}
              >
                <Field>
                  <FieldLabel>
                    Stage {group.stageSequence} Group {group.sequence} Name
                  </FieldLabel>
                  <Input
                    disabled={isStructureReadOnly}
                    onChange={(event) =>
                      updateGroupEdit(group.stageSequence, group.sequence, {
                        name: event.target.value,
                      })
                    }
                    value={group.name}
                  />
                </Field>
                <Field>
                  <FieldLabel>Code</FieldLabel>
                  <Input
                    disabled={isStructureReadOnly}
                    onChange={(event) =>
                      updateGroupEdit(group.stageSequence, group.sequence, {
                        code: event.target.value,
                      })
                    }
                    value={group.code ?? ""}
                  />
                </Field>
                <Field>
                  <FieldLabel>Advancing Slots</FieldLabel>
                  <Input
                    disabled={isStructureReadOnly}
                    min={0}
                    onChange={(event) => {
                      const parsed = Number.parseInt(event.target.value, 10);
                      if (Number.isNaN(parsed)) {
                        return;
                      }

                      updateGroupEdit(group.stageSequence, group.sequence, {
                        advancingSlots: parsed,
                      });
                    }}
                    type="number"
                    value={String(group.advancingSlots ?? 0)}
                  />
                </Field>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    );
  };

  const renderReviewStep = () => {
    const totalTeams =
      values.teams.existingTeamIds.length + values.teams.createTeams.length;

    return (
      <div className="space-y-5">
        <Card className="rounded-lg border">
          <CardContent className="space-y-3 p-4">
            <h3 className="font-medium text-sm">Tournament Summary</h3>
            <div className="grid gap-2 text-sm md:grid-cols-2">
              <p>
                <span className="text-muted-foreground">Name: </span>
                {values.name || "-"}
              </p>
              <p>
                <span className="text-muted-foreground">Season: </span>
                {values.season || "-"}
              </p>
              <p>
                <span className="text-muted-foreground">Category: </span>
                {values.category}
              </p>
              <p>
                <span className="text-muted-foreground">Gender: </span>
                {values.genderAllowed}
              </p>
              <p>
                <span className="text-muted-foreground">Age Limit: </span>
                {values.ageLimit}
              </p>
              <p>
                <span className="text-muted-foreground">Time Zone: </span>
                {values.advanced.timeZone || "-"}
              </p>
              <p>
                <span className="text-muted-foreground">Type: </span>
                {getTournamentTypeForTemplate(values.structure.template)}
              </p>
              <p>
                <span className="text-muted-foreground">Teams: </span>
                {totalTeams}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-lg border">
          <CardContent className="space-y-3 p-4">
            <h3 className="font-medium text-sm">Structure Summary</h3>
            <p className="text-muted-foreground text-sm">
              Template: {values.structure.template}
            </p>
            {values.structure.template === "grouped_league_with_playoffs" ? (
              <p className="text-muted-foreground text-sm">
                {values.structure.groupCount} groups,{" "}
                {values.structure.advancingPerGroup} teams advance per group
              </p>
            ) : null}
            <ul className="space-y-2 text-sm">
              {values.structure.stageEdits.map((stage) => (
                <li
                  className="rounded border px-3 py-2"
                  key={`review-stage-${stage.sequence}`}
                >
                  Stage {stage.sequence}: {stage.name}
                  {stage.code ? ` (${stage.code})` : ""}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background pb-10">
      <div className="mx-auto w-full max-w-4xl space-y-5 px-4 py-6 md:px-6 md:py-8">
        <header className="space-y-1">
          <h1 className="font-semibold text-2xl tracking-tight md:text-3xl">
            {props.heading}
          </h1>
          <p className="text-muted-foreground text-sm md:text-base">
            {props.description}
          </p>
        </header>

        <Card className="rounded-xl">
          <CardHeader className="space-y-4 border-b pb-4">
            <div className="flex flex-wrap gap-2">
              {STEPS.map((step, index) => {
                const isActive = index === currentStep;
                const isCompleted = index < currentStep;
                return (
                  <span
                    className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs"
                    data-active={isActive}
                    data-completed={isCompleted}
                    key={step}
                  >
                    <span className="font-medium">{index + 1}.</span> {step}
                  </span>
                );
              })}
            </div>
            <p className="text-muted-foreground text-sm">
              Step {currentStep + 1} of {STEPS.length}
            </p>
          </CardHeader>
          <CardContent className="space-y-5 pt-5">
            {props.isLookupLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : null}

            {!props.isLookupLoading && currentStep === 0
              ? renderBasicsStep()
              : null}
            {!props.isLookupLoading && currentStep === 1
              ? renderTeamsStep()
              : null}
            {!props.isLookupLoading && currentStep === 2
              ? renderStructureStep()
              : null}
            {!props.isLookupLoading && currentStep === 3
              ? renderReviewStep()
              : null}

            {globalError ? (
              <FieldError className="rounded border border-destructive/40 bg-destructive/5 p-3 text-sm">
                {globalError}
              </FieldError>
            ) : null}

            <FieldDescription>
              Fixture generation is not part of this flow. You can generate
              fixtures after tournament{" "}
              {props.mode === "create" ? "creation" : "updates"}.
            </FieldDescription>

            <div className="flex flex-wrap gap-2 border-t pt-4">
              <Button
                onClick={props.onCancel}
                size="sm"
                type="button"
                variant="outline"
              >
                <ArrowLeft />
                {props.cancelLabel ?? "Cancel"}
              </Button>

              {currentStep > 0 ? (
                <Button
                  onClick={() => {
                    setGlobalError(null);
                    setCurrentStep((previous) => previous - 1);
                  }}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <ArrowLeft />
                  {props.backLabel ?? "Back"}
                </Button>
              ) : null}

              {currentStep < STEPS.length - 1 ? (
                <Button
                  onClick={() => {
                    if (!validateCurrentStep()) {
                      return;
                    }

                    setCurrentStep((previous) => previous + 1);
                  }}
                  size="sm"
                  type="button"
                >
                  Next
                  <ArrowRight />
                </Button>
              ) : (
                <Button
                  disabled={props.submitting}
                  onClick={submitTournament}
                  size="sm"
                  type="button"
                >
                  <Trophy />
                  {props.submitting
                    ? props.submitBusyLabel
                    : props.submitIdleLabel}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
