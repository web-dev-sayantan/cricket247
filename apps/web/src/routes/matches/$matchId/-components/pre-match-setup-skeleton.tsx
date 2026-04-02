export function PreMatchSetupSkeleton() {
  return (
    <section
      aria-busy="true"
      className="space-y-4 rounded-[2rem] border border-border/70 bg-card p-5 shadow-sm"
    >
      <div className="space-y-2">
        <p className="text-muted-foreground text-xs uppercase tracking-[0.22em]">
          Match setup
        </p>
        <h2 className="font-medium text-xl">Loading match setup...</h2>
        <p className="text-muted-foreground text-sm">
          Preparing the current setup step.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="h-24 rounded-[1.5rem] bg-muted/30" />
        <div className="h-24 rounded-[1.5rem] bg-muted/30" />
      </div>
      <div className="h-12 w-48 rounded-2xl bg-muted/30" />
    </section>
  );
}
