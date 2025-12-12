import { Link } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";
import HamburgerMenu from "./hamburger";
import { ModeToggle } from "./mode-toggle";
import UserMenu from "./user-menu";

export default function Header() {
  const { data: session, isPending } = authClient.useSession();
  const protectedLinks = [{ to: "/dashboard", label: "Dashboard" }] as const;
  const publicLinks = [
    { to: "/matches", label: "Matches" },
    // { to: "/teams", label: "Teams" },
    // { to: "/players", label: "Players" },
    // { to: "/news", label: "News" },
  ] as const;

  return (
    <div>
      <div className="flex items-center justify-between px-2 py-1">
        <nav className="flex-1 p-2">
          <Link to={"/"}>Cricket 24/7</Link>
        </nav>
        <HamburgerMenu className="md:hidden" />
        <nav className="hidden gap-4 text-lg md:flex">
          {publicLinks.map(({ to, label }) => (
            <Link key={to} to={to}>
              {label}
            </Link>
          ))}
          {session &&
            protectedLinks.map(({ to, label }) => (
              <Link key={to} to={to}>
                {label}
              </Link>
            ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <ModeToggle />
          <UserMenu />
        </div>
      </div>
      <hr />
    </div>
  );
}
