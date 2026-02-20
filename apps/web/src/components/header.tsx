import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useState, useEffect } from "react";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { ModeToggle } from "./mode-toggle";
import { Button } from "./ui/button";
import UserMenu from "./user-menu";

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const { data: session } = authClient.useSession();

  const protectedLinks = [{ to: "/dashboard", label: "Dashboard" }] as const;
  const publicLinks = [
    { to: "/matches", label: "Matches" },
  ] as const;

  const allLinks = [
    ...publicLinks,
    ...(session ? protectedLinks : []),
  ];

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
      <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/80 backdrop-blur-md transition-all duration-300">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
          {/* Left: Brand */}
          <div className="flex shrink-0 items-center">
            <Link to="/" className="flex items-center gap-2 group">
              <span className="font-bold text-lg tracking-tight transition-colors group-hover:text-primary">
                Cricket 24/7
              </span>
            </Link>
          </div>

          {/* Middle: Desktop Nav */}
          <nav className="hidden md:flex flex-1 items-center justify-center gap-8 text-sm font-medium h-full">
            {allLinks.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className={cn(
                  "relative flex h-full items-center text-muted-foreground transition-colors hover:text-foreground",
                  "[&.active]:text-foreground [&.active]:after:absolute [&.active]:after:bottom-0 [&.active]:after:left-0 [&.active]:after:h-[2px] [&.active]:after:w-full [&.active]:after:bg-primary"
                )}
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* Right: Desktop Actions */}
          <div className="hidden md:flex shrink-0 items-center gap-3">
            <ModeToggle />
            <UserMenu />
          </div>

          {/* Mobile: Menu Trigger */}
          <button
            onClick={() => setIsOpen(true)}
            className="md:hidden flex items-center justify-center rounded-md p-2 -mr-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            aria-label="Open menu"
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>
      </header>

      {/* Mobile Sidebar Overlay */}
      <div
        className={cn(
          "fixed inset-0 z-50 bg-background/80 backdrop-blur-sm transition-all duration-300 md:hidden",
          isOpen ? "opacity-100 visible pointer-events-auto" : "opacity-0 invisible pointer-events-none"
        )}
        onClick={() => setIsOpen(false)}
      />

      {/* Mobile Sidebar Content */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-[85%] max-w-sm bg-background border-r border-border/20 shadow-2xl transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] md:hidden flex flex-col",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center px-6">
          <button
            onClick={() => setIsOpen(false)}
            className="rounded-full p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors -ml-2"
            aria-label="Close menu"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex-1 flex flex-col justify-center px-8 py-8 overflow-y-auto">
          <nav className="flex flex-col gap-8">
            {allLinks.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setIsOpen(false)}
                className={cn(
                  "text-2xl font-semibold tracking-tight text-muted-foreground transition-all duration-300 hover:text-foreground hover:translate-x-2",
                  "[&.active]:text-foreground [&.active]:translate-x-2"
                )}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="mt-auto px-8 py-8 border-t border-border/10 bg-accent/10">
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Appearance</span>
              <ModeToggle />
            </div>
            
            <div className="pt-2 w-full" onClick={(e) => {
              if ((e.target as HTMLElement).closest('a') || (e.target as HTMLElement).closest('button')) {
                setIsOpen(false);
              }
            }}>
              {session ? (
                <UserMenu />
              ) : (
                <Button asChild className="w-full rounded-full transition-transform hover:scale-[1.02] shadow-sm" size="lg">
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
