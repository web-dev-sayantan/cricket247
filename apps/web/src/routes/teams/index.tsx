import type { Team } from "@cricket247/server/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { FilterX, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { cn } from "@/lib/utils";
import { client, orpc } from "@/utils/orpc";

const DEFAULT_INITIAL_FILTER = "all";
const DEFAULT_SORT = "name-asc";
const DESKTOP_SKELETON_ROWS = 8;
const MOBILE_SKELETON_CARDS = 5;

const DESKTOP_ROW_BASE = "grid items-center gap-4 px-5 py-3";
const DESKTOP_ROW_WITH_ACTIONS = `${DESKTOP_ROW_BASE} grid-cols-[minmax(0,1fr)_120px_180px]`;
const DESKTOP_ROW_NO_ACTIONS = `${DESKTOP_ROW_BASE} grid-cols-[minmax(0,1fr)_120px]`;

type SortOption = "name-asc" | "name-desc" | "short-asc" | "short-desc";

interface TeamDraft {
  name: string;
  shortName: string;
}

interface UpdateTeamPayload {
  name: string;
  shortName: string;
}

export const Route = createFileRoute("/teams/")({
  component: RouteComponent,
});

function RouteComponent() {
  const queryClient = useQueryClient();
  const { data: session } = authClient.useSession();
  const isAdmin =
    (session?.user as { role?: string } | undefined)?.role === "admin";

  const [searchQuery, setSearchQuery] = useState("");
  const [initialFilter, setInitialFilter] = useState(DEFAULT_INITIAL_FILTER);
  const [sortBy, setSortBy] = useState<SortOption>(DEFAULT_SORT);
  const [editingTeamId, setEditingTeamId] = useState<number | null>(null);
  const [editingDraft, setEditingDraft] = useState<TeamDraft | null>(null);
  const [activeDeleteId, setActiveDeleteId] = useState<number | null>(null);
  const [activeUpdateId, setActiveUpdateId] = useState<number | null>(null);
  const [pendingDeleteTeam, setPendingDeleteTeam] = useState<Team | null>(null);

  const { data: teams = [], isLoading } = useQuery(orpc.teams.queryOptions());

  const updateTeamMutation = useMutation({
    mutationFn: async (input: { id: number; data: UpdateTeamPayload }) =>
      client.updateTeam(input),
    onMutate: ({ id }) => {
      setActiveUpdateId(id);
    },
    onSuccess: async () => {
      toast.success("Team updated");
      setEditingTeamId(null);
      setEditingDraft(null);
      await queryClient.invalidateQueries();
    },
    onError: () => {
      toast.error("Failed to update team");
    },
    onSettled: () => {
      setActiveUpdateId(null);
    },
  });

  const deleteTeamMutation = useMutation({
    mutationFn: async (id: number) => client.deleteTeam(id),
    onMutate: (id) => {
      setActiveDeleteId(id);
    },
    onSuccess: async () => {
      toast.success("Team deleted");
      setEditingTeamId(null);
      setEditingDraft(null);
      setPendingDeleteTeam(null);
      await queryClient.invalidateQueries();
    },
    onError: () => {
      toast.error("Failed to delete team");
    },
    onSettled: () => {
      setActiveDeleteId(null);
    },
  });

  const nameInitialOptions = useMemo(() => {
    return Array.from(
      new Set(
        teams
          .map((team) => team.name.trim().charAt(0).toUpperCase())
          .filter((initial) => initial.length > 0)
      )
    ).sort((first, second) => first.localeCompare(second));
  }, [teams]);

  const filteredTeams = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    const filtered = teams.filter((team) => {
      const normalizedName = team.name.toLowerCase();
      const normalizedShortName = team.shortName.toLowerCase();
      const matchesSearch =
        normalizedSearch.length === 0 ||
        normalizedName.includes(normalizedSearch) ||
        normalizedShortName.includes(normalizedSearch);

      const matchesInitial =
        initialFilter === DEFAULT_INITIAL_FILTER ||
        normalizedName.startsWith(initialFilter.toLowerCase());

      return matchesSearch && matchesInitial;
    });

    const sorted = [...filtered];
    if (sortBy === "name-asc") {
      sorted.sort((first, second) => first.name.localeCompare(second.name));
    }
    if (sortBy === "name-desc") {
      sorted.sort((first, second) => second.name.localeCompare(first.name));
    }
    if (sortBy === "short-asc") {
      sorted.sort((first, second) =>
        first.shortName.localeCompare(second.shortName)
      );
    }
    if (sortBy === "short-desc") {
      sorted.sort((first, second) =>
        second.shortName.localeCompare(first.shortName)
      );
    }

    return sorted;
  }, [teams, searchQuery, initialFilter, sortBy]);

  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    initialFilter !== DEFAULT_INITIAL_FILTER ||
    sortBy !== DEFAULT_SORT;

  const desktopRowClass = isAdmin
    ? DESKTOP_ROW_WITH_ACTIONS
    : DESKTOP_ROW_NO_ACTIONS;

  const handleResetFilters = () => {
    setSearchQuery("");
    setInitialFilter(DEFAULT_INITIAL_FILTER);
    setSortBy(DEFAULT_SORT);
  };

  const handleEditStart = (team: Team) => {
    setEditingTeamId(team.id);
    setEditingDraft({
      name: team.name,
      shortName: team.shortName,
    });
  };

  const handleEditCancel = () => {
    if (activeUpdateId !== null) {
      return;
    }

    setEditingTeamId(null);
    setEditingDraft(null);
  };

  const handleSaveEdit = () => {
    if (!editingDraft || editingTeamId === null) {
      return;
    }

    const normalizedName = editingDraft.name.trim();
    if (normalizedName.length === 0) {
      toast.error("Team name is required");
      return;
    }

    const normalizedShortName = editingDraft.shortName.trim();
    if (normalizedShortName.length === 0) {
      toast.error("Team short name is required");
      return;
    }

    updateTeamMutation.mutate({
      id: editingTeamId,
      data: {
        name: normalizedName,
        shortName: normalizedShortName,
      },
    });
  };

  const handleDelete = (team: Team) => {
    setPendingDeleteTeam(team);
  };

  const handleConfirmDelete = () => {
    if (!pendingDeleteTeam) {
      return;
    }

    deleteTeamMutation.mutate(pendingDeleteTeam.id);
  };

  const isDeleteDialogOpen = pendingDeleteTeam !== null;
  const isConfirmDeletePending =
    pendingDeleteTeam !== null && activeDeleteId === pendingDeleteTeam.id;

  const isEditing = (teamId: number) =>
    editingTeamId === teamId && editingDraft !== null;

  const hasTeams = teams.length > 0;
  const hasFilteredTeams = filteredTeams.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 md:px-6 md:py-8">
        <header className="space-y-2">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1">
              <h1 className="font-semibold text-2xl tracking-tight md:text-3xl">
                Teams
              </h1>
              <p className="text-muted-foreground text-sm md:text-base">
                Browse, search, and manage team profiles.
              </p>
            </div>
            {isAdmin ? (
              <Link className={buttonVariants()} to="/teams/create">
                <Plus />
                Add Team
              </Link>
            ) : null}
          </div>
        </header>

        <section className="space-y-4 rounded-xl border bg-card p-4 shadow-sm md:p-5">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_170px_180px_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="Search teams"
                className="pl-8"
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by name or short code..."
                value={searchQuery}
              />
            </div>

            <Select
              onValueChange={(value) => {
                if (value) {
                  setInitialFilter(value);
                }
              }}
              value={initialFilter}
            >
              <SelectTrigger
                aria-label="Filter by team name initial"
                className="w-full"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={DEFAULT_INITIAL_FILTER}>
                  All initials
                </SelectItem>
                {nameInitialOptions.map((initial) => (
                  <SelectItem key={initial} value={initial}>
                    {initial}
                  </SelectItem>
                ))}
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
              <SelectTrigger aria-label="Sort teams" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name-asc">Name A-Z</SelectItem>
                <SelectItem value="name-desc">Name Z-A</SelectItem>
                <SelectItem value="short-asc">Short code A-Z</SelectItem>
                <SelectItem value="short-desc">Short code Z-A</SelectItem>
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
              Showing {filteredTeams.length} of {teams.length} teams
            </span>
            {isAdmin ? <span>Admin mode</span> : null}
          </div>
        </section>

        {isLoading ? (
          <>
            <DesktopSkeletonList showActions={isAdmin} />
            <MobileSkeletonCards showActions={isAdmin} />
          </>
        ) : null}

        {isLoading || hasTeams ? null : (
          <section className="rounded-xl border border-dashed bg-card p-10 text-center">
            <h2 className="font-medium text-lg">No teams found</h2>
            <p className="mt-1 text-muted-foreground text-sm">
              Teams will appear here once they are created.
            </p>
          </section>
        )}

        {!isLoading && hasTeams && !hasFilteredTeams ? (
          <section className="rounded-xl border border-dashed bg-card p-10 text-center">
            <h2 className="font-medium text-lg">No results</h2>
            <p className="mt-1 text-muted-foreground text-sm">
              No teams matched the current search and filters.
            </p>
            <div className="mt-5">
              <Button onClick={handleResetFilters} size="sm" variant="outline">
                <X />
                Clear filters
              </Button>
            </div>
          </section>
        ) : null}

        {!isLoading && hasFilteredTeams ? (
          <>
            <section className="hidden overflow-hidden rounded-xl border bg-card md:block">
              <div
                className={cn(desktopRowClass, "border-b bg-muted/30 py-2.5")}
              >
                <span className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
                  Team
                </span>
                <span className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
                  Code
                </span>
                {isAdmin ? (
                  <span className="text-right font-medium text-muted-foreground text-xs uppercase tracking-wide">
                    Actions
                  </span>
                ) : null}
              </div>

              {filteredTeams.map((team, index) => {
                const isRowEditing = isEditing(team.id);
                const isRowPending =
                  activeDeleteId === team.id || activeUpdateId === team.id;
                const hasBottomBorder = index < filteredTeams.length - 1;

                if (isAdmin && isRowEditing && editingDraft) {
                  return (
                    <div
                      className={cn(
                        desktopRowClass,
                        "bg-muted/10",
                        hasBottomBorder ? "border-b" : null
                      )}
                      key={team.id}
                    >
                      <Input
                        onChange={(event) =>
                          setEditingDraft((draft) =>
                            draft
                              ? {
                                  ...draft,
                                  name: event.target.value,
                                }
                              : draft
                          )
                        }
                        value={editingDraft.name}
                      />
                      <Input
                        onChange={(event) =>
                          setEditingDraft((draft) =>
                            draft
                              ? {
                                  ...draft,
                                  shortName: event.target.value,
                                }
                              : draft
                          )
                        }
                        value={editingDraft.shortName}
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          disabled={isRowPending}
                          onClick={handleSaveEdit}
                          size="sm"
                          type="button"
                        >
                          Save
                        </Button>
                        <Button
                          disabled={isRowPending}
                          onClick={handleEditCancel}
                          size="sm"
                          type="button"
                          variant="ghost"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    className={cn(
                      desktopRowClass,
                      "min-h-16",
                      isRowPending ? "opacity-60" : null,
                      hasBottomBorder ? "border-b" : null
                    )}
                    key={team.id}
                  >
                    <div>
                      <p className="truncate font-medium">{team.name}</p>
                      <p className="text-muted-foreground text-xs">
                        Team #{team.id}
                      </p>
                    </div>
                    <div>
                      <span className="rounded-full bg-muted px-2.5 py-1 font-medium text-xs">
                        {team.shortName}
                      </span>
                    </div>
                    {isAdmin ? (
                      <div className="flex justify-end gap-2">
                        <Button
                          disabled={isRowPending}
                          onClick={() => handleEditStart(team)}
                          size="sm"
                          type="button"
                          variant="outline"
                        >
                          <Pencil />
                          Edit
                        </Button>
                        <Button
                          disabled={isRowPending}
                          onClick={() => handleDelete(team)}
                          size="sm"
                          type="button"
                          variant="destructive"
                        >
                          <Trash2 />
                          Delete
                        </Button>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </section>

            <section className="space-y-4 md:hidden">
              {filteredTeams.map((team) => {
                const isCardEditing = isEditing(team.id);
                const isCardPending =
                  activeDeleteId === team.id || activeUpdateId === team.id;

                if (isAdmin && isCardEditing && editingDraft) {
                  return (
                    <Card className="gap-4 py-4" key={team.id}>
                      <CardContent className="space-y-3 px-4">
                        <Input
                          onChange={(event) =>
                            setEditingDraft((draft) =>
                              draft
                                ? {
                                    ...draft,
                                    name: event.target.value,
                                  }
                                : draft
                            )
                          }
                          value={editingDraft.name}
                        />
                        <Input
                          onChange={(event) =>
                            setEditingDraft((draft) =>
                              draft
                                ? {
                                    ...draft,
                                    shortName: event.target.value,
                                  }
                                : draft
                            )
                          }
                          value={editingDraft.shortName}
                        />
                        <div className="flex gap-2 pt-1">
                          <Button
                            className="flex-1"
                            disabled={isCardPending}
                            onClick={handleSaveEdit}
                            size="sm"
                            type="button"
                          >
                            Save
                          </Button>
                          <Button
                            className="flex-1"
                            disabled={isCardPending}
                            onClick={handleEditCancel}
                            size="sm"
                            type="button"
                            variant="ghost"
                          >
                            Cancel
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                }

                return (
                  <Card
                    className={cn(
                      "gap-4 py-4",
                      isCardPending ? "opacity-60" : null
                    )}
                    key={team.id}
                  >
                    <CardContent className="space-y-4 px-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-medium text-base">{team.name}</h3>
                          <p className="text-muted-foreground text-xs">
                            Team #{team.id}
                          </p>
                        </div>
                        <span className="rounded-full bg-muted px-2.5 py-1 font-medium text-xs">
                          {team.shortName}
                        </span>
                      </div>

                      {isAdmin ? (
                        <div className="flex gap-2 border-t pt-3">
                          <Button
                            className="flex-1"
                            disabled={isCardPending}
                            onClick={() => handleEditStart(team)}
                            size="sm"
                            type="button"
                            variant="outline"
                          >
                            <Pencil />
                            Edit
                          </Button>
                          <Button
                            className="flex-1"
                            disabled={isCardPending}
                            onClick={() => handleDelete(team)}
                            size="sm"
                            type="button"
                            variant="destructive"
                          >
                            <Trash2 />
                            Delete
                          </Button>
                        </div>
                      ) : null}
                    </CardContent>
                  </Card>
                );
              })}
            </section>
          </>
        ) : null}
      </div>

      <Dialog
        onOpenChange={(open) => {
          if (!(open || isConfirmDeletePending)) {
            setPendingDeleteTeam(null);
          }
        }}
        open={isDeleteDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete team?</DialogTitle>
            <DialogDescription>
              {pendingDeleteTeam
                ? `This will permanently delete ${pendingDeleteTeam.name}. This action cannot be undone.`
                : "This action cannot be undone."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              disabled={isConfirmDeletePending}
              onClick={() => setPendingDeleteTeam(null)}
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

function DesktopSkeletonList({ showActions }: { showActions: boolean }) {
  const rowClass = showActions
    ? DESKTOP_ROW_WITH_ACTIONS
    : DESKTOP_ROW_NO_ACTIONS;
  const rows = Array.from({ length: DESKTOP_SKELETON_ROWS });

  return (
    <section className="hidden overflow-hidden rounded-xl border bg-card md:block">
      <div className={cn(rowClass, "border-b bg-muted/30 py-2.5")}>
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-14" />
        {showActions ? <Skeleton className="ml-auto h-3 w-16" /> : null}
      </div>
      {rows.map((_, index) => (
        <div
          className={cn(rowClass, index < rows.length - 1 ? "border-b" : null)}
          key={`desktop-skeleton-row-${String(index)}`}
        >
          <div className="space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/4" />
          </div>
          <Skeleton className="h-6 w-16 rounded-full" />
          {showActions ? (
            <div className="ml-auto flex gap-2">
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-8 w-16" />
            </div>
          ) : null}
        </div>
      ))}
    </section>
  );
}

function MobileSkeletonCards({ showActions }: { showActions: boolean }) {
  const cards = Array.from({ length: MOBILE_SKELETON_CARDS });

  return (
    <section className="space-y-4 md:hidden">
      {cards.map((_, index) => (
        <Card
          className="gap-4 py-4"
          key={`mobile-skeleton-card-${String(index)}`}
        >
          <CardContent className="space-y-4 px-4">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-6 w-14 rounded-full" />
            </div>
            {showActions ? (
              <div className="flex gap-2 border-t pt-3">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </section>
  );
}
