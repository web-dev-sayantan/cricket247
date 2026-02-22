import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Plus } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/lib/auth-client";
import { COUNTRIES } from "@/lib/constants";
import { client } from "@/utils/orpc";

const battingStanceValues = ["Right handed", "Left handed"] as const;
const playerSexValues = [
  "Male",
  "Female",
  "Other",
  "Prefer not to say",
] as const;
const playerRoleValues = [
  "Batter",
  "Bowler",
  "All-rounder",
  "Wicket Keeper",
] as const;
const UNSPECIFIED_NATIONALITY = "unspecified";

const getDefaultDob = () => {
  const date = new Date();
  date.setFullYear(date.getFullYear() - 18);
  return date;
};

const formatDateInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const parseDateInputValue = (value: string) => {
  const parsedDate = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return parsedDate;
};

const parseOptionalInteger = (value: string) => {
  if (value.trim().length === 0) {
    return undefined;
  }

  const parsedValue = Number.parseInt(value, 10);
  if (Number.isNaN(parsedValue)) {
    return undefined;
  }

  return parsedValue;
};

const calculateAgeFromDob = (dob: Date) => {
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDifference = today.getMonth() - dob.getMonth();
  const hasNotHadBirthdayYet =
    monthDifference < 0 ||
    (monthDifference === 0 && today.getDate() < dob.getDate());

  if (hasNotHadBirthdayYet) {
    age -= 1;
  }

  return Math.max(age, 0);
};

const isValidUrl = (value: string) => {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
};

const createPlayerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Player name must be at least 2 characters")
    .max(100, "Player name must be at most 100 characters"),
  dob: z.date().max(new Date(), "Date of birth cannot be in the future"),
  sex: z.enum(playerSexValues),
  nationality: z.enum(COUNTRIES).optional(),
  height: z
    .number()
    .int("Height must be a whole number")
    .min(1, "Height must be at least 1 cm")
    .max(300, "Height must be at most 300 cm")
    .optional(),
  weight: z
    .number()
    .int("Weight must be a whole number")
    .min(1, "Weight must be at least 1 kg")
    .max(250, "Weight must be at most 250 kg")
    .optional(),
  image: z
    .string()
    .trim()
    .max(2048, "Image URL is too long")
    .optional()
    .refine(
      (value) => value === undefined || value.length === 0 || isValidUrl(value),
      "Image must be a valid URL"
    ),
  role: z.enum(playerRoleValues),
  battingStance: z.enum(battingStanceValues),
  bowlingStance: z
    .string()
    .trim()
    .max(100, "Bowling stance must be at most 100 characters")
    .optional(),
});

type CreatePlayerFormValues = z.infer<typeof createPlayerSchema>;

const defaultValues: CreatePlayerFormValues = {
  name: "",
  dob: getDefaultDob(),
  sex: "Male",
  nationality: "India",
  height: undefined,
  weight: undefined,
  image: "",
  role: "All-rounder",
  battingStance: "Right handed",
  bowlingStance: "",
};

