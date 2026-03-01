import type { TeamTournament } from "./-types";

export function resolveSelectedTournamentId({
  selectedTournamentId,
  initialTournamentId,
  teamTournaments,
}: {
  selectedTournamentId: string;
  initialTournamentId?: string;
  teamTournaments: TeamTournament[];
}) {
  if (teamTournaments.length === 0) {
    return "";
  }

  const hasTournament = (value?: string) =>
    typeof value === "string" &&
    value.length > 0 &&
    teamTournaments.some((tournament) => String(tournament.id) === value);

  if (hasTournament(selectedTournamentId)) {
    return selectedTournamentId;
  }

  if (hasTournament(initialTournamentId)) {
    return initialTournamentId ?? "";
  }

  return String(teamTournaments[0]?.id ?? "");
}
