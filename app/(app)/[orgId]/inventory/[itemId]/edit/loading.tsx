export default function InventoryItemEditLoading() {
  return (
    <div className="page-enter mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 py-6 sm:px-6">
      <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/8 px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-primary">
        <span className="loading-spinner size-3" />
        Loading editor
      </div>
      <div className="rounded-3xl border bg-card/90 p-6">
        <div className="loading-shimmer mb-3 h-8 w-56 rounded-2xl bg-muted/70" />
        <div className="loading-shimmer mb-8 h-3 w-80 rounded-full bg-muted/60" />
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="loading-shimmer h-20 rounded-2xl border bg-muted/55" />
          ))}
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="loading-shimmer h-20 rounded-2xl border bg-muted/55" />
          ))}
        </div>
        <div className="mt-6 flex justify-end">
          <div className="loading-shimmer h-11 w-40 rounded-2xl bg-muted/65" />
        </div>
      </div>
    </div>
  );
}
