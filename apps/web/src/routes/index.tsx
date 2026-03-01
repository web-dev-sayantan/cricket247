import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BarChart3,
  Bolt,
  CalendarCheck2,
  Trophy,
  Users,
  Wifi,
} from "lucide-react";
import type { ReactNode } from "react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  component: HomeComponent,
});

function HomeComponent() {
  return (
    <div className="hero-surface">
      <main
        className="mx-auto w-full max-w-7xl space-y-20 px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16"
        id="main-content"
      >
        <section
          aria-labelledby="hero-title"
          className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.88fr)] lg:gap-12"
        >
          <div className="space-y-8">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 font-semibold text-emerald-700 text-xs dark:text-emerald-300">
              2026 EDITION AVAILABLE NOW
            </div>
            <div className="space-y-4">
              <h1
                className="text-balance font-extrabold text-4xl leading-tight tracking-tight sm:text-5xl lg:text-6xl"
                id="hero-title"
              >
                Elevate Your{" "}
                <span className="bg-gradient-to-r from-primary to-sky-400 bg-clip-text text-transparent">
                  Tournament
                </span>{" "}
                Experience
              </h1>
              <p className="max-w-xl text-base text-muted-foreground leading-relaxed sm:text-lg">
                The premium choice for recreational and corporate cricket
                leagues. Professional-grade precision with fast, reliable
                workflows.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                className={buttonVariants({
                  className:
                    "h-12 w-full rounded-lg px-6 text-sm shadow-sm sm:w-auto",
                  size: "lg",
                })}
                to="/login"
              >
                Get Started
              </Link>
              <Link
                className={buttonVariants({
                  className: "h-12 w-full rounded-lg px-6 text-sm sm:w-auto",
                  size: "lg",
                  variant: "outline",
                })}
                to="/matches"
              >
                View Matches
              </Link>
            </div>
          </div>

          <figure className="glass-surface relative overflow-hidden rounded-2xl">
            <img
              alt="A cricket stadium at dusk with teams on the field"
              className="aspect-[4/5] w-full object-cover"
              height={1200}
              loading="lazy"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCIvdMNfmHQmC-njsrK454hNGBMEWD0lG1m1x-7ZfGW1UUjsp3gNhpDuYd0wXtuuLg-YrDi80WeB9d92yxWg75IfE6wthJuSg3xp0NV9IZsKQUaGumjystZMagh6Z_4Pe-fEFNG2-Rt43MOzB3-2Dgda6A9ex95eblMop0NXxy-Q8LtFqQ7l1qbcGMFAo9DlkxmkVNUj3tYN50ZA6pRiMnz6sBut39pYLe7MRZPQmBf7KpabF3EIOccZ59GUnKxnL9hDMGg4181D_4"
              width={960}
            />
            <figcaption className="absolute inset-x-4 bottom-4 rounded-lg border border-white/20 bg-black/45 p-3 text-white backdrop-blur-sm">
              <p className="text-[11px] text-white/80 uppercase tracking-wide">
                Current Match
              </p>
              <p className="font-semibold text-base">Lions vs Warriors</p>
            </figcaption>
          </figure>
        </section>

        <section aria-labelledby="mastery-title" className="space-y-6">
          <div className="space-y-2">
            <h2
              className="font-bold text-3xl tracking-tight"
              id="mastery-title"
            >
              Tournament Mastery
            </h2>
            <p className="max-w-2xl text-muted-foreground">
              Everything you need to run professional-level tournaments.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <FeatureCard
              description="Real-time updates synchronize instantly across spectator and scorer devices."
              icon={<Wifi aria-hidden="true" className="size-6" />}
              title="Live Ball-by-Ball"
            />
            <FeatureCard
              description="Track player and team performance with clear scorecards and summaries."
              icon={<BarChart3 aria-hidden="true" className="size-6" />}
              title="Advanced Statistics"
            />
            <FeatureCard
              description="Organize rosters and availability with straightforward workflows."
              icon={<Users aria-hidden="true" className="size-6" />}
              title="Team Management"
            />
          </div>
        </section>

        <section aria-labelledby="why-title" className="space-y-6">
          <div className="space-y-2">
            <h2 className="font-bold text-3xl tracking-tight" id="why-title">
              Why Leading Leagues Choose Us
            </h2>
            <p className="max-w-3xl text-muted-foreground">
              Designed for modern cricket operations with a focus on speed,
              reliability, and clarity.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <ReasonCard
              description="Push live data to fans and staff without lag."
              icon={<Bolt aria-hidden="true" className="size-5" />}
              title="Ultra Responsive"
            />
            <ReasonCard
              description="Generate rankings and trends from your match data."
              icon={<Trophy aria-hidden="true" className="size-5" />}
              title="Data-Driven Insights"
            />
            <ReasonCard
              description="Prioritize readability for scorers, admins, and viewers."
              icon={<CalendarCheck2 aria-hidden="true" className="size-5" />}
              title="Operational Clarity"
            />
          </div>
        </section>

        <section aria-labelledby="cta-title">
          <div className="glass-surface rounded-2xl p-6 text-center sm:p-10">
            <div className="mx-auto max-w-3xl space-y-4">
              <h2
                className="font-extrabold text-3xl tracking-tight"
                id="cta-title"
              >
                Ready to transform your league?
              </h2>
              <p className="text-muted-foreground sm:text-lg">
                Join leagues managing their tournaments with Cricket 24/7.
              </p>
              <div className="pt-2">
                <Link
                  className={buttonVariants({
                    className: "h-12 rounded-lg px-8 text-sm",
                    size: "lg",
                  })}
                  to="/login"
                >
                  Start Free Trial
                </Link>
              </div>
              <p className="text-muted-foreground text-xs">
                No credit card required. 14-day free trial.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t bg-background/70">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center gap-4 px-4 py-8 text-center sm:flex-row sm:justify-between sm:px-6 sm:text-left lg:px-8">
          <p className="font-semibold">Cricket 24/7</p>
          <nav
            aria-label="Footer links"
            className="flex items-center gap-4 text-sm"
          >
            <a className="hover:text-foreground/80" href="/privacy">
              Privacy
            </a>
            <a className="hover:text-foreground/80" href="/terms">
              Terms
            </a>
            <a className="hover:text-foreground/80" href="/support">
              Support
            </a>
          </nav>
          <p className="text-muted-foreground text-xs">
            © 2026 Cricket 24/7 App. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  description,
  icon,
  title,
}: {
  description: string;
  icon: ReactNode;
  title: string;
}) {
  return (
    <article className="glass-surface space-y-3 rounded-xl p-5">
      <div className="inline-flex rounded-md bg-primary/10 p-2 text-primary">
        {icon}
      </div>
      <h3 className="font-semibold text-lg">{title}</h3>
      <p className="text-muted-foreground text-sm leading-relaxed">
        {description}
      </p>
    </article>
  );
}

function ReasonCard({
  description,
  icon,
  title,
}: {
  description: string;
  icon: ReactNode;
  title: string;
}) {
  return (
    <article className="rounded-xl border bg-card p-5">
      <div className="mb-3 inline-flex rounded-md bg-muted p-2 text-primary">
        {icon}
      </div>
      <h3 className="font-semibold text-base">{title}</h3>
      <p className={cn("mt-1 text-muted-foreground text-sm leading-relaxed")}>
        {description}
      </p>
    </article>
  );
}
