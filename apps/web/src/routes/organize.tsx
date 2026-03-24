import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BarChart3,
  Bolt,
  CalendarCheck2,
  ChevronLeft,
  Trophy,
  Users,
  Wifi,
} from "lucide-react";
import type { ReactNode } from "react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/organize")({
  component: OrganizeComponent,
});

function OrganizeComponent() {
  return (
    <div className="hero-surface overflow-x-hidden">
      <main
        className="mx-auto w-full max-w-7xl space-y-28 px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20"
        id="main-content"
      >
        {/* ── HERO ── */}
        <section
          aria-labelledby="org-hero-title"
          className="grid items-center gap-12 pt-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:gap-16"
        >
          <div className="relative z-10 animate-stagger-1 space-y-8">
            <div className="angled-cut inline-flex w-fit bg-primary/35 p-px shadow-[0_0_15px_rgba(var(--color-primary)/0.2)]">
              <div className="angled-cut inline-flex items-center gap-3 bg-[color-mix(in_oklab,var(--color-background)_86%,var(--color-primary)_14%)] px-3 py-1.5 font-bold text-primary text-xs uppercase tracking-widest">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                </span>
                Tournament Management
              </div>
            </div>

            <div className="space-y-5">
              <h1
                className="text-balance font-normal font-serif text-5xl text-foreground leading-[1.05] tracking-tight drop-shadow-sm sm:text-6xl lg:text-7xl"
                id="org-hero-title"
              >
                Run Your League,{" "}
                <span className="relative z-10 inline-block text-accent">
                  Ball by Ball.
                  <span className="slanted-wavy absolute -bottom-2 left-0 z-[-1] h-1 w-full bg-primary" />
                </span>
              </h1>
              <p className="max-w-xl font-sans text-lg text-muted-foreground leading-relaxed sm:text-xl">
                The professional-grade platform for recreational and corporate
                cricket leagues. Manage fixtures, track live scores, and deliver
                a seamless experience for your players and fans.
              </p>
            </div>

            <div className="flex flex-col gap-4 pt-4 sm:flex-row">
              <Link
                className="angled-cut group inline-flex bg-primary/40 p-px shadow-[0_0_20px_rgba(var(--color-primary)/0.3)] transition-shadow hover:shadow-[0_0_30px_rgba(var(--color-primary)/0.5)]"
                to="/login"
              >
                <span
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "angled-cut h-14 border-transparent bg-primary px-8 text-base"
                  )}
                >
                  Create Free Account
                  <Bolt className="ml-2 size-4" />
                </span>
              </Link>
              <Link
                className="angled-cut group inline-flex bg-border/70 p-px"
                to="/matches"
              >
                <span
                  className={cn(
                    buttonVariants({ size: "lg", variant: "outline" }),
                    "angled-cut h-14 border-transparent bg-background/94 px-8 text-base transition-colors group-hover:bg-accent/10 group-hover:text-accent"
                  )}
                >
                  See a Live Match
                </span>
              </Link>
            </div>
          </div>

          <figure className="group relative aspect-4/5 w-full animate-stagger-2">
            <div className="angled-cut-br absolute inset-0 z-0 translate-x-4 translate-y-4 bg-primary/20 transition-transform duration-500 group-hover:translate-x-6 group-hover:translate-y-6" />
            <div className="angled-cut-br relative z-10 h-full w-full overflow-hidden border-2 border-foreground/10 bg-black/40">
              <img
                alt="Cricket teams on the field during an organised tournament"
                className="h-full w-full object-cover opacity-80 mix-blend-overlay contrast-125 saturate-150 filter transition-all duration-700 group-hover:scale-105 group-hover:opacity-100 group-hover:mix-blend-normal"
                height={1200}
                loading="lazy"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCIvdMNfmHQmC-njsrK454hNGBMEWD0lG1m1x-7ZfGW1UUjsp3gNhpDuYd0wXtuuLg-YrDi80WeB9d92yxWg75IfE6wthJuSg3xp0NV9IZsKQUaGumjystZMagh6Z_4Pe-fEFNG2-Rt43MOzB3-2Dgda6A9ex95eblMop0NXxy-Q8LtFqQ7l1qbcGMFAo9DlkxmkVNUj3tYN50ZA6pRiMnz6sBut39pYLe7MRZPQmBf7KpabF3EIOccZ59GUnKxnL9hDMGg4181D_4"
                width={960}
              />
              <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-background/90 via-background/20 to-transparent" />

              <figcaption className="absolute inset-x-0 bottom-0 flex items-end p-6">
                <div className="angled-cut w-full border border-border bg-background/80 p-4 shadow-xl backdrop-blur-md">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="mb-1 font-bold text-[10px] text-primary uppercase tracking-widest">
                        Tournament Active
                      </p>
                      <p className="font-normal font-serif text-foreground text-lg">
                        Summer Cricket League 2026
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold font-mono text-xl tracking-tighter">
                        16
                      </p>
                      <p className="mt-0.5 font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
                        Teams
                      </p>
                    </div>
                  </div>
                </div>
              </figcaption>
            </div>
          </figure>
        </section>

        {/* ── ORGANIZER FEATURES ── */}
        <section
          aria-labelledby="org-features-title"
          className="animate-stagger-3 space-y-12"
        >
          <div className="max-w-2xl space-y-4">
            <h2
              className="font-normal font-serif text-4xl text-foreground tracking-tight sm:text-5xl"
              id="org-features-title"
            >
              Tournament <span className="text-primary">Mastery</span>
            </h2>
            <p className="font-sans text-lg text-muted-foreground">
              Everything you need to orchestrate professional-grade tournaments
              — without the overhead.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            <OrgFeatureCard
              description="Scorers enter each delivery and it reflects live on every device — no delays, no manual syncing, no confusion."
              icon={<Wifi aria-hidden="true" className="size-6" />}
              title="Zero-Lag Scoring"
            />
            <OrgFeatureCard
              description="Full scorecards, partnership totals, economy rates, and player averages — all generated automatically from live data."
              icon={<BarChart3 aria-hidden="true" className="size-6" />}
              title="Complete Analytics"
            />
            <OrgFeatureCard
              description="Build your roster, manage player availability, assign squads to matches, and keep your bench clear."
              icon={<Users aria-hidden="true" className="size-6" />}
              title="Full Squad Control"
            />
          </div>
        </section>

        {/* ── WHY ORGANIZERS CHOOSE US ── */}
        <section
          aria-labelledby="org-why-title"
          className="relative animate-stagger-4 space-y-12"
        >
          <div className="absolute top-10 -left-10 z-0 block h-40 w-40 rounded-full bg-accent/10 blur-3xl dark:hidden" />
          <div className="relative z-10 max-w-3xl space-y-4">
            <h2
              className="font-normal font-serif text-4xl tracking-tight sm:text-5xl"
              id="org-why-title"
            >
              Built for the{" "}
              <span className="text-accent underline decoration-4 decoration-primary underline-offset-8">
                Modern Organiser
              </span>
            </h2>
            <p className="font-sans text-lg text-muted-foreground">
              Designed for explosive T20 energy with the reliability of a test
              match.
            </p>
          </div>
          <div className="relative z-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <OrgWhyCard
              description="Updates propagate to every player's phone in under a second — your entire field stays synchronised."
              icon={
                <Bolt
                  aria-hidden="true"
                  className="size-6 drop-shadow-[0_0_8px_currentColor]"
                />
              }
              title="Real-Time Everywhere"
            />
            <OrgWhyCard
              description="End-of-match reports, player leaderboards, and head-to-head stats that your participants will actually read."
              icon={
                <Trophy
                  aria-hidden="true"
                  className="size-6 drop-shadow-[0_0_8px_currentColor]"
                />
              }
              title="Reports They'll Love"
            />
            <OrgWhyCard
              description="Create a tournament, set the format, draw the fixtures, and go — from first meeting to toss in minutes."
              icon={
                <CalendarCheck2
                  aria-hidden="true"
                  className="size-6 drop-shadow-[0_0_8px_currentColor]"
                />
              }
              title="Setup in Minutes"
            />
          </div>
        </section>

        {/* ── CTA ── */}
        <section
          aria-labelledby="org-cta-title"
          className="animate-stagger-4 pt-10"
        >
          <div className="angled-cut-br group relative overflow-hidden border border-primary/30 bg-card p-10 text-center shadow-2xl sm:p-16">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMDUiLz4KPC9zdmc+')] opacity-20 transition-opacity group-hover:opacity-40" />
            <div className="absolute top-0 right-0 z-0 h-64 w-64 bg-primary/20 blur-3xl" />
            <div className="absolute bottom-0 left-0 z-0 h-64 w-64 bg-accent/20 blur-3xl" />
            <div className="relative z-10 mx-auto max-w-3xl space-y-6">
              <h2
                className="font-normal font-serif text-4xl tracking-tight drop-shadow-md sm:text-5xl"
                id="org-cta-title"
              >
                Command Your Next Tournament.
              </h2>
              <p className="font-sans text-muted-foreground sm:text-xl">
                Take the pitch with confidence. Over a hundred leagues run their
                game with Cricket 24/7.
              </p>
              <div className="pt-6">
                <Link
                  className="angled-cut group inline-flex bg-primary/40 p-px shadow-[0_0_15px_rgba(var(--color-primary)/0.4)] hover:shadow-[0_0_25px_rgba(var(--color-primary)/0.6)]"
                  to="/login"
                >
                  <span
                    className={cn(
                      buttonVariants({ size: "lg" }),
                      "angled-cut h-14 border-transparent bg-primary px-10 text-base"
                    )}
                  >
                    Start Free Trial
                  </span>
                </Link>
              </div>
              <p className="font-mono text-muted-foreground text-sm tracking-widest opacity-70">
                NO CREDIT CARD REQUIRED. 14-DAY TRIAL.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 mt-16 border-border border-t bg-background">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center gap-6 px-4 py-10 text-center sm:flex-row sm:justify-between sm:px-6 sm:text-left lg:px-8">
          <div className="flex flex-col space-y-1">
            <p className="font-normal font-serif text-xl tracking-wide">
              Cricket <span className="text-primary">24/7</span>
            </p>
            <p className="text-muted-foreground text-xs uppercase tracking-widest">
              © 2026 All rights reserved
            </p>
          </div>
          <nav
            aria-label="Footer links"
            className="flex flex-wrap items-center justify-center gap-6 font-medium font-sans text-sm uppercase tracking-wide sm:gap-8"
          >
            <Link
              className="flex items-center gap-1.5 font-semibold text-muted-foreground transition-colors hover:text-primary"
              to="/"
            >
              <ChevronLeft aria-hidden="true" className="size-3.5" />
              Fan View
            </Link>
            <a
              className="text-muted-foreground transition-colors hover:text-primary"
              href="/privacy"
            >
              Privacy
            </a>
            <a
              className="text-muted-foreground transition-colors hover:text-primary"
              href="/terms"
            >
              Terms
            </a>
            <a
              className="text-muted-foreground transition-colors hover:text-primary"
              href="/support"
            >
              Support
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}

