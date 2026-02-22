import type { Player, PlayerWithCurrentTeams } from "@cricket247/server/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ChevronDown,
  FilterX,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { PlayerImageUploadInput } from "@/components/player-image-upload-input";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
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
import { authClient } from "@/lib/auth-client";
import { COUNTRIES } from "@/lib/constants";
import { uploadProfileImage } from "@/lib/profile-image-upload";
import { cn, getInitials } from "@/lib/utils";
import { client, orpc } from "@/utils/orpc";

import { Route as createPlayerRoute } from "./create";

const DEFAULT_BATTING_FILTER = "all";
const DEFAULT_WICKET_KEEPER_FILTER = "all";
const DEFAULT_SORT = "name-asc";
const UNSPECIFIED_NATIONALITY = "unspecified";
const DATE_FROM_SECONDS_THRESHOLD = 1_000_000_000_000;
const SECONDS_TO_MILLISECONDS = 1000;
const EXPANDED_SKELETON_ROWS = 6;

const battingStanceValues = ["Right handed", "Left handed"] as const;
const playerSexValues = [
  "Male",
  "Female",
  "Other",
  "Prefer not to say",
] as const;
const playerRoleValues = [
  "Batter",
  "Bowler",
  "All-rounder",
  "Wicket Keeper",
] as const;

type SortOption = "name-asc" | "name-desc" | "age-asc" | "age-desc";
type PlayerSex = (typeof playerSexValues)[number];
type PlayerRole = (typeof playerRoleValues)[number];
type BattingStance = (typeof battingStanceValues)[number];
type Country = (typeof COUNTRIES)[number];

const getDefaultDob = () => {
  const date = new Date();
  date.setFullYear(date.getFullYear() - 18);
  return date;
};

const formatDateInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const parseDateInputValue = (value: string) => {
  const parsedDate = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return parsedDate;
};

const parseOptionalInteger = (value: string) => {
  if (value.trim().length === 0) {
    return undefined;
  }

  const parsedValue = Number.parseInt(value, 10);
  if (Number.isNaN(parsedValue)) {
    return undefined;
  }

  return parsedValue;
};

const calculateAgeFromDob = (dob: Date) => {
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDifference = today.getMonth() - dob.getMonth();
  const hasNotHadBirthdayYet =
    monthDifference < 0 ||
    (monthDifference === 0 && today.getDate() < dob.getDate());

  if (hasNotHadBirthdayYet) {
    age -= 1;
  }

  return Math.max(age, 0);
};

const isValidUrl = (value: string) => {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
};

const isCountry = (value: string): value is Country =>
  COUNTRIES.includes(value as Country);

const normalizeSex = (value: string | null | undefined): PlayerSex => {
  const resolved = playerSexValues.find((item) => item === value);
  return resolved ?? "Prefer not to say";
};

const normalizeRole = (value: string | null | undefined): PlayerRole => {
  const resolved = playerRoleValues.find((item) => item === value);
  return resolved ?? "Batter";
};

const normalizeBattingStance = (
  value: string | null | undefined
): BattingStance => {
  const resolved = battingStanceValues.find((item) => item === value);
  return resolved ?? "Right handed";
};

const resolveNumberTimestamp = (value: number) => {
  const normalizedValue =
    value < DATE_FROM_SECONDS_THRESHOLD
      ? value * SECONDS_TO_MILLISECONDS
      : value;
  return new Date(normalizedValue);
};

const resolvePlayerDob = (value: Player["dob"]) => {
  if (value instanceof Date) {
    return value;
  }

  if (typeof value === "number") {
    const parsed = resolveNumberTimestamp(value);
    return Number.isNaN(parsed.getTime()) ? getDefaultDob() : parsed;
  }

  if (typeof value === "string") {
    const numericValue = Number(value);
    if (!Number.isNaN(numericValue)) {
      const parsedNumericDate = resolveNumberTimestamp(numericValue);
      if (!Number.isNaN(parsedNumericDate.getTime())) {
        return parsedNumericDate;
      }
    }

    const parsedDate = new Date(value);
    if (!Number.isNaN(parsedDate.getTime())) {
      return parsedDate;
    }
  }

  return getDefaultDob();
};

const getNationalityLabel = (value: string | null | undefined) => {
  return value?.trim().length ? value : "Not specified";
};

