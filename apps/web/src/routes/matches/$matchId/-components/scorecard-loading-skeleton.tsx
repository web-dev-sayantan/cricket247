import { Skeleton } from "@/components/ui/skeleton";

export function ScorecardLoadingSkeleton() {
  const battingRowKeys = ["bat-1", "bat-2", "bat-3", "bat-4"] as const;
  const bowlingRowKeys = ["bowl-1", "bowl-2", "bowl-3"] as const;
  const wicketKeys = ["wicket-1", "wicket-2", "wicket-3"] as const;

  return (
    <main
      aria-busy="true"
      className="mx-auto flex size-full max-w-4xl flex-col bg-background"
      id="main-content"
    >
      <header className="flex items-center justify-between border-border/40 border-b px-4 pt-6 pb-4 md:px-8">
        <div className="space-y-2">
          <Skeleton className="h-7 w-44 rounded-full sm:w-56" />
          <Skeleton className="h-4 w-36 rounded-full" />
        </div>
        <Skeleton className="h-8 w-28 rounded-full" />
      </header>

      <nav
        aria-label="Select innings"
        className="hide-scrollbar overflow-x-auto border-border/40 border-b px-4 md:px-8"
      >
        <div className="flex space-x-6 py-4">
          <Skeleton className="h-5 w-28 rounded-full" />
          <Skeleton className="h-5 w-28 rounded-full" />
        </div>
      </nav>

      <div className="flex-1 pb-16">
        <section className="border-border/40 border-b bg-muted/20 px-4 py-8 md:px-8">
          <div className="space-y-4">
            <div className="space-y-3">
              <p className="font-medium text-muted-foreground text-sm uppercase tracking-wider">
                Loading match scorecard...
              </p>
              <div className="flex items-baseline gap-3">
                <Skeleton className="h-14 w-36 rounded-2xl" />
                <Skeleton className="h-7 w-20 rounded-full" />
              </div>
            </div>
            <div className="flex flex-wrap gap-4">
              <Skeleton className="h-4 w-28 rounded-full" />
              <Skeleton className="h-4 w-40 rounded-full" />
            </div>
          </div>
        </section>

        <section className="border-border/40 border-b [contain-intrinsic-size:420px] [content-visibility:auto]">
          <div className="border-border/40 border-b bg-muted/30 px-4 py-3 md:px-8">
            <Skeleton className="h-4 w-24 rounded-full" />
          </div>
          <div className="divide-y divide-border/20">
            {battingRowKeys.map((key) => (
              <div
                className="grid grid-cols-[1fr_auto] items-center gap-4 px-4 py-3 md:grid-cols-[1fr_2rem_2rem_3rem_3rem] md:px-8"
                key={key}
              >
                <div className="space-y-2">
                  <Skeleton className="h-5 w-36 rounded-full" />
                  <Skeleton className="h-4 w-40 rounded-full" />
                </div>
                <Skeleton className="h-5 w-14 justify-self-end rounded-full" />
                <Skeleton className="hidden h-5 w-6 justify-self-end rounded-full md:block" />
                <Skeleton className="hidden h-5 w-6 justify-self-end rounded-full md:block" />
                <Skeleton className="hidden h-5 w-10 justify-self-end rounded-full md:block" />
              </div>
            ))}
          </div>
        </section>

        <section className="border-border/40 border-b [contain-intrinsic-size:360px] [content-visibility:auto]">
          <div className="border-border/40 border-b bg-muted/10 px-4 py-4">
            <Skeleton className="h-4 w-56 rounded-full" />
          </div>
          <div className="border-border/40 border-b bg-muted/30 px-4 py-3 md:px-8">
            <Skeleton className="h-4 w-20 rounded-full" />
          </div>
          <div className="divide-y divide-border/20">
            {bowlingRowKeys.map((key) => (
              <div
                className="grid grid-cols-[1fr_2.5rem_2.5rem_2.5rem] items-center gap-4 px-4 py-3 md:grid-cols-[1fr_3rem_3rem_3rem_3rem_3rem] md:px-8"
                key={key}
              >
                <Skeleton className="h-5 w-32 rounded-full" />
                <Skeleton className="h-5 w-10 justify-self-end rounded-full" />
                <Skeleton className="h-5 w-10 justify-self-end rounded-full" />
                <Skeleton className="h-5 w-10 justify-self-end rounded-full" />
                <Skeleton className="hidden h-5 w-10 justify-self-end rounded-full md:block" />
                <Skeleton className="hidden h-5 w-10 justify-self-end rounded-full md:block" />
              </div>
            ))}
          </div>
        </section>

        <section className="px-4 py-8 md:px-8">
          <Skeleton className="mb-4 h-4 w-32 rounded-full" />
          <div className="flex flex-wrap gap-x-6 gap-y-3">
            {wicketKeys.map((key) => (
              <Skeleton className="h-5 w-36 rounded-full" key={key} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
