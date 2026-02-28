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
  isCaptain: boolean | null;
  isViceCaptain: boolean | null;
  name: string;
  playerId: number;
  role: string;
}

export interface AvailablePlayer {
  name: string;
  nationality: string | null;
  playerId: number;
  role: string;
}

export interface ConflictedPlayer {
  assignedTeamId: number | null;
  assignedTeamName: string | null;
  name: string;
  playerId: number;
  role: string;
}