function OrgFeatureCard({
  description,
  icon,
  title,
}: {
  description: string;
  icon: ReactNode;
  title: string;
}) {
  return (
    <article className="angled-cut glass-surface group relative space-y-4 overflow-hidden p-6 backdrop-blur-xl transition-colors hover:border-primary/50">
      <div className="absolute -top-4 -right-4 h-24 w-24 rounded-full bg-primary/5 blur-2xl transition-colors group-hover:bg-primary/20" />
      <div className="angled-cut relative z-10 inline-flex border border-primary/20 bg-primary/10 p-3 text-primary shadow-[0_0_10px_rgba(var(--color-primary)/0.2)]">
        {icon}
      </div>
      <h3 className="relative z-10 font-semibold text-xl">{title}</h3>
      <p className="relative z-10 font-sans text-muted-foreground text-sm leading-relaxed">
        {description}
      </p>
    </article>
  );
}

function OrgWhyCard({
  description,
  icon,
  title,
}: {
  description: string;
  icon: ReactNode;
  title: string;
}) {
  return (
    <article className="angled-cut group border border-border/60 bg-card/60 p-6 backdrop-blur-lg transition-all duration-300 hover:border-accent/40 hover:shadow-[0_0_30px_rgba(var(--color-accent)/0.15)]">
      <div className="angled-cut mb-4 inline-flex border border-accent/20 bg-accent/10 p-3 text-accent shadow-[0_0_10px_rgba(var(--color-accent)/0.2)] transition-transform duration-300 group-hover:scale-110">
        {icon}
      </div>
      <h3 className="font-semibold text-xl">{title}</h3>
      <p className="mt-2 font-sans text-muted-foreground text-sm leading-relaxed">
        {description}
      </p>
    </article>
  );
}
