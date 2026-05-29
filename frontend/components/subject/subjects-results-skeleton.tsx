export function SubjectsResultsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div className="h-4 w-40 animate-pulse rounded bg-muted" />
        <div className="h-4 w-24 animate-pulse rounded bg-muted" />
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <div className="border-b border-border bg-muted/50 px-4 py-3">
          <div className="grid grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-4 rounded bg-muted-foreground/10" />
            ))}
          </div>
        </div>
        <div className="space-y-0">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className="grid grid-cols-4 gap-4 border-b border-border/50 px-4 py-4"
            >
              {Array.from({ length: 4 }).map((__, cellIndex) => (
                <div
                  key={cellIndex}
                  className={`h-4 animate-pulse rounded bg-muted ${
                    cellIndex === 0 ? "w-3/4" : "w-1/2"
                  }`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
