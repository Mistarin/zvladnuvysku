export default function TeachersPageLoading() {
  return (
    <div className="container mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div className="space-y-3">
          <div className="h-10 w-40 animate-pulse rounded bg-muted" />
          <div className="h-5 w-[34rem] max-w-full animate-pulse rounded bg-muted" />
        </div>
        <div className="hidden h-10 w-44 animate-pulse rounded-lg bg-muted sm:block" />
      </div>
      <div className="space-y-12">
        {Array.from({ length: 2 }).map((_, sectionIndex) => (
          <div key={sectionIndex} className="space-y-4">
            <div className="flex items-center gap-3 border-b border-border pb-2">
              <div className="h-4 w-4 animate-pulse rounded-full bg-muted" />
              <div className="h-8 w-24 animate-pulse rounded bg-muted" />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((__, index) => (
                <div key={index} className="rounded-xl border border-border bg-card p-5">
                  <div className="space-y-3">
                    <div className="h-6 w-2/3 animate-pulse rounded bg-muted" />
                    <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
