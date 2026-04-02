export type PreMatchPhase = "lineup" | "toss" | "inningsSetup";

export interface TeamSelection {
  captainPlayerId?: number;
  playerIds: number[];
  viceCaptainPlayerId?: number;
  wicketKeeperPlayerId?: number;
}

export interface RosterPlayer {
  isCaptain: boolean;
  isViceCaptain: boolean;
  name: string;
  playerId: number;
  role: string;
  teamId: number;
}
