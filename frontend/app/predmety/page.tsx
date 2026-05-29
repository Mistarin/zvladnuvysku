import { Suspense } from "react";
import { SubjectsFilterPanel } from "@/components/subject/subjects-filter-panel";
import { SubjectsResultsPanel } from "@/components/subject/subjects-results-panel";
import { SubjectsResultsSkeleton } from "@/components/subject/subjects-results-skeleton";
import {
  getSubjectFiltersFromSearchParams,
  getSubjectPageFromSearchParams,
  getSubjectSortFromSearchParams,
} from "@/lib/subjects";
import { getSubjectsPage } from "@/lib/subjects-server";

interface PredmetyPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function PredmetyPage({ searchParams }: PredmetyPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const key = JSON.stringify(resolvedSearchParams);

  return (
    <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Předměty</h1>
        <p className="text-muted-foreground mt-1">
          Procházej předměty Ostravské univerzity. Filtruj podle obtížnosti, semestru nebo katedry.
        </p>
      </div>
      <div className="space-y-6">
        <SubjectsFilterPanel />
        <Suspense key={key} fallback={<SubjectsResultsSkeleton />}>
          <SubjectsResultsSection searchParams={resolvedSearchParams} />
        </Suspense>
      </div>
    </div>
  );
}

async function SubjectsResultsSection({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const filters = getSubjectFiltersFromSearchParams(searchParams);
  const sort = getSubjectSortFromSearchParams(searchParams);
  const page = getSubjectPageFromSearchParams(searchParams);
  const { subjects, totalCount } = await getSubjectsPage(filters, sort, page);

  return (
    <SubjectsResultsPanel subjects={subjects} totalCount={totalCount} page={page} />
  );
}
