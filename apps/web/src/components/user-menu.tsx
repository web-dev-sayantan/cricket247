import { Link, useNavigate } from "@tanstack/react-router";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { buttonVariants } from "./ui/button";
import { Skeleton } from "./ui/skeleton";

const whitespaceRegex = /\s+/;

const getUserInitials = (name: string) => {
  const segments = name
    .trim()
    .split(whitespaceRegex)
    .filter((segment) => segment.length > 0);

  if (segments.length === 0) {
    return "U";
  }

  if (segments.length === 1) {
    return segments[0].slice(0, 2).toUpperCase();
  }

  const first = segments[0][0] ?? "";
  const last = segments.at(-1)?.[0] ?? "";
  return `${first}${last}`.toUpperCase();
};

export default function UserMenu() {
  const navigate = useNavigate();
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return <Skeleton className="h-8.5 w-8.5" />;
  }

  if (!session) {
    return (
      <Link className={buttonVariants({ variant: "outline" })} to="/login">
        Sign In
      </Link>
    );
  }

  const isAdmin =
    (session.user as { role?: string } | undefined)?.role === "admin";
  const displayName = session.user.name?.trim() || session.user.email || "User";
  const userImage = session.user.image?.trim();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Open user menu"
        className={cn(
          buttonVariants({ variant: "outline", size: "squareLg" }),
          "size-8"
        )}
        title={displayName}
      >
        {userImage ? (
          <img
            alt={displayName}
            className="size-full object-cover"
            height={32}
            src={userImage}
            width={32}
          />
        ) : (
          <span
            aria-hidden="true"
            className="grid size-full place-items-center border border-border bg-muted font-semibold text-xs uppercase"
          >
            {getUserInitials(displayName)}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent className="bg-card">
        <DropdownMenuGroup>
          <DropdownMenuLabel>My Account</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>{session.user.email}</DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              navigate({ to: "/account" });
            }}
          >
            Account
          </DropdownMenuItem>
          {isAdmin ? (
            <DropdownMenuItem
              onClick={() => {
                navigate({
                  to: "/account",
                  hash: "bulk-player-import",
                });
              }}
            >
              Bulk Player Import
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem
            onClick={() => {
              authClient.signOut({
                fetchOptions: {
                  onSuccess: () => {
                    // navigate({
                    // 	to: "/",
                    // });
                  },
                },
              });
            }}
            variant="destructive"
          >
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