const getCurrentTeamsSummary = (
  currentTeams: PlayerWithCurrentTeams["currentTeams"]
) => {
  if (currentTeams.length === 0) {
    return "Unregistered in live tournaments";
  }

  return currentTeams
    .map(
      (currentTeam) =>
        `${currentTeam.teamShortName} • ${currentTeam.tournamentName}`
    )
    .join(", ");
};

const playerEditSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Player name must be at least 2 characters")
    .max(100, "Player name must be at most 100 characters"),
  dob: z.date().max(new Date(), "Date of birth cannot be in the future"),
  sex: z.enum(playerSexValues),
  nationality: z.enum(COUNTRIES).optional(),
  height: z
    .number()
    .int("Height must be a whole number")
    .min(1, "Height must be at least 1 cm")
    .max(300, "Height must be at most 300 cm")
    .optional(),
  weight: z
    .number()
    .int("Weight must be a whole number")
    .min(1, "Weight must be at least 1 kg")
    .max(250, "Weight must be at most 250 kg")
    .optional(),
  image: z
    .string()
    .trim()
    .max(2048, "Image URL is too long")
    .optional()
    .refine(
      (value) => value === undefined || value.length === 0 || isValidUrl(value),
      "Image must be a valid URL"
    ),
  role: z.enum(playerRoleValues),
  battingStance: z.enum(battingStanceValues),
  bowlingStance: z
    .string()
    .trim()
    .max(100, "Bowling stance must be at most 100 characters")
    .optional(),
});

type PlayerDraft = z.infer<typeof playerEditSchema>;
type UpdatePlayerInput = Parameters<typeof client.updatePlayer>[0];

const createPlayerDraft = (player: PlayerWithCurrentTeams): PlayerDraft => {
  const nationality =
    typeof player.nationality === "string" && isCountry(player.nationality)
      ? player.nationality
      : undefined;

  return {
    name: player.name,
    dob: resolvePlayerDob(player.dob),
    sex: normalizeSex(player.sex),
    nationality,
    height: typeof player.height === "number" ? player.height : undefined,
    weight: typeof player.weight === "number" ? player.weight : undefined,
    image: player.image ?? "",
    role: normalizeRole(player.role),
    battingStance: normalizeBattingStance(player.battingStance),
    bowlingStance: player.bowlingStance ?? "",
  };
};

export const Route = createFileRoute("/players/")({
  component: RouteComponent,
});

