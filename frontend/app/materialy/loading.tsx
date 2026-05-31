export default function MaterialsPageLoading() {
  return (
    <div className="container mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center gap-2">
        <div className="h-4 w-12 animate-pulse rounded bg-muted" />
        <div className="h-4 w-3 animate-pulse rounded bg-muted" />
        <div className="h-4 w-16 animate-pulse rounded bg-muted" />
      </div>
      <div className="mb-8 space-y-3">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 animate-pulse rounded-2xl bg-muted" />
          <div className="space-y-2">
            <div className="h-9 w-52 animate-pulse rounded bg-muted" />
            <div className="h-5 w-72 animate-pulse rounded bg-muted" />
          </div>
        </div>
        <div className="h-12 w-full animate-pulse rounded-2xl bg-muted" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="rounded-xl border border-border bg-card p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-5 w-2/3 animate-pulse rounded bg-muted" />
                <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
              </div>
              <div className="flex gap-2">
                <div className="h-10 w-28 animate-pulse rounded-lg bg-muted" />
                <div className="h-10 w-28 animate-pulse rounded-lg bg-muted" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
