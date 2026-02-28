export interface ReassignDialogPlayer {
  assignedTeamId: number;
  assignedTeamName: string | null;
  name: string;
  playerId: number;
}

export interface TeamTournament {
  id: number;
  name: string;
}

export interface AssignedPlayer {
  playerId: number;
  name: string;
  role: string;
  isCaptain: boolean | null;
  isViceCaptain: boolean | null;
}

export interface AvailablePlayer {
  playerId: number;
  name: string;
  role: string;
  nationality: string | null;
}

export interface ConflictedPlayer {
  playerId: number;
  name: string;
  role: string;
  assignedTeamId: number | null;
  assignedTeamName: string | null;
}
