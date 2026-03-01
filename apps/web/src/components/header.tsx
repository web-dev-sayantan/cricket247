import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { ModeToggle } from "./mode-toggle";
import { buttonVariants } from "./ui/button";
import UserMenu from "./user-menu";

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const { data: session } = authClient.useSession();

  const protectedLinks = [{ to: "/dashboard", label: "Dashboard" }] as const;
  const publicLinks = [{ to: "/matches", label: "Matches" }] as const;
  const allLinks = [...publicLinks, ...(session ? protectedLinks : [])];

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", onEscape);
    return () => {
      window.removeEventListener("keydown", onEscape);
    };
  }, [isOpen]);

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link
            className="font-bold text-lg tracking-tight transition-colors hover:text-primary"
            to="/"
          >
            Cricket 24/7
          </Link>

          <nav
            aria-label="Primary navigation"
            className="hidden items-center gap-6 font-medium text-sm md:flex"
          >
            {allLinks.map(({ to, label }) => (
              <Link
                className={cn(
                  "relative text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                  "[&.active]:text-foreground [&.active]:after:absolute [&.active]:after:-bottom-[1.15rem] [&.active]:after:left-0 [&.active]:after:h-0.5 [&.active]:after:w-full [&.active]:after:bg-primary"
                )}
                key={to}
                onClick={() => setIsOpen(false)}
                to={to}
              >
                {label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            <ModeToggle />
            <UserMenu />
          </div>

          <button
            aria-controls="mobile-navigation"
            aria-expanded={isOpen}
            aria-label={isOpen ? "Close menu" : "Open menu"}
            className="inline-flex items-center justify-center rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 md:hidden"
            onClick={() => setIsOpen((prev) => !prev)}
            type="button"
          >
            {isOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </header>

      <button
        aria-hidden={!isOpen}
        className={cn(
          "fixed inset-0 z-40 bg-background/60 transition-opacity md:hidden",
          isOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        )}
        onClick={() => setIsOpen(false)}
        tabIndex={-1}
        type="button"
      />

      <div
        aria-label="Mobile navigation"
        aria-modal="true"
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[min(86vw,22rem)] flex-col border-r bg-background p-6 shadow-xl transition-transform duration-300 md:hidden",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
        id="mobile-navigation"
        role="dialog"
      >
        <div className="mb-6 flex items-center justify-between border-b pb-4">
          <span className="font-semibold text-base">Navigation</span>
          <button
            aria-label="Close mobile navigation"
            className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
            onClick={() => setIsOpen(false)}
            type="button"
          >
            <X className="size-4" />
          </button>
        </div>

        <nav aria-label="Mobile primary navigation" className="grid gap-2">
          {allLinks.map(({ to, label }) => (
            <Link
              className={cn(
                "rounded-md px-3 py-2 font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                "[&.active]:bg-muted [&.active]:text-foreground"
              )}
              key={to}
              onClick={() => setIsOpen(false)}
              to={to}
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="mt-auto grid gap-3 border-t pt-4">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-sm">Appearance</span>
            <ModeToggle />
          </div>
          {session ? (
            <UserMenu />
          ) : (
            <Link
              className={buttonVariants({ className: "w-full", size: "sm" })}
              onClick={() => setIsOpen(false)}
              to="/login"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </>
  );
}