export const Route = createFileRoute("/players/create")({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: session, isPending: isSessionPending } =
    authClient.useSession();
  const isAdmin =
    (session?.user as { role?: string } | undefined)?.role === "admin";
  type CreatePlayerPayload = Parameters<typeof client.createPlayer>[0];

  const createPlayerMutation = useMutation({
    mutationFn: async (data: CreatePlayerPayload) => client.createPlayer(data),
    onSuccess: async () => {
      toast.success("Player created");
      await queryClient.invalidateQueries();
      navigate({ to: "/players" });
    },
    onError: () => {
      toast.error("Failed to create player");
    },
  });

  const form = useForm({
    defaultValues,
    validators: {
      onSubmit: createPlayerSchema,
    },
    onSubmit: async ({ value }) => {
      const normalizedBowlingStance = value.bowlingStance?.trim() ?? "";
      const normalizedImage = value.image?.trim() ?? "";
      const computedAge = calculateAgeFromDob(value.dob);

      await createPlayerMutation.mutateAsync({
        ...value,
        age: computedAge,
        isWicketKeeper: value.role === "Wicket Keeper",
        name: value.name.trim(),
        bowlingStance:
          normalizedBowlingStance.length > 0
            ? normalizedBowlingStance
            : undefined,
        image: normalizedImage.length > 0 ? normalizedImage : undefined,
      });
    },
  });

  if (isSessionPending) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto w-full max-w-2xl space-y-4 px-4 py-6 md:px-6 md:py-8">
          <Skeleton className="h-8 w-48" />
          <Card className="rounded-xl">
            <CardHeader className="space-y-2">
              <Skeleton className="h-6 w-36" />
              <Skeleton className="h-4 w-56" />
            </CardHeader>
            <CardContent className="space-y-5">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <div className="flex gap-2">
                <Skeleton className="h-9 w-24" />
                <Skeleton className="h-9 w-28" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto w-full max-w-2xl space-y-4 px-4 py-6 md:px-6 md:py-8">
          <header className="space-y-1">
            <h1 className="font-semibold text-2xl tracking-tight md:text-3xl">
              Create Player
            </h1>
            <p className="text-muted-foreground text-sm md:text-base">
              You need admin access to create players.
            </p>
          </header>
          <Card className="rounded-xl border-dashed">
            <CardContent className="space-y-4 p-6">
              <p className="text-muted-foreground text-sm">
                Your account does not have permission to create player records.
              </p>
              <Button
                onClick={() => navigate({ to: "/players" })}
                size="sm"
                type="button"
                variant="outline"
              >
                <ArrowLeft />
                Back to players
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-2xl space-y-5 px-4 py-6 md:px-6 md:py-8">
        <header className="space-y-1">
          <h1 className="font-semibold text-2xl tracking-tight md:text-3xl">
            Create Player
          </h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Add a complete player profile with personal and playing details.
          </p>
        </header>

        <Card className="rounded-xl">
          <CardHeader className="space-y-1 border-b pb-4">
            <h2 className="font-medium text-lg">Player Details</h2>
            <p className="text-muted-foreground text-sm">
              Fill out profile, role, and style details for consistent records.
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
                        <FieldLabel htmlFor={field.name}>
                          Player Name
                        </FieldLabel>
                        <Input
                          aria-invalid={isInvalid}
                          autoComplete="name"
                          id={field.name}
                          onBlur={field.handleBlur}
                          onChange={(event) =>
                            field.handleChange(event.target.value)
                          }
                          placeholder="e.g. Virat Kohli"
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
                <form.Field name="dob">
                  {(field) => {
                    const isInvalid =
                      field.state.meta.isTouched && !field.state.meta.isValid;
                    return (
                      <Field data-invalid={isInvalid}>
                        <FieldLabel htmlFor={field.name}>
                          Date of Birth
                        </FieldLabel>
                        <Input
                          aria-invalid={isInvalid}
                          id={field.name}
                          onBlur={field.handleBlur}
                          onChange={(event) => {
                            const parsedDate = parseDateInputValue(
                              event.target.value
                            );
                            if (parsedDate) {
                              field.handleChange(parsedDate);
                            }
                          }}
                          type="date"
                          value={formatDateInputValue(field.state.value)}
                        />
                        {isInvalid ? (
                          <FieldError errors={field.state.meta.errors} />
                        ) : null}
                      </Field>
                    );
                  }}
                </form.Field>
              </FieldGroup>

              <div className="grid gap-5 md:grid-cols-2">
                <FieldGroup>
                  <form.Field name="sex">
                    {(field) => {
                      const isInvalid =
                        field.state.meta.isTouched && !field.state.meta.isValid;
                      return (
                        <Field data-invalid={isInvalid}>
                          <FieldLabel htmlFor={field.name}>Sex</FieldLabel>
                          <Select
                            onValueChange={(value) => {
                              if (value) {
                                field.handleChange(
                                  value as CreatePlayerFormValues["sex"]
                                );
                              }
                            }}
                            value={field.state.value}
                          >
                            <SelectTrigger
                              aria-invalid={isInvalid}
                              className="w-full"
                              id={field.name}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {playerSexValues.map((sex) => (
                                <SelectItem key={sex} value={sex}>
                                  {sex}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {isInvalid ? (
                            <FieldError errors={field.state.meta.errors} />
                          ) : null}
                        </Field>
                      );
                    }}
                  </form.Field>
                </FieldGroup>

                <FieldGroup>
                  <form.Field name="role">
                    {(field) => {
                      const isInvalid =
                        field.state.meta.isTouched && !field.state.meta.isValid;
                      return (
                        <Field data-invalid={isInvalid}>
                          <FieldLabel htmlFor={field.name}>Role</FieldLabel>
                          <Select
                            onValueChange={(value) => {
                              if (value) {
                                field.handleChange(
                                  value as CreatePlayerFormValues["role"]
                                );
                              }
                            }}
                            value={field.state.value}
                          >
                            <SelectTrigger
                              aria-invalid={isInvalid}
                              className="w-full"
                              id={field.name}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {playerRoleValues.map((role) => (
                                <SelectItem key={role} value={role}>
                                  {role}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {isInvalid ? (
                            <FieldError errors={field.state.meta.errors} />
                          ) : null}
                        </Field>
                      );
                    }}
                  </form.Field>
                </FieldGroup>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <FieldGroup>
                  <form.Field name="battingStance">
                    {(field) => {
                      const isInvalid =
                        field.state.meta.isTouched && !field.state.meta.isValid;
                      return (
                        <Field data-invalid={isInvalid}>
                          <FieldLabel htmlFor={field.name}>
                            Batting Stance
                          </FieldLabel>
                          <Select
                            onValueChange={(value) => {
                              if (value) {
                                field.handleChange(
                                  value as CreatePlayerFormValues["battingStance"]
                                );
                              }
                            }}
                            value={field.state.value}
                          >
                            <SelectTrigger
                              aria-invalid={isInvalid}
                              className="w-full"
                              id={field.name}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {battingStanceValues.map((stance) => (
                                <SelectItem key={stance} value={stance}>
                                  {stance}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {isInvalid ? (
                            <FieldError errors={field.state.meta.errors} />
                          ) : null}
                        </Field>
                      );
                    }}
                  </form.Field>
                </FieldGroup>

                <FieldGroup>
                  <form.Field name="bowlingStance">
                    {(field) => {
                      const isInvalid =
                        field.state.meta.isTouched && !field.state.meta.isValid;
                      return (
                        <Field data-invalid={isInvalid}>
                          <FieldLabel htmlFor={field.name}>
                            Bowling Stance
                          </FieldLabel>
                          <Input
                            aria-invalid={isInvalid}
                            id={field.name}
                            onBlur={field.handleBlur}
                            onChange={(event) =>
                              field.handleChange(event.target.value)
                            }
                            placeholder="e.g. Right arm fast"
                            value={field.state.value ?? ""}
                          />
                          <FieldDescription>
                            Leave empty if the player does not bowl.
                          </FieldDescription>
                          {isInvalid ? (
                            <FieldError errors={field.state.meta.errors} />
                          ) : null}
                        </Field>
                      );
                    }}
                  </form.Field>
                </FieldGroup>
              </div>

              <FieldGroup>
                <form.Field name="nationality">
                  {(field) => {
                    const isInvalid =
                      field.state.meta.isTouched && !field.state.meta.isValid;
                    return (
                      <Field data-invalid={isInvalid}>
                        <FieldLabel htmlFor={field.name}>
                          Nationality
                        </FieldLabel>
                        <Select
                          onValueChange={(value) => {
                            if (value && value !== UNSPECIFIED_NATIONALITY) {
                              field.handleChange(
                                value as CreatePlayerFormValues["nationality"]
                              );
                              return;
                            }

                            field.handleChange(undefined);
                          }}
                          value={field.state.value ?? UNSPECIFIED_NATIONALITY}
                        >
                          <SelectTrigger
                            aria-invalid={isInvalid}
                            className="w-full"
                            id={field.name}
                          >
                            <SelectValue placeholder="Select nationality" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={UNSPECIFIED_NATIONALITY}>
                              Not specified
                            </SelectItem>
                            {COUNTRIES.map((country) => (
                              <SelectItem key={country} value={country}>
                                {country}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FieldDescription>
                          Choose a country from the global country list.
                        </FieldDescription>
                        {isInvalid ? (
                          <FieldError errors={field.state.meta.errors} />
                        ) : null}
                      </Field>
                    );
                  }}
                </form.Field>
              </FieldGroup>

              <div className="grid gap-5 md:grid-cols-2">
                <FieldGroup>
                  <form.Field name="height">
                    {(field) => {
                      const isInvalid =
                        field.state.meta.isTouched && !field.state.meta.isValid;
                      return (
                        <Field data-invalid={isInvalid}>
                          <FieldLabel htmlFor={field.name}>
                            Height (cm)
                          </FieldLabel>
                          <Input
                            aria-invalid={isInvalid}
                            id={field.name}
                            min={1}
                            onBlur={field.handleBlur}
                            onChange={(event) =>
                              field.handleChange(
                                parseOptionalInteger(event.target.value)
                              )
                            }
                            placeholder="e.g. 175"
                            type="number"
                            value={field.state.value ?? ""}
                          />
                          <FieldDescription>Optional</FieldDescription>
                          {isInvalid ? (
                            <FieldError errors={field.state.meta.errors} />
                          ) : null}
                        </Field>
                      );
                    }}
                  </form.Field>
                </FieldGroup>

                <FieldGroup>
                  <form.Field name="weight">
                    {(field) => {
                      const isInvalid =
                        field.state.meta.isTouched && !field.state.meta.isValid;
                      return (
                        <Field data-invalid={isInvalid}>
                          <FieldLabel htmlFor={field.name}>
                            Weight (kg)
                          </FieldLabel>
                          <Input
                            aria-invalid={isInvalid}
                            id={field.name}
                            min={1}
                            onBlur={field.handleBlur}
                            onChange={(event) =>
                              field.handleChange(
                                parseOptionalInteger(event.target.value)
                              )
                            }
                            placeholder="e.g. 72"
                            type="number"
                            value={field.state.value ?? ""}
                          />
                          <FieldDescription>Optional</FieldDescription>
                          {isInvalid ? (
                            <FieldError errors={field.state.meta.errors} />
                          ) : null}
                        </Field>
                      );
                    }}
                  </form.Field>
                </FieldGroup>
              </div>

              <FieldGroup>
                <form.Field name="image">
                  {(field) => {
                    const isInvalid =
                      field.state.meta.isTouched && !field.state.meta.isValid;
                    return (
                      <Field data-invalid={isInvalid}>
                        <FieldLabel htmlFor={field.name}>Image URL</FieldLabel>
                        <Input
                          aria-invalid={isInvalid}
                          id={field.name}
                          onBlur={field.handleBlur}
                          onChange={(event) =>
                            field.handleChange(event.target.value)
                          }
                          placeholder="https://example.com/player.jpg"
                          type="url"
                          value={field.state.value ?? ""}
                        />
                        <FieldDescription>
                          Optional. Use a public image URL.
                        </FieldDescription>
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
                      onClick={() => navigate({ to: "/players" })}
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
                        createPlayerMutation.isPending
                      }
                      size="sm"
                      type="submit"
                    >
                      <Plus />
                      {state.isSubmitting || createPlayerMutation.isPending
                        ? "Creating..."
                        : "Create player"}
                    </Button>
                  </div>
                )}
              </form.Subscribe>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
