export default function InventoryItemLoading() {
  return (
    <div className="page-enter mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 py-6 sm:px-6">
      <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/8 px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-primary">
        <span className="loading-spinner size-3" />
        Loading product
      </div>

      <div className="rounded-3xl border bg-card/90 p-6">
        <div className="grid gap-6 lg:grid-cols-[320px,1fr]">
          <div className="loading-shimmer aspect-square w-full max-w-[280px] rounded-[2rem] border bg-muted/65" />
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2">
              <div className="loading-shimmer h-6 w-24 rounded-full bg-muted/65" />
              <div className="loading-shimmer h-6 w-20 rounded-full bg-muted/65" />
              <div className="loading-shimmer h-6 w-28 rounded-full bg-muted/65" />
            </div>
            <div className="loading-shimmer h-10 w-72 rounded-2xl bg-muted/75" />
            <div className="loading-shimmer h-3 w-full max-w-2xl rounded-full bg-muted/60" />
            <div className="loading-shimmer h-3 w-5/6 max-w-2xl rounded-full bg-muted/60" />
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="loading-shimmer h-28 rounded-2xl border bg-muted/55" />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr,0.9fr]">
        <div className="rounded-3xl border bg-card/85 p-6">
          <div className="loading-shimmer mb-5 h-7 w-44 rounded-2xl bg-muted/70" />
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="loading-shimmer h-24 rounded-2xl border bg-muted/55" />
            ))}
            <div className="loading-shimmer h-32 rounded-2xl border bg-muted/55 md:col-span-2" />
          </div>
        </div>
        <div className="rounded-3xl border bg-card/85 p-6">
          <div className="loading-shimmer mb-5 h-7 w-52 rounded-2xl bg-muted/70" />
          <div className="space-y-4">
            <div className="loading-shimmer h-24 rounded-2xl border bg-muted/55" />
            <div className="loading-shimmer h-24 rounded-2xl border bg-muted/55" />
            <div className="loading-shimmer h-24 rounded-2xl border bg-muted/55" />
          </div>
        </div>
      </div>
    </div>
  );
}
