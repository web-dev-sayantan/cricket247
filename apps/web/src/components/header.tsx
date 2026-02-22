import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { ModeToggle } from "./mode-toggle";
import { Button } from "./ui/button";
import UserMenu from "./user-menu";

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const { data: session } = authClient.useSession();

  const protectedLinks = [{ to: "/dashboard", label: "Dashboard" }] as const;
  const publicLinks = [{ to: "/matches", label: "Matches" }] as const;

  const allLinks = [...publicLinks, ...(session ? protectedLinks : [])];

  // Prevent background scrolling when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-border/40 border-b bg-background/80 backdrop-blur-md transition-all duration-300">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
          {/* Left: Brand */}
          <div className="flex shrink-0 items-center">
            <Link className="group flex items-center gap-2" to="/">
              <span className="font-bold text-lg tracking-tight transition-colors group-hover:text-primary">
                Cricket 24/7
              </span>
            </Link>
          </div>

          {/* Middle: Desktop Nav */}
          <nav className="hidden h-full flex-1 items-center justify-center gap-8 font-medium text-sm md:flex">
            {allLinks.map(({ to, label }) => (
              <Link
                className={cn(
                  "relative flex h-full items-center text-muted-foreground transition-colors hover:text-foreground",
                  "[&.active]:text-foreground [&.active]:after:absolute [&.active]:after:bottom-0 [&.active]:after:left-0 [&.active]:after:h-[2px] [&.active]:after:w-full [&.active]:after:bg-primary"
                )}
                key={to}
                to={to}
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* Right: Desktop Actions */}
          <div className="hidden shrink-0 items-center gap-3 md:flex">
            <ModeToggle />
            <UserMenu />
          </div>

          {/* Mobile: Menu Trigger */}
          <button
            aria-label="Open menu"
            className="-mr-2 flex items-center justify-center rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground md:hidden"
            onClick={() => setIsOpen(true)}
            type="button"
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>
      </header>

      {/* Mobile Sidebar Overlay */}
      <button
        aria-label="Close menu"
        className={cn(
          "fixed inset-0 z-50 bg-background/80 backdrop-blur-sm transition-all duration-300 md:hidden",
          isOpen
            ? "pointer-events-auto visible opacity-100"
            : "pointer-events-none invisible opacity-0"
        )}
        onClick={() => setIsOpen(false)}
        type="button"
      />

      {/* Mobile Sidebar Content */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[85%] max-w-sm flex-col border-border/20 border-r bg-background shadow-2xl transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] md:hidden",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center px-6">
          <button
            aria-label="Close menu"
            className="-ml-2 rounded-full p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            onClick={() => setIsOpen(false)}
            type="button"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex flex-1 flex-col justify-center overflow-y-auto px-8 py-8">
          <nav className="flex flex-col gap-8">
            {allLinks.map(({ to, label }) => (
              <Link
                className={cn(
                  "font-semibold text-2xl text-muted-foreground tracking-tight transition-all duration-300 hover:translate-x-2 hover:text-foreground",
                  "[&.active]:translate-x-2 [&.active]:text-foreground"
                )}
                key={to}
                onClick={() => setIsOpen(false)}
                to={to}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="mt-auto border-border/10 border-t bg-accent/10 px-8 py-8">
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <span className="font-medium text-muted-foreground text-sm">
                Appearance
              </span>
              <ModeToggle />
            </div>

            <div className="w-full pt-2">
              {session ? (
                <UserMenu />
              ) : (
                <Button
                  className="w-full rounded-full shadow-sm transition-transform hover:scale-[1.02]"
                  size="lg"
                >
                  <Link to="/login">Sign In</Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