function RouteComponent() {
  const queryClient = useQueryClient();
  const { data: session } = authClient.useSession();
  const isAdmin =
    (session?.user as { role?: string } | undefined)?.role === "admin";

  const [searchQuery, setSearchQuery] = useState("");
  const [battingFilter, setBattingFilter] = useState(DEFAULT_BATTING_FILTER);
  const [wicketKeeperFilter, setWicketKeeperFilter] = useState(
    DEFAULT_WICKET_KEEPER_FILTER
  );
  const [sortBy, setSortBy] = useState<SortOption>(DEFAULT_SORT);
  const [expandedPlayerId, setExpandedPlayerId] = useState<number | null>(null);
  const [editingPlayerId, setEditingPlayerId] = useState<number | null>(null);
  const [editingDraft, setEditingDraft] = useState<PlayerDraft | null>(null);
  const [uploadedEditImageName, setUploadedEditImageName] = useState("");
  const [activeDeleteId, setActiveDeleteId] = useState<number | null>(null);
  const [activeUpdateId, setActiveUpdateId] = useState<number | null>(null);
  const [pendingDeletePlayer, setPendingDeletePlayer] =
    useState<PlayerWithCurrentTeams | null>(null);

  const { data: players = [], isLoading } = useQuery(
    orpc.playersWithCurrentTeams.queryOptions()
  );

  const updatePlayerMutation = useMutation({
    mutationFn: async (input: UpdatePlayerInput) => client.updatePlayer(input),
    onMutate: ({ id }) => {
      setActiveUpdateId(id);
    },
    onSuccess: async () => {
      toast.success("Player updated");
      setEditingPlayerId(null);
      setEditingDraft(null);
      await queryClient.invalidateQueries();
    },
    onError: () => {
      toast.error("Failed to update player");
    },
    onSettled: () => {
      setActiveUpdateId(null);
    },
  });

  const deletePlayerMutation = useMutation({
    mutationFn: async (id: number) => client.deletePlayer(id),
    onMutate: (id) => {
      setActiveDeleteId(id);
    },
    onSuccess: async (_, deletedId) => {
      toast.success("Player deleted");
      setPendingDeletePlayer(null);

      if (expandedPlayerId === deletedId) {
        setExpandedPlayerId(null);
      }

      if (editingPlayerId === deletedId) {
        setEditingPlayerId(null);
        setEditingDraft(null);
      }

      await queryClient.invalidateQueries();
    },
    onError: () => {
      toast.error("Failed to delete player");
    },
    onSettled: () => {
      setActiveDeleteId(null);
    },
  });

  const uploadImageMutation = useMutation({
    mutationFn: async (file: File) => uploadProfileImage(file),
    onError: (error) => {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to upload image";
      toast.error(errorMessage);
    },
  });

  const battingStanceOptions = useMemo(() => {
    return Array.from(
      new Set(players.map((player) => player.battingStance))
    ).sort((first, second) => first.localeCompare(second));
  }, [players]);

  const filteredPlayers = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    const filtered = players.filter((player) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        player.name.toLowerCase().includes(normalizedSearch) ||
        player.role.toLowerCase().includes(normalizedSearch) ||
        player.battingStance.toLowerCase().includes(normalizedSearch) ||
        (player.bowlingStance ?? "").toLowerCase().includes(normalizedSearch) ||
        (player.nationality ?? "").toLowerCase().includes(normalizedSearch);

      const matchesBattingFilter =
        battingFilter === DEFAULT_BATTING_FILTER ||
        player.battingStance === battingFilter;

      let matchesWicketKeeperFilter = true;
      if (wicketKeeperFilter === "yes") {
        matchesWicketKeeperFilter = player.isWicketKeeper;
      }
      if (wicketKeeperFilter === "no") {
        matchesWicketKeeperFilter = !player.isWicketKeeper;
      }

      return matchesSearch && matchesBattingFilter && matchesWicketKeeperFilter;
    });

    const sorted = [...filtered];
    if (sortBy === "name-asc") {
      sorted.sort((first, second) => first.name.localeCompare(second.name));
    }
    if (sortBy === "name-desc") {
      sorted.sort((first, second) => second.name.localeCompare(first.name));
    }
    if (sortBy === "age-asc") {
      sorted.sort((first, second) => first.age - second.age);
    }
    if (sortBy === "age-desc") {
      sorted.sort((first, second) => second.age - first.age);
    }

    return sorted;
  }, [players, searchQuery, battingFilter, wicketKeeperFilter, sortBy]);

  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    battingFilter !== DEFAULT_BATTING_FILTER ||
    wicketKeeperFilter !== DEFAULT_WICKET_KEEPER_FILTER ||
    sortBy !== DEFAULT_SORT;

  const handleResetFilters = () => {
    setSearchQuery("");
    setBattingFilter(DEFAULT_BATTING_FILTER);
    setWicketKeeperFilter(DEFAULT_WICKET_KEEPER_FILTER);
    setSortBy(DEFAULT_SORT);
  };

  const handleToggleExpand = (playerId: number) => {
    if (editingPlayerId === playerId && editingDraft) {
      return;
    }

    if (editingPlayerId !== null && editingPlayerId !== playerId) {
      setEditingPlayerId(null);
      setEditingDraft(null);
    }

    setExpandedPlayerId((current) => (current === playerId ? null : playerId));
  };

  const handleEditStart = (player: PlayerWithCurrentTeams) => {
    setEditingPlayerId(player.id);
    setExpandedPlayerId(player.id);
    setEditingDraft(createPlayerDraft(player));
    setUploadedEditImageName("");
  };

  const handleEditCancel = () => {
    if (activeUpdateId !== null) {
      return;
    }

    setEditingPlayerId(null);
    setEditingDraft(null);
    setUploadedEditImageName("");
  };

  const handleSaveEdit = () => {
    if (!editingDraft || editingPlayerId === null) {
      return;
    }

    const parsedDraft = playerEditSchema.safeParse(editingDraft);
    if (!parsedDraft.success) {
      const firstIssue = parsedDraft.error.issues.at(0);
      toast.error(firstIssue?.message ?? "Please review form fields");
      return;
    }

    const normalizedBowlingStance =
      parsedDraft.data.bowlingStance?.trim() ?? "";
    const normalizedImage = parsedDraft.data.image?.trim() ?? "";

    updatePlayerMutation.mutate({
      id: editingPlayerId,
      data: {
        ...parsedDraft.data,
        age: calculateAgeFromDob(parsedDraft.data.dob),
        isWicketKeeper: parsedDraft.data.role === "Wicket Keeper",
        name: parsedDraft.data.name.trim(),
        bowlingStance:
          normalizedBowlingStance.length > 0
            ? normalizedBowlingStance
            : undefined,
        image: normalizedImage.length > 0 ? normalizedImage : undefined,
      },
    });
  };

  const handleDraftChange = <K extends keyof PlayerDraft>(
    key: K,
    value: PlayerDraft[K]
  ) => {
    setEditingDraft((draft) =>
      draft
        ? {
            ...draft,
            [key]: value,
          }
        : draft
    );
  };

  const handleDelete = (player: PlayerWithCurrentTeams) => {
    setPendingDeletePlayer(player);
  };

  const handleEditImageSelect = async (file: File) => {
    const uploadResult = await uploadImageMutation.mutateAsync(file);
    handleDraftChange("image", uploadResult.url);
    setUploadedEditImageName(file.name);
  };

  const handleConfirmDelete = () => {
    if (!pendingDeletePlayer) {
      return;
    }

    deletePlayerMutation.mutate(pendingDeletePlayer.id);
  };

  const isDeleteDialogOpen = pendingDeletePlayer !== null;
  const isConfirmDeletePending =
    pendingDeletePlayer !== null && activeDeleteId === pendingDeletePlayer.id;

  const hasPlayers = players.length > 0;
  const hasFilteredPlayers = filteredPlayers.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 md:px-6 md:py-8">
        <header className="space-y-2">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1">
              <h1 className="font-semibold text-2xl tracking-tight md:text-3xl">
                Players
              </h1>
              <p className="text-muted-foreground text-sm md:text-base">
                Browse, search, and manage player profiles.
              </p>
            </div>
            {isAdmin ? (
              <Link className={buttonVariants()} to="/players/create">
                <Plus />
                Add Player
              </Link>
            ) : null}
          </div>
        </header>

        <section className="space-y-4 rounded-xl border bg-card p-4 shadow-sm md:p-5">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_210px_200px_190px_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="Search players"
                className="pl-8"
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by name or style..."
                value={searchQuery}
              />
            </div>

            <Select
              onValueChange={(value) => {
                if (value) {
                  setBattingFilter(value);
                }
              }}
              value={battingFilter}
            >
              <SelectTrigger
                aria-label="Filter by batting stance"
                className="w-full"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={DEFAULT_BATTING_FILTER}>
                  All batting
                </SelectItem>
                {battingStanceOptions.map((stance) => (
                  <SelectItem key={stance} value={stance}>
                    {stance}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              onValueChange={(value) => {
                if (value) {
                  setWicketKeeperFilter(value);
                }
              }}
              value={wicketKeeperFilter}
            >
              <SelectTrigger
                aria-label="Filter by wicket keeper"
                className="w-full"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={DEFAULT_WICKET_KEEPER_FILTER}>
                  All roles
                </SelectItem>
                <SelectItem value="yes">Wicket keepers</SelectItem>
                <SelectItem value="no">Non keepers</SelectItem>
              </SelectContent>
            </Select>

            <Select
              onValueChange={(value) => {
                if (value) {
                  setSortBy(value as SortOption);
                }
              }}
              value={sortBy}
            >
              <SelectTrigger aria-label="Sort players" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name-asc">Name A-Z</SelectItem>
                <SelectItem value="name-desc">Name Z-A</SelectItem>
                <SelectItem value="age-asc">Age low-high</SelectItem>
                <SelectItem value="age-desc">Age high-low</SelectItem>
              </SelectContent>
            </Select>

            <Button
              className="justify-start md:justify-center"
              disabled={!hasActiveFilters}
              onClick={handleResetFilters}
              size="sm"
              type="button"
              variant="ghost"
            >
              <FilterX />
              Reset
            </Button>
          </div>

          <div className="flex min-h-6 items-center justify-between text-muted-foreground text-sm">
            <span>
              Showing {filteredPlayers.length} of {players.length} players
            </span>
            {isAdmin ? <span>Admin mode</span> : null}
          </div>
        </section>

        {isLoading ? <AccordionSkeletonList /> : null}

        {isLoading || hasPlayers ? null : (
          <section className="rounded-xl border border-dashed bg-card p-10 text-center">
            <h2 className="font-medium text-lg">No players found</h2>
            <p className="mt-1 text-muted-foreground text-sm">
              <Link to={createPlayerRoute.to}>Add players</Link> to start
              building your squad.
            </p>
          </section>
        )}

        {!isLoading && hasPlayers && !hasFilteredPlayers ? (
          <section className="rounded-xl border border-dashed bg-card p-10 text-center">
            <h2 className="font-medium text-lg">No results</h2>
            <p className="mt-1 text-muted-foreground text-sm">
              No players matched the current search and filters.
            </p>
            <div className="mt-5">
              <Button onClick={handleResetFilters} size="sm" variant="outline">
                <X />
                Clear filters
              </Button>
            </div>
          </section>
        ) : null}

        {!isLoading && hasFilteredPlayers ? (
          <section className="overflow-hidden rounded-xl border bg-card">
            <div className="hidden grid-cols-[minmax(0,1.8fr)_150px_90px_minmax(0,1.3fr)_minmax(0,2fr)_36px] items-center gap-4 border-b bg-muted/30 px-5 py-2.5 md:grid">
              <span className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
                Name
              </span>
              <span className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
                Role
              </span>
              <span className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
                Age
              </span>
              <span className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
                Nationality
              </span>
              <span className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
                Current Teams
              </span>
              <span className="sr-only">Toggle details</span>
            </div>

            {filteredPlayers.map((player, index) => (
              <PlayerAccordionRow
                draft={editingPlayerId === player.id ? editingDraft : null}
                hasBottomBorder={index < filteredPlayers.length - 1}
                isAdmin={isAdmin}
                isExpanded={expandedPlayerId === player.id}
                isPending={
                  activeDeleteId === player.id ||
                  activeUpdateId === player.id ||
                  (uploadImageMutation.isPending &&
                    editingPlayerId === player.id)
                }
                key={player.id}
                onCancelEdit={handleEditCancel}
                onDelete={() => handleDelete(player)}
                onDraftChange={handleDraftChange}
                onEditImageSelect={handleEditImageSelect}
                onEditStart={() => handleEditStart(player)}
                onSaveEdit={handleSaveEdit}
                onToggleExpand={() => handleToggleExpand(player.id)}
                player={player}
                uploadedImageName={uploadedEditImageName}
                uploadImagePending={
                  uploadImageMutation.isPending && editingPlayerId === player.id
                }
              />
            ))}
          </section>
        ) : null}
      </div>

      <Dialog
        onOpenChange={(open) => {
          if (!(open || isConfirmDeletePending)) {
            setPendingDeletePlayer(null);
          }
        }}
        open={isDeleteDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete player?</DialogTitle>
            <DialogDescription>
              {pendingDeletePlayer
                ? `This will permanently delete ${pendingDeletePlayer.name}. This action cannot be undone.`
                : "This action cannot be undone."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              disabled={isConfirmDeletePending}
              onClick={() => setPendingDeletePlayer(null)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={isConfirmDeletePending}
              onClick={handleConfirmDelete}
              type="button"
              variant="destructive"
            >
              {isConfirmDeletePending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface PlayerDetailsPanelProps {
  isAdmin: boolean;
  isPending: boolean;
  onDelete: () => void;
  onEdit: () => void;
  player: PlayerWithCurrentTeams;
}

interface PlayerAccordionRowProps {
  draft: PlayerDraft | null;
  hasBottomBorder: boolean;
  isAdmin: boolean;
  isExpanded: boolean;
  isPending: boolean;
  onCancelEdit: () => void;
  onDelete: () => void;
  onDraftChange: <K extends keyof PlayerDraft>(
    key: K,
    value: PlayerDraft[K]
  ) => void;
  onEditImageSelect: (file: File) => Promise<void>;
  onEditStart: () => void;
  onSaveEdit: () => void;
  onToggleExpand: () => void;
  player: PlayerWithCurrentTeams;
  uploadedImageName: string;
  uploadImagePending: boolean;
}

function PlayerAccordionRow({
  draft,
  hasBottomBorder,
  isAdmin,
  isExpanded,
  isPending,
  onCancelEdit,
  onDelete,
  onDraftChange,
  onEditImageSelect,
  onEditStart,
  onSaveEdit,
  onToggleExpand,
  player,
  uploadedImageName,
  uploadImagePending,
}: PlayerAccordionRowProps) {
  return (
    <article className={cn(hasBottomBorder ? "border-b" : null)}>
      <button
        aria-controls={`player-panel-${String(player.id)}`}
        aria-expanded={isExpanded}
        className={cn(
          "w-full px-4 py-3 text-left transition-colors md:px-5",
          isPending ? "opacity-60" : null,
          isExpanded ? "bg-muted/20" : "hover:bg-muted/10"
        )}
        onClick={onToggleExpand}
        type="button"
      >
        <div className="hidden grid-cols-[minmax(0,1.8fr)_150px_90px_minmax(0,1.3fr)_minmax(0,2fr)_36px] items-center gap-4 md:grid">
          <div className="flex items-center gap-3 overflow-hidden">
            {player.image ? (
              <img
                alt={player.name}
                className="size-8 shrink-0 rounded-full object-cover"
                height={32}
                src={player.image}
                width={32}
              />
            ) : (
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 font-medium text-primary text-xs">
                {getInitials(player.name)}
              </div>
            )}
            <span className="truncate font-medium">{player.name}</span>
          </div>
          <span className="truncate">{normalizeRole(player.role)}</span>
          <span>{player.age}</span>
          <span className="truncate">
            {getNationalityLabel(player.nationality)}
          </span>
          <span className="truncate text-muted-foreground text-sm">
            {getCurrentTeamsSummary(player.currentTeams)}
          </span>
          <ChevronDown
            className={cn(
              "ml-auto size-4 transition-transform",
              isExpanded ? "rotate-180" : null
            )}
          />
        </div>

        <div className="space-y-2 md:hidden">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 overflow-hidden">
              {player.image ? (
                <img
                  alt={player.name}
                  className="size-8 shrink-0 rounded-full object-cover"
                  height={32}
                  src={player.image}
                  width={32}
                />
              ) : (
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 font-medium text-primary text-xs">
                  {getInitials(player.name)}
                </div>
              )}
              <span className="truncate font-medium text-base">
                {player.name}
              </span>
            </div>
            <ChevronDown
              className={cn(
                "size-4 shrink-0 transition-transform",
                isExpanded ? "rotate-180" : null
              )}
            />
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground text-xs">Role</span>
              <p className="truncate">{normalizeRole(player.role)}</p>
            </div>
            <div>
              <span className="text-muted-foreground text-xs">Age</span>
              <p>{player.age}</p>
            </div>
            <div className="col-span-2">
              <span className="text-muted-foreground text-xs">Nationality</span>
              <p className="truncate">
                {getNationalityLabel(player.nationality)}
              </p>
            </div>
            <div className="col-span-2">
              <span className="text-muted-foreground text-xs">
                Current Teams
              </span>
              <p className="truncate">
                {getCurrentTeamsSummary(player.currentTeams)}
              </p>
            </div>
          </div>
        </div>
      </button>

      {isExpanded ? (
        <div
          className="border-t bg-muted/10 px-4 py-4 md:px-5"
          id={`player-panel-${String(player.id)}`}
        >
          {draft ? (
            <PlayerEditPanel
              draft={draft}
              isPending={isPending}
              onCancel={onCancelEdit}
              onDraftChange={onDraftChange}
              onEditImageSelect={onEditImageSelect}
              onSave={onSaveEdit}
              uploadedImageName={uploadedImageName}
              uploadImagePending={uploadImagePending}
            />
          ) : (
            <PlayerDetailsPanel
              isAdmin={isAdmin}
              isPending={isPending}
              onDelete={onDelete}
              onEdit={onEditStart}
              player={player}
            />
          )}
        </div>
      ) : null}
    </article>
  );
}

function PlayerDetailsPanel({
  isAdmin,
  isPending,
  onDelete,
  onEdit,
  player,
}: PlayerDetailsPanelProps) {
  return (
    <div className="space-y-4">
      <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
        <DetailItem label="Batting Style" value={player.battingStance} />
        <DetailItem
          label="Bowling Style"
          value={player.bowlingStance ?? "Not specified"}
        />
      </dl>

      <section className="space-y-2">
        <h3 className="font-medium text-sm">
          Current Teams (Live Tournaments)
        </h3>
        {player.currentTeams.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {player.currentTeams.map((currentTeam) => (
              <li
                className="rounded-full border bg-background px-3 py-1 text-xs"
                key={`${String(currentTeam.tournamentId)}-${String(currentTeam.teamId)}`}
              >
                {currentTeam.teamShortName} • {currentTeam.tournamentName}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground text-sm">
            Unregistered in live tournaments
          </p>
        )}
      </section>

      {isAdmin ? (
        <div className="flex flex-wrap items-center justify-end gap-2 border-t pt-3">
          <Button
            disabled={isPending}
            onClick={onDelete}
            type="button"
            variant="destructive"
          >
            <Trash2 />
            Delete
          </Button>
          <Button
            className="flex-1 md:flex-none"
            disabled={isPending}
            onClick={onEdit}
            type="button"
            variant="outline"
          >
            <Pencil />
            Edit
          </Button>
        </div>
      ) : null}
    </div>
  );
}

interface DetailItemProps {
  label: string;
  value: string;
}

function DetailItem({ label, value }: DetailItemProps) {
  return (
    <div className="space-y-1 rounded-md border bg-background p-3">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="wrap-break-word font-medium text-sm">{value}</dd>
    </div>
  );
}

interface PlayerEditPanelProps {
  draft: PlayerDraft;
  isPending: boolean;
  onCancel: () => void;
  onDraftChange: <K extends keyof PlayerDraft>(
    key: K,
    value: PlayerDraft[K]
  ) => void;
  onEditImageSelect: (file: File) => Promise<void>;
  onSave: () => void;
  uploadedImageName: string;
  uploadImagePending: boolean;
}

function PlayerEditPanel({
  draft,
  isPending,
  onCancel,
  onDraftChange,
  onEditImageSelect,
  onSave,
  uploadedImageName,
  uploadImagePending,
}: PlayerEditPanelProps) {
  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onSave();
      }}
    >
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="edit-player-name">Player Name</FieldLabel>
          <Input
            autoComplete="name"
            id="edit-player-name"
            onChange={(event) => onDraftChange("name", event.target.value)}
            placeholder="e.g. Virat Kohli"
            value={draft.name}
          />
        </Field>
      </FieldGroup>

      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="edit-player-dob">Date of Birth</FieldLabel>
          <Input
            id="edit-player-dob"
            onChange={(event) => {
              const parsedDate = parseDateInputValue(event.target.value);
              if (parsedDate) {
                onDraftChange("dob", parsedDate);
              }
            }}
            type="date"
            value={formatDateInputValue(draft.dob)}
          />
        </Field>
      </FieldGroup>

      <div className="grid gap-5 md:grid-cols-2">
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="edit-player-sex">Sex</FieldLabel>
            <Select
              onValueChange={(value) => {
                if (value) {
                  onDraftChange("sex", value as PlayerSex);
                }
              }}
              value={draft.sex}
            >
              <SelectTrigger className="w-full" id="edit-player-sex">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {playerSexValues.map((sex) => (
                  <SelectItem key={sex} value={sex}>
                    {sex}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </FieldGroup>

        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="edit-player-role">Role</FieldLabel>
            <Select
              onValueChange={(value) => {
                if (value) {
                  onDraftChange("role", value as PlayerRole);
                }
              }}
              value={draft.role}
            >
              <SelectTrigger className="w-full" id="edit-player-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {playerRoleValues.map((role) => (
                  <SelectItem key={role} value={role}>
                    {role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </FieldGroup>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="edit-player-batting-stance">
              Batting Stance
            </FieldLabel>
            <Select
              onValueChange={(value) => {
                if (value) {
                  onDraftChange("battingStance", value as BattingStance);
                }
              }}
              value={draft.battingStance}
            >
              <SelectTrigger className="w-full" id="edit-player-batting-stance">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {battingStanceValues.map((stance) => (
                  <SelectItem key={stance} value={stance}>
                    {stance}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </FieldGroup>

        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="edit-player-bowling-stance">
              Bowling Stance
            </FieldLabel>
            <Input
              id="edit-player-bowling-stance"
              onChange={(event) =>
                onDraftChange("bowlingStance", event.target.value)
              }
              placeholder="e.g. Right arm fast"
              value={draft.bowlingStance ?? ""}
            />
            <FieldDescription>
              Leave empty if the player does not bowl.
            </FieldDescription>
          </Field>
        </FieldGroup>
      </div>

      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="edit-player-nationality">Nationality</FieldLabel>
          <Select
            onValueChange={(value) => {
              if (value && value !== UNSPECIFIED_NATIONALITY) {
                onDraftChange("nationality", value as Country);
                return;
              }

              onDraftChange("nationality", undefined);
            }}
            value={draft.nationality ?? UNSPECIFIED_NATIONALITY}
          >
            <SelectTrigger className="w-full" id="edit-player-nationality">
              <SelectValue placeholder="Select nationality" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={UNSPECIFIED_NATIONALITY}>
                Not specified
              </SelectItem>
              {COUNTRIES.map((country) => (
                <SelectItem key={country} value={country}>
                  {country}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldDescription>
            Choose a country from the global country list.
          </FieldDescription>
        </Field>
      </FieldGroup>

      <div className="grid gap-5 md:grid-cols-2">
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="edit-player-height">Height (cm)</FieldLabel>
            <Input
              id="edit-player-height"
              min={1}
              onChange={(event) =>
                onDraftChange(
                  "height",
                  parseOptionalInteger(event.target.value)
                )
              }
              placeholder="e.g. 175"
              type="number"
              value={draft.height ?? ""}
            />
            <FieldDescription>Optional</FieldDescription>
          </Field>
        </FieldGroup>

        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="edit-player-weight">Weight (kg)</FieldLabel>
            <Input
              id="edit-player-weight"
              min={1}
              onChange={(event) =>
                onDraftChange(
                  "weight",
                  parseOptionalInteger(event.target.value)
                )
              }
              placeholder="e.g. 72"
              type="number"
              value={draft.weight ?? ""}
            />
            <FieldDescription>Optional</FieldDescription>
          </Field>
        </FieldGroup>
      </div>

      <FieldGroup>
        <Field>
          <PlayerImageUploadInput
            disabled={isPending}
            imageUrl={draft.image ?? ""}
            inputId="edit-player-image"
            isUploading={uploadImagePending}
            onSelectFile={onEditImageSelect}
            uploadedImageName={uploadedImageName}
          />
        </Field>
      </FieldGroup>

      <div className="justify-end-safe flex flex-wrap items-center gap-2 border-t pt-4">
        <Button
          disabled={isPending}
          onClick={onCancel}
          size="sm"
          type="button"
          variant="outline"
        >
          Cancel
        </Button>
        <Button
          className="flex-1 md:flex-none"
          disabled={isPending}
          size="sm"
          type="submit"
        >
          {isPending ? "Saving..." : "Save player"}
        </Button>
      </div>
    </form>
  );
}

function AccordionSkeletonList() {
  const rows = Array.from({ length: EXPANDED_SKELETON_ROWS });

  return (
    <section className="overflow-hidden rounded-xl border bg-card">
      <div className="hidden grid-cols-[minmax(0,2.2fr)_170px_160px_minmax(0,1.8fr)_36px] items-center gap-4 border-b bg-muted/30 px-5 py-2.5 md:grid">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-14" />
        <Skeleton className="h-3 w-20" />
        <Skeleton className="ml-auto size-3 rounded-full" />
      </div>
      {rows.map((_, index) => (
        <div
          className={cn(
            "space-y-3 px-4 py-4 md:px-5",
            index < rows.length - 1 ? "border-b" : null
          )}
          key={`accordion-skeleton-row-${String(index)}`}
        >
          <div className="hidden grid-cols-[minmax(0,2.2fr)_170px_160px_minmax(0,1.8fr)_36px] items-center gap-4 md:grid">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="ml-auto size-4 rounded-full" />
          </div>
          <div className="space-y-2 md:hidden">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-4/5" />
          </div>
        </div>
      ))}
    </section>
  );
}
