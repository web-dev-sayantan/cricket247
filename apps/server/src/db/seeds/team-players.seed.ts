import { db } from "@/db";
import { teamPlayers } from "@/db/schema";

const TOURNAMENT_ID = 91_001;

interface TeamPlayerSeed {
  id: number;
  isCaptain?: boolean;
  isViceCaptain?: boolean;
  playerId: number;
  teamId: number;
}

const TEAM_PLAYER_SEEDS: TeamPlayerSeed[] = [
  { id: 93_401, teamId: 91_101, playerId: 93_101, isCaptain: true },
  { id: 93_402, teamId: 91_101, playerId: 93_102, isViceCaptain: true },
  { id: 93_403, teamId: 91_102, playerId: 93_103, isCaptain: true },
  { id: 93_404, teamId: 91_102, playerId: 93_104, isViceCaptain: true },
  { id: 93_405, teamId: 91_103, playerId: 93_105, isCaptain: true },
  { id: 93_406, teamId: 91_103, playerId: 93_106, isViceCaptain: true },
  { id: 93_407, teamId: 91_104, playerId: 93_107, isCaptain: true },
  { id: 93_408, teamId: 91_104, playerId: 93_108, isViceCaptain: true },
  { id: 93_409, teamId: 91_105, playerId: 93_109, isCaptain: true },
  { id: 93_410, teamId: 91_105, playerId: 93_110, isViceCaptain: true },
  { id: 93_411, teamId: 91_106, playerId: 93_111, isCaptain: true },
  { id: 93_412, teamId: 91_106, playerId: 93_112, isViceCaptain: true },
  { id: 93_413, teamId: 91_107, playerId: 93_113, isCaptain: true },
  { id: 93_414, teamId: 91_107, playerId: 93_114, isViceCaptain: true },
  { id: 93_415, teamId: 91_108, playerId: 93_115, isCaptain: true },
  { id: 93_416, teamId: 91_108, playerId: 93_116, isViceCaptain: true },
  { id: 93_417, teamId: 91_109, playerId: 93_117, isCaptain: true },
  { id: 93_418, teamId: 91_109, playerId: 93_118, isViceCaptain: true },
  { id: 93_419, teamId: 91_110, playerId: 93_119, isCaptain: true },
  { id: 93_420, teamId: 91_110, playerId: 93_120, isViceCaptain: true },
  { id: 93_421, teamId: 91_111, playerId: 93_121, isCaptain: true },
  { id: 93_422, teamId: 91_111, playerId: 93_122, isViceCaptain: true },
  { id: 93_423, teamId: 91_112, playerId: 93_123, isCaptain: true },
  { id: 93_424, teamId: 91_112, playerId: 93_124, isViceCaptain: true },
] as const;

const seedTeamPlayers = async () => {
  await db.transaction(async (tx) => {
    for (const teamPlayer of TEAM_PLAYER_SEEDS) {
      await tx
        .insert(teamPlayers)
        .values({
          id: teamPlayer.id,
          tournamentId: TOURNAMENT_ID,
          teamId: teamPlayer.teamId,
          playerId: teamPlayer.playerId,
          isCaptain: teamPlayer.isCaptain ?? false,
          isViceCaptain: teamPlayer.isViceCaptain ?? false,
        })
        .onConflictDoUpdate({
          target: teamPlayers.id,
          set: {
            tournamentId: TOURNAMENT_ID,
            teamId: teamPlayer.teamId,
            playerId: teamPlayer.playerId,
            isCaptain: teamPlayer.isCaptain ?? false,
            isViceCaptain: teamPlayer.isViceCaptain ?? false,
          },
        });
    }
  });
};

await seedTeamPlayers();
