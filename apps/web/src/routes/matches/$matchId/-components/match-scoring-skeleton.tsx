import { Skeleton } from "@/components/ui/skeleton";

export default function MatchScoringLoadingSkeleton() {
  const loadingStepKeys = [
    "lineup",
    "toss",
    "innings",
    "score",
    "result",
  ] as const;
  const loadingOverKeys = ["over1", "over2", "over3"] as const;
  const loadingDeliveryChipKeys = ["d1", "d2", "d3", "d4", "d5", "d6"] as const;
  const loadingBatRunKeys = [0, 1, 2, 3, 4, 5] as const;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(216,180,80,0.14),transparent_30%),linear-gradient(180deg,rgba(255,248,233,0.55),transparent_28%),var(--background)] pb-24">
      <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:py-10">
        <section
          aria-busy="true"
          className="space-y-4 border border-border/50 bg-card/90 p-5 backdrop-blur"
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-10 w-56 sm:w-72" />
              <Skeleton className="h-4 w-full max-w-2xl" />
              <Skeleton className="h-4 w-4/5 max-w-xl" />
            </div>
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-9 w-28" />
              <Skeleton className="h-9 w-20" />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {loadingStepKeys.map((stepKey) => (
              <Skeleton className="h-8 w-24 sm:w-28" key={stepKey} />
            ))}
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[minmax(0,0.82fr)_minmax(420px,1.18fr)]">
          {/* Left column: innings info + timeline */}
          <div className="space-y-5">
            <div className="border border-border/50 bg-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-2">
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-8 w-40" />
                </div>
              </div>
              <div className="mt-4 flex items-baseline gap-6">
                <div className="space-y-2">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-7 w-20" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-7 w-36" />
                </div>
              </div>
            </div>

            <div className="border border-border/50 bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <Skeleton className="h-3 w-40" />
                <div className="flex flex-wrap gap-2">
                  <Skeleton className="h-8 w-32" />
                  <Skeleton className="h-8 w-28" />
                  <Skeleton className="h-8 w-32" />
                </div>
              </div>
              <div className="mt-4 space-y-3">
                {loadingOverKeys.map((overKey) => (
                  <div
                    className="border border-border/40 bg-[color-mix(in_oklab,var(--color-card)_95%,var(--color-primary)_5%)] px-4 py-3"
                    key={overKey}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="space-y-1">
                        <Skeleton className="h-4 w-14" />
                        <Skeleton className="h-3 w-10" />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {loadingDeliveryChipKeys.map((chipKey) => (
                          <Skeleton className="size-10" key={chipKey} />
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right column: ScoreABall */}
          <div className="lg:sticky lg:top-4 lg:self-start">
            <div className="space-y-5 border border-border/50 bg-card px-4 py-5 sm:px-5">
              <div className="flex flex-wrap items-start justify-between gap-3 sm:flex-nowrap">
                <div className="space-y-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-7 w-48" />
                </div>
                <Skeleton className="h-8 w-20 shrink-0" />
              </div>

              <div className="space-y-6">
                <div className="space-y-3">
                  <Skeleton className="h-4 w-44" />
                  <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                </div>

                <div className="space-y-3">
                  <Skeleton className="h-4 w-20" />
                  <div className="grid grid-cols-6 gap-2 sm:gap-3">
                    {loadingBatRunKeys.map((i) => (
                      <Skeleton className="h-11 w-full" key={i} />
                    ))}
                  </div>
                  <Skeleton className="h-10 w-full" />
                </div>

                <Skeleton className="angled-cut h-14 w-full" />

                <div className="space-y-4 border border-border/40 bg-muted/15 p-4 sm:p-5">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-full max-w-xs" />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-3">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap justify-end gap-2 pt-1">
                <Skeleton className="h-10 w-24" />
                <Skeleton className="angled-cut h-11 w-36" />
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
