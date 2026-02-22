import z from "zod";

const _stringBool = z
  .union([
    z.enum(["false", "0"]).transform(() => false),
    z.boolean(),
    z.string(),
    z.number(),
  ])
  .pipe(z.coerce.boolean())
  .default(false)
  .optional();

export const MatchFormSchema = z.object({
  tournamentId: z.number().int().positive({
    message: "Tournament is required",
  }),
  matchDate: z.date(),
  tossWinnerId: z.number(),
  tossDecision: z.string(),
  team1Id: z.number(),
  team2Id: z.number(),
  oversPerSide: z.number().min(1, { message: "Overs per side is required" }),
  maxOverPerBowler: z.number().min(1, {
    message: "Max over per bowler is required",
  }),
  winnerId: z.number().optional(),
  result: z.string().optional(),
  hasLBW: z.boolean().optional(),
  hasBye: z.boolean().optional(),
  hasLegBye: z.boolean().optional(),
  hasBoundaryOut: z.boolean().optional(),
  hasSuperOver: z.boolean().optional(),
  venueId: z.number().optional(),
  format: z.string(), // "T5", "T6", "T7", "T8", "T10", "T12", "T20", "ODI", "Test", "Custom"
  notes: z.string().optional(),
  ranked: z.boolean().optional(),
  isLive: z.boolean().optional(),
  isCompleted: z.boolean().optional(),
  isAbandoned: z.boolean().optional(),
  isTied: z.boolean().optional(),
  margin: z.string().optional(),
  playerOfTheMatchId: z.number().optional(),
});
