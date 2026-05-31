import { SubjectsResultsSkeleton } from "@/components/subject/subjects-results-skeleton";

export default function SubjectsPageLoading() {
  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 space-y-3">
        <div className="h-9 w-40 animate-pulse rounded bg-muted" />
        <div className="h-5 w-[32rem] max-w-full animate-pulse rounded bg-muted" />
      </div>
      <div className="space-y-6">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="grid gap-3 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-10 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        </div>
        <SubjectsResultsSkeleton />
      </div>
    </div>
  );
}
