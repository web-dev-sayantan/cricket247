import { useMutation, useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { authClient } from "@/lib/auth-client";
import { COUNTRIES } from "@/lib/constants";
import { client, orpc, queryClient } from "@/utils/orpc";

const searchSchema = z.object({
  from: z.string().optional(),
});

const defaultDob = () => {
  const date = new Date();
  date.setFullYear(date.getFullYear() - 18);
  return date.toISOString().split("T")[0] ?? "";
};

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

export const Route = createFileRoute("/onboarding")({
  component: OnboardingRoute,
  validateSearch: searchSchema,
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data) {
      redirect({
        to: "/login",
        throw: true,
      });
    }
  },
});

function OnboardingRoute() {
  const navigate = useNavigate({ from: "/onboarding" });
  const { from } = Route.useSearch();
  const { data: session } = authClient.useSession();
  const { data: status } = useSuspenseQuery(
    orpc.onboardingStatus.queryOptions()
  );

  const [name, setName] = useState(session?.user.name ?? "");
  const [dob, setDob] = useState(defaultDob());
  const [sex, setSex] =
    useState<(typeof playerSexValues)[number]>("Prefer not to say");
  const [role, setRole] = useState<(typeof playerRoleValues)[number]>("Batter");
  const [battingStance, setBattingStance] =
    useState<(typeof battingStanceValues)[number]>("Right handed");
  const [bowlingStance, setBowlingStance] = useState("");
  const [nationality, setNationality] = useState<string>("");
  const [image, setImage] = useState(session?.user.image ?? "");
  const [claimSearch, setClaimSearch] = useState("");
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);
  const [otp, setOtp] = useState("");

  const claimablePlayersQuery = useQuery(
    orpc.claimablePlayers.queryOptions({
      query: claimSearch.length > 1 ? claimSearch : undefined,
    })
  );

  const createProfileMutation = useMutation({
    mutationFn: (input: Parameters<typeof client.createOwnPlayerProfile>[0]) =>
      client.createOwnPlayerProfile(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries();
      navigate({ to: "/dashboard" });
    },
  });

  const markSeenMutation = useMutation({
    mutationFn: () => client.markOnboardingSeen(),
    onSuccess: async () => {
      await queryClient.invalidateQueries();
      navigate({ to: from || "/dashboard" });
    },
  });

  const sendOtpMutation = useMutation({
    mutationFn: (input: Parameters<typeof client.sendClaimOtp>[0]) =>
      client.sendClaimOtp(input),
  });

  const verifyClaimMutation = useMutation({
    mutationFn: (input: Parameters<typeof client.verifyClaimOtpAndLink>[0]) =>
      client.verifyClaimOtpAndLink(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries();
      navigate({ to: "/dashboard" });
    },
  });

  const canCreate = useMemo(() => {
    return name.trim().length >= 2 && dob.length > 0;
  }, [dob, name]);

  if (status.onboardingCompletedAt) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-6 md:px-6 md:py-8">
          <Card className="rounded-xl">
            <CardHeader className="border-b pb-4">
              <h1 className="font-semibold text-xl">Onboarding Complete</h1>
            </CardHeader>
            <CardContent className="space-y-3 pt-5">
              <p className="text-sm">
                Your player profile is already connected.
              </p>
              <Button
                onClick={() => navigate({ to: "/dashboard" })}
                type="button"
              >
                Go to dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-6 md:px-6 md:py-8">
        <header className="space-y-1">
          <h1 className="font-semibold text-2xl tracking-tight md:text-3xl">
            Complete your onboarding
          </h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Create your player profile or claim an existing one.
          </p>
        </header>

        <Card className="rounded-xl">
          <CardHeader className="border-b pb-4">
            <h2 className="font-medium text-lg">Create player profile</h2>
          </CardHeader>
          <CardContent className="space-y-4 pt-5">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="name">Name</FieldLabel>
                <Input
                  id="name"
                  onChange={(event) => setName(event.target.value)}
                  value={name}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="dob">Date of Birth</FieldLabel>
                <Input
                  id="dob"
                  onChange={(event) => setDob(event.target.value)}
                  type="date"
                  value={dob}
                />
              </Field>
            </FieldGroup>
            <div className="grid gap-4 md:grid-cols-2">
              <Field>
                <FieldLabel>Sex</FieldLabel>
                <Select
                  onValueChange={(value) =>
                    setSex(value as (typeof playerSexValues)[number])
                  }
                  value={sex}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select sex" />
                  </SelectTrigger>
                  <SelectContent>
                    {playerSexValues.map((value) => (
                      <SelectItem key={value} value={value}>
                        {value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel>Role</FieldLabel>
                <Select
                  onValueChange={(value) =>
                    setRole(value as (typeof playerRoleValues)[number])
                  }
                  value={role}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {playerRoleValues.map((value) => (
                      <SelectItem key={value} value={value}>
                        {value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel>Batting stance</FieldLabel>
                <Select
                  onValueChange={(value) =>
                    setBattingStance(
                      value as (typeof battingStanceValues)[number]
                    )
                  }
                  value={battingStance}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select batting stance" />
                  </SelectTrigger>
                  <SelectContent>
                    {battingStanceValues.map((value) => (
                      <SelectItem key={value} value={value}>
                        {value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="bowlingStance">Bowling stance</FieldLabel>
                <Input
                  id="bowlingStance"
                  onChange={(event) => setBowlingStance(event.target.value)}
                  placeholder="e.g. Right-arm medium"
                  value={bowlingStance}
                />
              </Field>
              <Field>
                <FieldLabel>Nationality</FieldLabel>
                <Select
                  onValueChange={(value) => {
                    setNationality(value ?? "");
                  }}
                  value={nationality || undefined}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select nationality" />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((country) => (
                      <SelectItem key={country} value={country}>
                        {country}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="image">Image URL</FieldLabel>
                <Input
                  id="image"
                  onChange={(event) => setImage(event.target.value)}
                  value={image ?? ""}
                />
              </Field>
            </div>
            <Button
              disabled={!canCreate || createProfileMutation.isPending}
              onClick={async () => {
                const parsedDob = new Date(`${dob}T00:00:00`);
                if (Number.isNaN(parsedDob.getTime())) {
                  return;
                }

                await createProfileMutation.mutateAsync({
                  battingStance,
                  dob: parsedDob,
                  image: image.trim().length > 0 ? image.trim() : undefined,
                  isWicketKeeper: role === "Wicket Keeper",
                  name: name.trim(),
                  nationality: nationality || undefined,
                  role,
                  sex,
                  bowlingStance: bowlingStance.trim() || undefined,
                });
              }}
              type="button"
            >
              {createProfileMutation.isPending
                ? "Creating..."
                : "Create profile"}
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-xl">
          <CardHeader className="border-b pb-4">
            <h2 className="font-medium text-lg">Claim existing profile</h2>
          </CardHeader>
          <CardContent className="space-y-4 pt-5">
            <Field>
              <FieldLabel htmlFor="claim-search">Search players</FieldLabel>
              <div className="relative">
                <Search className="pointer-events-none absolute top-2.5 left-2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-8"
                  id="claim-search"
                  onChange={(event) => setClaimSearch(event.target.value)}
                  placeholder="Search by player name"
                  value={claimSearch}
                />
              </div>
            </Field>

            <div className="max-h-56 space-y-2 overflow-auto rounded-md border p-2">
              {(claimablePlayersQuery.data ?? []).map((player) => (
                <button
                  className={`w-full rounded-md border px-3 py-2 text-left text-sm transition ${
                    selectedPlayerId === player.id
                      ? "border-primary bg-primary/10"
                      : "border-border hover:bg-accent"
                  }`}
                  key={player.id}
                  onClick={() => setSelectedPlayerId(player.id)}
                  type="button"
                >
                  <div className="font-medium">{player.name}</div>
                  <div className="text-muted-foreground text-xs">
                    {player.role}
                  </div>
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                disabled={!selectedPlayerId || sendOtpMutation.isPending}
                onClick={async () => {
                  if (!selectedPlayerId) {
                    return;
                  }
                  await sendOtpMutation.mutateAsync({
                    playerId: selectedPlayerId,
                  });
                }}
                type="button"
                variant="outline"
              >
                {sendOtpMutation.isPending ? "Sending OTP..." : "Send OTP"}
              </Button>
              <span className="text-muted-foreground text-xs">
                OTP will be sent to {session?.user.email}
              </span>
            </div>

            <Field>
              <FieldLabel htmlFor="claim-otp">Enter OTP</FieldLabel>
              <InputOTP
                id="claim-otp"
                maxLength={6}
                onChange={setOtp}
                value={otp}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                </InputOTPGroup>
                <InputOTPSeparator />
                <InputOTPGroup>
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                </InputOTPGroup>
                <InputOTPSeparator />
                <InputOTPGroup>
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </Field>

            <Button
              disabled={
                !selectedPlayerId ||
                otp.length !== 6 ||
                verifyClaimMutation.isPending
              }
              onClick={async () => {
                if (!selectedPlayerId) {
                  return;
                }

                await verifyClaimMutation.mutateAsync({
                  otp,
                  playerId: selectedPlayerId,
                });
              }}
              type="button"
            >
              {verifyClaimMutation.isPending
                ? "Verifying..."
                : "Verify & claim"}
            </Button>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button
            disabled={markSeenMutation.isPending}
            onClick={async () => {
              await markSeenMutation.mutateAsync();
            }}
            type="button"
            variant="ghost"
          >
            Skip for now
          </Button>
        </div>
      </div>
    </div>
  );
}
