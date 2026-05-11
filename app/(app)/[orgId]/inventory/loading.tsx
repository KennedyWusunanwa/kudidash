export default function InventoryLoading() {
  return (
    <div className="page-enter mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="loading-shimmer size-11 rounded-2xl border bg-muted/60" />
          <div className="space-y-3">
            <div className="loading-shimmer h-6 w-36 rounded-full bg-muted/60" />
            <div className="loading-shimmer h-8 w-48 rounded-2xl bg-muted/70" />
            <div className="loading-shimmer h-3 w-96 max-w-[70vw] rounded-full bg-muted/60" />
          </div>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/8 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          <span className="loading-spinner size-3" />
          Loading inventory
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="loading-shimmer h-28 rounded-3xl border bg-card/80" />
        <div className="loading-shimmer h-28 rounded-3xl border bg-card/80" />
        <div className="loading-shimmer h-28 rounded-3xl border bg-card/80" />
      </div>

      <div className="rounded-3xl border bg-card/85 p-4">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.4fr)_repeat(5,minmax(0,0.75fr))_auto]">
          <div className="loading-shimmer h-11 rounded-2xl bg-muted/65" />
          <div className="loading-shimmer h-11 rounded-2xl bg-muted/65" />
          <div className="loading-shimmer h-11 rounded-2xl bg-muted/65" />
          <div className="loading-shimmer h-11 rounded-2xl bg-muted/65" />
          <div className="loading-shimmer h-11 rounded-2xl bg-muted/65" />
          <div className="loading-shimmer h-11 rounded-2xl bg-muted/65" />
          <div className="loading-shimmer h-11 rounded-2xl bg-muted/65" />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="rounded-3xl border bg-card/85 p-4">
            <div className="mb-4 h-24 rounded-2xl bg-gradient-to-r from-primary/10 via-chart-2/10 to-chart-4/10" />
            <div className="flex gap-3">
              <div className="loading-shimmer h-24 w-24 rounded-2xl border bg-muted/65" />
              <div className="flex-1 space-y-3">
                <div className="flex gap-2">
                  <div className="loading-shimmer h-6 w-20 rounded-full bg-muted/65" />
                  <div className="loading-shimmer h-6 w-16 rounded-full bg-muted/65" />
                </div>
                <div className="loading-shimmer h-6 w-40 rounded-2xl bg-muted/70" />
                <div className="loading-shimmer h-3 w-full rounded-full bg-muted/60" />
                <div className="loading-shimmer h-3 w-3/4 rounded-full bg-muted/60" />
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="loading-shimmer h-20 rounded-2xl border bg-muted/55" />
              <div className="loading-shimmer h-20 rounded-2xl border bg-muted/55" />
              <div className="loading-shimmer h-20 rounded-2xl border bg-muted/55" />
              <div className="loading-shimmer h-20 rounded-2xl border bg-muted/55" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
