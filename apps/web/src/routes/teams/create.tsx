import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Plus } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/lib/auth-client";
import { client } from "@/utils/orpc";

const createTeamSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Team name must be at least 2 characters")
    .max(100, "Team name must be at most 100 characters"),
  shortName: z
    .string()
    .trim()
    .min(2, "Short code must be at least 2 characters")
    .max(12, "Short code must be at most 12 characters"),
});

type CreateTeamFormValues = z.infer<typeof createTeamSchema>;

export const Route = createFileRoute("/teams/create")({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: session, isPending: isSessionPending } =
    authClient.useSession();
  const isAdmin =
    (session?.user as { role?: string } | undefined)?.role === "admin";

  const createTeamMutation = useMutation({
    mutationFn: async (data: CreateTeamFormValues) => client.createTeam(data),
    onSuccess: async () => {
      toast.success("Team created");
      await queryClient.invalidateQueries();
      navigate({ to: "/teams" });
    },
    onError: () => {
      toast.error("Failed to create team");
    },
  });

  const form = useForm({
    defaultValues: {
      name: "",
      shortName: "",
    } satisfies CreateTeamFormValues,
    validators: {
      onSubmit: createTeamSchema,
    },
    onSubmit: async ({ value }) => {
      await createTeamMutation.mutateAsync({
        name: value.name.trim(),
        shortName: value.shortName.trim().toUpperCase(),
      });
    },
  });

  if (isSessionPending) {
    return (
      <PageShell maxWidth="form">
        <Skeleton className="h-8 w-48" />
        <Card className="rounded-xl">
          <CardHeader className="space-y-2">
            <Skeleton className="h-6 w-36" />
            <Skeleton className="h-4 w-56" />
          </CardHeader>
          <CardContent className="space-y-5">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <div className="flex gap-2">
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-28" />
            </div>
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  if (!isAdmin) {
    return (
      <PageShell maxWidth="form">
        <PageHeader
          description="You need admin access to create teams."
          title="Create Team"
        />
        <Card className="rounded-xl border-dashed">
          <CardContent className="space-y-4 p-6">
            <p className="text-muted-foreground text-sm">
              Your account does not have permission to create team records.
            </p>
            <Button
              onClick={() => navigate({ to: "/teams" })}
              size="sm"
              type="button"
              variant="outline"
            >
              <ArrowLeft />
              Back to teams
            </Button>
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell maxWidth="form">
      <PageHeader
        description="Add a new team with a full name and short code."
        title="Create Team"
      />

      <div className="space-y-5">
        <Card className="rounded-xl">
          <CardHeader className="space-y-1 border-b pb-4">
            <h2 className="font-medium text-lg">Team Details</h2>
            <p className="text-muted-foreground text-sm">
              Keep names consistent to simplify search and match setup.
            </p>
          </CardHeader>
          <CardContent className="pt-5">
            <form
              className="space-y-5"
              onSubmit={(event) => {
                event.preventDefault();
                event.stopPropagation();
                form.handleSubmit();
              }}
            >
              <FieldGroup>
                <form.Field name="name">
                  {(field) => {
                    const isInvalid =
                      field.state.meta.isTouched && !field.state.meta.isValid;
                    return (
                      <Field data-invalid={isInvalid}>
                        <FieldLabel htmlFor={field.name}>Team Name</FieldLabel>
                        <Input
                          aria-invalid={isInvalid}
                          autoComplete="organization"
                          id={field.name}
                          onBlur={field.handleBlur}
                          onChange={(event) =>
                            field.handleChange(event.target.value)
                          }
                          placeholder="e.g. Kolkata Knights"
                          value={field.state.value}
                        />
                        {isInvalid ? (
                          <FieldError errors={field.state.meta.errors} />
                        ) : null}
                      </Field>
                    );
                  }}
                </form.Field>
              </FieldGroup>

              <FieldGroup>
                <form.Field name="shortName">
                  {(field) => {
                    const isInvalid =
                      field.state.meta.isTouched && !field.state.meta.isValid;
                    return (
                      <Field data-invalid={isInvalid}>
                        <FieldLabel htmlFor={field.name}>Short Code</FieldLabel>
                        <Input
                          aria-invalid={isInvalid}
                          id={field.name}
                          maxLength={12}
                          onBlur={field.handleBlur}
                          onChange={(event) =>
                            field.handleChange(event.target.value.toUpperCase())
                          }
                          placeholder="e.g. KKR"
                          value={field.state.value}
                        />
                        {isInvalid ? (
                          <FieldError errors={field.state.meta.errors} />
                        ) : null}
                      </Field>
                    );
                  }}
                </form.Field>
              </FieldGroup>

              <form.Subscribe>
                {(state) => (
                  <div className="flex flex-wrap gap-2 border-t pt-4">
                    <Button
                      onClick={() => navigate({ to: "/teams" })}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      <ArrowLeft />
                      Cancel
                    </Button>
                    <Button
                      disabled={
                        !state.canSubmit ||
                        state.isSubmitting ||
                        createTeamMutation.isPending
                      }
                      size="sm"
                      type="submit"
                    >
                      <Plus />
                      {state.isSubmitting || createTeamMutation.isPending
                        ? "Creating..."
                        : "Create team"}
                    </Button>
                  </div>
                )}
              </form.Subscribe>
            </form>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
