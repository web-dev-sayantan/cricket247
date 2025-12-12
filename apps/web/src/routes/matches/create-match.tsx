import { useForm } from "@tanstack/react-form";
import { createFileRoute } from "@tanstack/react-router";
import type z from "zod";
import { MatchFormSchema } from "@/lib/schema/match-schema";

export const Route = createFileRoute("/matches/create-match")({
  component: RouteComponent,
});

function RouteComponent() {
  // Types from @cricket247/types are now available
  // Example: const match: Match = { /* ... */ }
  // Example: const team: Team = { /* ... */ }
  // Example: const player: Player = { /* ... */ }

  const defaultValues: z.infer<typeof MatchFormSchema> = {
    matchDate: new Date(),
    tossWinnerId: 1,
    tossDecision: "bat",
    team1Id: 1,
    team2Id: 2,
    oversPerSide: 6,
    maxOverPerBowler: 2,
    hasLBW: false,
    hasBye: false,
    hasLegBye: false,
    hasBoundaryOut: false,
    hasSuperOver: false,
    format: "T6",
  };
  const form = useForm({
    defaultValues,
    validators: {
      onSubmit: MatchFormSchema,
    },
    onSubmit: ({ value }) => {
      console.log("Form submitted with values:", value);
      // TODO: Call the create match API here

    },
  });

  return <div>Create Match Component</div>;
}
