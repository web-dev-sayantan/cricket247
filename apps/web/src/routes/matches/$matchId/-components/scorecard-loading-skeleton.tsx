import { Skeleton } from "@/components/ui/skeleton";

export function ScorecardLoadingSkeleton() {
  const battingRowKeys = ["bat-1", "bat-2", "bat-3", "bat-4"] as const;
  const bowlingRowKeys = ["bowl-1", "bowl-2", "bowl-3"] as const;
  const wicketKeys = ["wicket-1", "wicket-2", "wicket-3"] as const;

  return (
    <main
      aria-busy="true"
      className="page-surface mx-auto flex size-full max-w-4xl flex-col"
      id="main-content"
    >
      {/* Hero header */}
      <header className="hero-surface animate-stagger-1 border-border/40 border-b px-4 pt-8 pb-6 md:px-8">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-3">
            <Skeleton className="h-9 w-52 sm:w-64" />
            <div className="flex items-center gap-3">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
          <Skeleton className="h-8 w-24" />
        </div>
      </header>

      {/* Innings tabs */}
      <nav
        aria-label="Select innings"
        className="hide-scrollbar animate-stagger-2 overflow-x-auto border-border/40 border-b bg-card/50 px-4 md:px-8"
      >
        <div className="flex gap-0 py-3.5">
          <Skeleton className="mx-5 h-5 w-28" />
          <Skeleton className="mx-5 h-5 w-28" />
        </div>
      </nav>

      <div className="flex-1 pb-16">
        {/* Score hero */}
        <section className="animate-stagger-2 px-4 py-10 md:px-8">
          <div className="space-y-2">
            <Skeleton className="h-3.5 w-32" />
            <div className="flex items-baseline gap-2">
              <Skeleton className="h-16 w-28 md:h-20 md:w-36" />
              <Skeleton className="h-10 w-10" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
        </section>

        {/* Batting */}
        <section className="animate-stagger-3 [contain-intrinsic-size:420px] [content-visibility:auto]">
          <div className="border-border/40 border-y bg-muted/30 px-4 py-2.5 md:px-8">
            <Skeleton className="h-3 w-24" />
          </div>
          <div className="divide-y divide-border/20">
            {battingRowKeys.map((key) => (
              <div
                className="grid grid-cols-[1fr_auto] items-center gap-4 px-4 py-3 md:grid-cols-[1fr_3.5rem_2.5rem_2.5rem_3.5rem] md:px-8"
                key={key}
              >
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-40" />
                </div>
                <Skeleton className="h-4 w-14 justify-self-end" />
                <Skeleton className="hidden h-4 w-6 justify-self-end md:block" />
                <Skeleton className="hidden h-4 w-6 justify-self-end md:block" />
                <Skeleton className="hidden h-3 w-10 justify-self-end md:block" />
              </div>
            ))}
          </div>
        </section>

        {/* Extras + Bowling */}
        <section className="animate-stagger-4 [contain-intrinsic-size:360px] [content-visibility:auto]">
          <div className="border-border/40 border-y bg-muted/10 px-4 py-3 md:px-8">
            <Skeleton className="h-4 w-56" />
          </div>
          <div className="border-border/40 border-b bg-muted/30 px-4 py-2.5 md:px-8">
            <Skeleton className="h-3 w-20" />
          </div>
          <div className="divide-y divide-border/20">
            {bowlingRowKeys.map((key) => (
              <div
                className="grid grid-cols-[1fr_2.5rem_2.5rem_2.5rem] items-center gap-4 px-4 py-3 md:grid-cols-[1fr_3rem_3rem_3rem_3rem_3rem] md:px-8"
                key={key}
              >
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-8 justify-self-end" />
                <Skeleton className="h-4 w-8 justify-self-end" />
                <Skeleton className="h-4 w-8 justify-self-end" />
                <Skeleton className="hidden h-3 w-8 justify-self-end md:block" />
                <Skeleton className="hidden h-3 w-8 justify-self-end md:block" />
              </div>
            ))}
          </div>
        </section>

        {/* Fall of Wickets */}
        <section className="px-4 py-8 md:px-8">
          <Skeleton className="mb-5 h-3 w-28" />
          <div className="flex flex-wrap gap-3">
            {wicketKeys.map((key) => (
              <Skeleton className="h-9 w-36" key={key} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
