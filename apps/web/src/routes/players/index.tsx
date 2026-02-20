import type { Player } from '@cricket247/server/types';
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { FilterX, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { authClient } from '@/lib/auth-client';
import { client, orpc } from '@/utils/orpc';

const DEFAULT_BATTING_FILTER = 'all';
const DEFAULT_WICKET_KEEPER_FILTER = 'all';
const DEFAULT_SORT = 'name-asc';
const DESKTOP_SKELETON_ROWS = 8;
const MOBILE_SKELETON_CARDS = 5;

const DESKTOP_ROW_BASE = 'grid items-center gap-4 px-5 py-3';
const DESKTOP_ROW_WITH_ACTIONS = `${DESKTOP_ROW_BASE} grid-cols-[minmax(0,2.25fr)_90px_150px_minmax(0,1.6fr)_120px_180px]`;
const DESKTOP_ROW_NO_ACTIONS = `${DESKTOP_ROW_BASE} grid-cols-[minmax(0,2.75fr)_90px_170px_minmax(0,1.7fr)_120px]`;

type SortOption = 'name-asc' | 'name-desc' | 'age-asc' | 'age-desc';

type PlayerDraft = {
  name: string;
  age: string;
  battingStance: string;
  bowlingStance: string;
  isWicketKeeper: 'yes' | 'no';
};

type UpdatePlayerPayload = {
  name: string;
  age: number;
  battingStance: string;
  bowlingStance: string | null;
  isWicketKeeper: boolean;
};

export const Route = createFileRoute('/players/')({
  component: RouteComponent,
});

function RouteComponent() {
  const queryClient = useQueryClient();
  const { data: session } = authClient.useSession();
  const isAdmin = (session?.user as { role?: string } | undefined)?.role === 'admin';

  const [searchQuery, setSearchQuery] = useState('');
  const [battingFilter, setBattingFilter] = useState(DEFAULT_BATTING_FILTER);
  const [wicketKeeperFilter, setWicketKeeperFilter] = useState(
    DEFAULT_WICKET_KEEPER_FILTER
  );
  const [sortBy, setSortBy] = useState<SortOption>(DEFAULT_SORT);
  const [editingPlayerId, setEditingPlayerId] = useState<number | null>(null);
  const [editingDraft, setEditingDraft] = useState<PlayerDraft | null>(null);
  const [activeDeleteId, setActiveDeleteId] = useState<number | null>(null);
  const [activeUpdateId, setActiveUpdateId] = useState<number | null>(null);

  const { data: players = [], isLoading } = useQuery(orpc.players.queryOptions());

  const updatePlayerMutation = useMutation({
    mutationFn: async (input: { id: number; data: UpdatePlayerPayload }) =>
      client.updatePlayer(input),
    onMutate: ({ id }) => {
      setActiveUpdateId(id);
    },
    onSuccess: async () => {
      toast.success('Player updated');
      setEditingPlayerId(null);
      setEditingDraft(null);
      await queryClient.invalidateQueries();
    },
    onError: () => {
      toast.error('Failed to update player');
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
    onSuccess: async () => {
      toast.success('Player deleted');
      setEditingPlayerId(null);
      setEditingDraft(null);
      await queryClient.invalidateQueries();
    },
    onError: () => {
      toast.error('Failed to delete player');
    },
    onSettled: () => {
      setActiveDeleteId(null);
    },
  });

  const battingStanceOptions = useMemo(() => {
    return Array.from(new Set(players.map((player) => player.battingStance))).sort(
      (first, second) => first.localeCompare(second)
    );
  }, [players]);

  const filteredPlayers = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    const filtered = players.filter((player) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        player.name.toLowerCase().includes(normalizedSearch) ||
        player.battingStance.toLowerCase().includes(normalizedSearch) ||
        (player.bowlingStance ?? '').toLowerCase().includes(normalizedSearch);

      const matchesBattingFilter =
        battingFilter === DEFAULT_BATTING_FILTER ||
        player.battingStance === battingFilter;

      let matchesWicketKeeperFilter = true;
      if (wicketKeeperFilter === 'yes') {
        matchesWicketKeeperFilter = player.isWicketKeeper;
      }
      if (wicketKeeperFilter === 'no') {
        matchesWicketKeeperFilter = !player.isWicketKeeper;
      }

      return matchesSearch && matchesBattingFilter && matchesWicketKeeperFilter;
    });

    const sorted = [...filtered];
    if (sortBy === 'name-asc') {
      sorted.sort((first, second) => first.name.localeCompare(second.name));
    }
    if (sortBy === 'name-desc') {
      sorted.sort((first, second) => second.name.localeCompare(first.name));
    }
    if (sortBy === 'age-asc') {
      sorted.sort((first, second) => first.age - second.age);
    }
    if (sortBy === 'age-desc') {
      sorted.sort((first, second) => second.age - first.age);
    }

    return sorted;
  }, [players, searchQuery, battingFilter, wicketKeeperFilter, sortBy]);

  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    battingFilter !== DEFAULT_BATTING_FILTER ||
    wicketKeeperFilter !== DEFAULT_WICKET_KEEPER_FILTER ||
    sortBy !== DEFAULT_SORT;

  const desktopRowClass = isAdmin ? DESKTOP_ROW_WITH_ACTIONS : DESKTOP_ROW_NO_ACTIONS;

  const handleResetFilters = () => {
    setSearchQuery('');
    setBattingFilter(DEFAULT_BATTING_FILTER);
    setWicketKeeperFilter(DEFAULT_WICKET_KEEPER_FILTER);
    setSortBy(DEFAULT_SORT);
  };

  const handleEditStart = (player: Player) => {
    setEditingPlayerId(player.id);
    setEditingDraft({
      name: player.name,
      age: String(player.age),
      battingStance: player.battingStance,
      bowlingStance: player.bowlingStance ?? '',
      isWicketKeeper: player.isWicketKeeper ? 'yes' : 'no',
    });
  };

  const handleEditCancel = () => {
    if (activeUpdateId !== null) {
      return;
    }

    setEditingPlayerId(null);
    setEditingDraft(null);
  };

  const handleSaveEdit = () => {
    if (!editingDraft || editingPlayerId === null) {
      return;
    }

    const normalizedName = editingDraft.name.trim();
    if (normalizedName.length === 0) {
      toast.error('Player name is required');
      return;
    }

    const parsedAge = Number.parseInt(editingDraft.age, 10);
    if (!Number.isFinite(parsedAge) || parsedAge <= 0) {
      toast.error('Age must be a positive number');
      return;
    }

    const normalizedBattingStance = editingDraft.battingStance.trim();
    if (normalizedBattingStance.length === 0) {
      toast.error('Batting stance is required');
      return;
    }

    const normalizedBowlingStance = editingDraft.bowlingStance.trim();
    updatePlayerMutation.mutate({
      id: editingPlayerId,
      data: {
        name: normalizedName,
        age: parsedAge,
        battingStance: normalizedBattingStance,
        bowlingStance:
          normalizedBowlingStance.length > 0 ? normalizedBowlingStance : null,
        isWicketKeeper: editingDraft.isWicketKeeper === 'yes',
      },
    });
  };

  const handleDelete = (player: Player) => {
    const shouldDelete = window.confirm(
      `Delete ${player.name}? This action cannot be undone.`
    );

    if (!shouldDelete) {
      return;
    }

    deletePlayerMutation.mutate(player.id);
  };

  const isEditing = (playerId: number) =>
    editingPlayerId === playerId && editingDraft !== null;

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
              <Button asChild>
                <Link to="/players/create">
                  <Plus />
                  Add Player
                </Link>
              </Button>
            ) : null}
          </div>
        </header>

        <section className="space-y-4 rounded-xl border bg-card p-4 shadow-sm md:p-5">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_210px_200px_190px_auto]">
            <div className="relative">
              <Search className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-2.5 size-4 text-muted-foreground" />
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
              <SelectTrigger aria-label="Filter by batting stance" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={DEFAULT_BATTING_FILTER}>All batting</SelectItem>
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
              <SelectTrigger aria-label="Filter by wicket keeper" className="w-full">
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

        {isLoading ? (
          <>
            <DesktopSkeletonList showActions={isAdmin} />
            <MobileSkeletonCards />
          </>
        ) : null}

        {!isLoading && !hasPlayers ? (
          <section className="rounded-xl border border-dashed bg-card p-10 text-center">
            <h2 className="font-medium text-lg">No players found</h2>
            <p className="mt-1 text-muted-foreground text-sm">
              Add players to start building your squad.
            </p>
          </section>
        ) : null}

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
          <>
            <section className="hidden overflow-hidden rounded-xl border bg-card md:block">
              <div className={cn(desktopRowClass, 'border-b bg-muted/30 py-2.5')}>
                <span className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
                  Name
                </span>
                <span className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
                  Age
                </span>
                <span className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
                  Batting
                </span>
                <span className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
                  Bowling
                </span>
                <span className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
                  Keeper
                </span>
                {isAdmin ? (
                  <span className="text-right font-medium text-muted-foreground text-xs uppercase tracking-wide">
                    Actions
                  </span>
                ) : null}
              </div>

              {filteredPlayers.map((player, index) => {
                const isRowEditing = isEditing(player.id);
                const isRowPending =
                  activeDeleteId === player.id || activeUpdateId === player.id;
                const hasBottomBorder = index < filteredPlayers.length - 1;

                if (isRowEditing && editingDraft) {
                  return (
                    <div
                      className={cn(
                        desktopRowClass,
                        'bg-muted/10',
                        hasBottomBorder ? 'border-b' : null
                      )}
                      key={player.id}
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
                        min={1}
                        onChange={(event) =>
                          setEditingDraft((draft) =>
                            draft
                              ? {
                                  ...draft,
                                  age: event.target.value,
                                }
                              : draft
                          )
                        }
                        type="number"
                        value={editingDraft.age}
                      />
                      <Select
                        onValueChange={(value) => {
                          if (value) {
                            setEditingDraft((draft) =>
                              draft
                                ? {
                                    ...draft,
                                    battingStance: value,
                                  }
                                : draft
                            );
                          }
                        }}
                        value={editingDraft.battingStance}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {battingStanceOptions.map((stance) => (
                            <SelectItem key={stance} value={stance}>
                              {stance}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        onChange={(event) =>
                          setEditingDraft((draft) =>
                            draft
                              ? {
                                  ...draft,
                                  bowlingStance: event.target.value,
                                }
                              : draft
                          )
                        }
                        placeholder="Optional"
                        value={editingDraft.bowlingStance}
                      />
                      <Select
                        onValueChange={(value) => {
                          if (value === 'yes' || value === 'no') {
                            setEditingDraft((draft) =>
                              draft
                                ? {
                                    ...draft,
                                    isWicketKeeper: value,
                                  }
                                : draft
                            );
                          }
                        }}
                        value={editingDraft.isWicketKeeper}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="yes">Yes</SelectItem>
                          <SelectItem value="no">No</SelectItem>
                        </SelectContent>
                      </Select>
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
                      'min-h-16',
                      isRowPending ? 'opacity-60' : null,
                      hasBottomBorder ? 'border-b' : null
                    )}
                    key={player.id}
                  >
                    <div className="truncate font-medium">{player.name}</div>
                    <div>{player.age}</div>
                    <div className="truncate">{player.battingStance}</div>
                    <div className="truncate text-muted-foreground">
                      {player.bowlingStance ?? '-'}
                    </div>
                    <div>
                      {player.isWicketKeeper ? (
                        <span className="rounded-full bg-primary/10 px-2.5 py-1 font-medium text-primary text-xs">
                          Yes
                        </span>
                      ) : (
                        <span className="rounded-full bg-muted px-2.5 py-1 font-medium text-muted-foreground text-xs">
                          No
                        </span>
                      )}
                    </div>
                    {isAdmin ? (
                      <div className="flex justify-end gap-2">
                        <Button
                          disabled={isRowPending}
                          onClick={() => handleEditStart(player)}
                          size="sm"
                          type="button"
                          variant="outline"
                        >
                          <Pencil />
                          Edit
                        </Button>
                        <Button
                          disabled={isRowPending}
                          onClick={() => handleDelete(player)}
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
              {filteredPlayers.map((player) => {
                const isCardEditing = isEditing(player.id);
                const isCardPending =
                  activeDeleteId === player.id || activeUpdateId === player.id;

                if (isCardEditing && editingDraft) {
                  return (
                    <Card className="gap-4 py-4" key={player.id}>
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
                          min={1}
                          onChange={(event) =>
                            setEditingDraft((draft) =>
                              draft
                                ? {
                                    ...draft,
                                    age: event.target.value,
                                  }
                                : draft
                            )
                          }
                          type="number"
                          value={editingDraft.age}
                        />
                        <Select
                          onValueChange={(value) => {
                            if (value) {
                              setEditingDraft((draft) =>
                                draft
                                  ? {
                                      ...draft,
                                      battingStance: value,
                                    }
                                  : draft
                              );
                            }
                          }}
                          value={editingDraft.battingStance}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {battingStanceOptions.map((stance) => (
                              <SelectItem key={stance} value={stance}>
                                {stance}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          onChange={(event) =>
                            setEditingDraft((draft) =>
                              draft
                                ? {
                                    ...draft,
                                    bowlingStance: event.target.value,
                                  }
                                : draft
                            )
                          }
                          placeholder="Bowling stance (optional)"
                          value={editingDraft.bowlingStance}
                        />
                        <Select
                          onValueChange={(value) => {
                            if (value === 'yes' || value === 'no') {
                              setEditingDraft((draft) =>
                                draft
                                  ? {
                                      ...draft,
                                      isWicketKeeper: value,
                                    }
                                  : draft
                              );
                            }
                          }}
                          value={editingDraft.isWicketKeeper}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="yes">Wicket keeper</SelectItem>
                            <SelectItem value="no">Not a keeper</SelectItem>
                          </SelectContent>
                        </Select>
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
                  <Card className={cn('gap-4 py-4', isCardPending ? 'opacity-60' : null)} key={player.id}>
                    <CardContent className="space-y-4 px-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-medium text-base">{player.name}</h3>
                          <p className="text-muted-foreground text-xs">
                            Player #{player.id}
                          </p>
                        </div>
                        {player.isWicketKeeper ? (
                          <span className="rounded-full bg-primary/10 px-2.5 py-1 font-medium text-primary text-xs">
                            Keeper
                          </span>
                        ) : null}
                      </div>

                      <dl className="grid grid-cols-2 gap-3 text-sm">
                        <div className="space-y-1">
                          <dt className="text-muted-foreground text-xs">Age</dt>
                          <dd>{player.age}</dd>
                        </div>
                        <div className="space-y-1">
                          <dt className="text-muted-foreground text-xs">Batting</dt>
                          <dd>{player.battingStance}</dd>
                        </div>
                        <div className="col-span-2 space-y-1">
                          <dt className="text-muted-foreground text-xs">Bowling</dt>
                          <dd>{player.bowlingStance ?? '-'}</dd>
                        </div>
                      </dl>

                      {isAdmin ? (
                        <div className="flex gap-2 border-t pt-3">
                          <Button
                            className="flex-1"
                            disabled={isCardPending}
                            onClick={() => handleEditStart(player)}
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
                            onClick={() => handleDelete(player)}
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
    </div>
  );
}

function DesktopSkeletonList({ showActions }: { showActions: boolean }) {
  const rowClass = showActions ? DESKTOP_ROW_WITH_ACTIONS : DESKTOP_ROW_NO_ACTIONS;
  const rows = Array.from({ length: DESKTOP_SKELETON_ROWS });

  return (
    <section className="hidden overflow-hidden rounded-xl border bg-card md:block">
      <div className={cn(rowClass, 'border-b bg-muted/30 py-2.5')}>
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-12" />
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-16" />
        {showActions ? <Skeleton className="ml-auto h-3 w-16" /> : null}
      </div>
      {rows.map((_, index) => (
        <div
          className={cn(rowClass, index < rows.length - 1 ? 'border-b' : null)}
          key={`desktop-skeleton-row-${String(index)}`}
        >
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-10" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-6 w-14 rounded-full" />
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

function MobileSkeletonCards() {
  const cards = Array.from({ length: MOBILE_SKELETON_CARDS });

  return (
    <section className="space-y-4 md:hidden">
      {cards.map((_, index) => (
        <Card className="gap-4 py-4" key={`mobile-skeleton-card-${String(index)}`}>
          <CardContent className="space-y-4 px-4">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="col-span-2 h-10 w-full" />
            </div>
            <div className="flex gap-2 border-t pt-3">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          </CardContent>
        </Card>
      ))}
    </section>
  );
}
