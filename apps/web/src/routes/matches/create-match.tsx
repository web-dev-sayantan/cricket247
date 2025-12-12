import { useForm } from "@tanstack/react-form";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import type z from "zod";
import { MatchFormSchema } from "@/lib/schema/match-schema";
import { client } from "@/utils/orpc";

export const Route = createFileRoute("/matches/create-match")({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();

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

  const _form = useForm({
    defaultValues,
    validators: {
      onSubmit: MatchFormSchema,
    },
    onSubmit: async ({ value }) => {
      try {
        await client.createMatch(value);
        toast.success("Match created successfully!");
        navigate({ to: "/" });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to create match";
        toast.error(errorMessage);
      }
    },
  });

  return <div>Create Match Component</div>;
}
