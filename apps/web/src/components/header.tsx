import { Link } from "@tanstack/react-router";
import HamburgerMenu from "./hamburger";
import { ModeToggle } from "./mode-toggle";
import UserMenu from "./user-menu";

export default function Header() {
  const links = [
    { to: "/", label: "Cricket 24/7" },
    { to: "/dashboard", label: "Dashboard" },
  ] as const;

  return (
    <div>
      <div className="flex items-center justify-between px-2 py-1">
        <nav className="flex-1 p-2">
          <Link to={links[0].to}>{links[0].label}</Link>
        </nav>
        <HamburgerMenu />
        <nav className="hidden gap-4 text-lg md:flex">
          {links.map(({ to, label }) => (
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
