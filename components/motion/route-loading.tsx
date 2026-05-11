export function RouteLoading({
  title = "Loading workspace",
  subtitle = "Preparing your accounting data and layout...",
}: {
  title?: string;
  subtitle?: string;
}) {
  return (
    <div className="page-enter relative isolate mx-auto flex min-h-[68vh] w-full max-w-[1440px] items-center justify-center overflow-hidden px-4 py-10 sm:px-6">
      <div className="absolute inset-x-10 top-10 h-40 rounded-full bg-primary/8 blur-3xl" />
      <div className="absolute -right-12 bottom-0 h-56 w-56 rounded-full bg-chart-2/12 blur-3xl" />
      <div className="relative grid w-full max-w-5xl gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6 rounded-[2rem] border bg-card/92 p-6 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.35)]">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/8 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-primary">
              <span className="loading-spinner size-3" />
              Loading
            </div>
            <div className="loading-shimmer h-10 w-full max-w-xl rounded-2xl bg-muted/80" />
            <div className="loading-shimmer h-3 w-full max-w-md rounded-full bg-muted" />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="loading-shimmer h-28 rounded-3xl border bg-background/70" />
            <div className="loading-shimmer h-28 rounded-3xl border bg-background/70" />
            <div className="loading-shimmer h-28 rounded-3xl border bg-background/70" />
          </div>
          <div className="loading-shimmer min-h-64 rounded-[1.75rem] border bg-background/70" />
        </div>

        <div className="flex flex-col justify-between rounded-[2rem] border bg-card/92 p-6 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.35)]">
          <div className="space-y-4">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-primary/8 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-primary">
              <span className="loading-spinner size-3" />
              Working
            </div>
            <div className="space-y-2">
              <p className="text-2xl font-semibold tracking-tight">{title}</p>
              <p className="text-sm leading-6 text-muted-foreground">{subtitle}</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="loading-shimmer h-2 rounded-full bg-muted" />
            <div className="route-loading-bar">
              <span />
            </div>
            <div className="grid gap-3">
              <div className="loading-shimmer h-16 rounded-2xl border bg-background/70" />
              <div className="loading-shimmer h-16 rounded-2xl border bg-background/70" />
              <div className="loading-shimmer h-16 rounded-2xl border bg-background/70" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
