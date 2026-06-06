import { Suspense } from "react";
import { SubjectsFilterPanel } from "@/components/subject/subjects-filter-panel";
import { SubjectsResultsPanel } from "@/components/subject/subjects-results-panel";
import { SubjectsResultsSkeleton } from "@/components/subject/subjects-results-skeleton";
import { ListPageHeader, ListPageShell } from "@/components/layout/list-page-shell";
import { BookOpenText } from "lucide-react";
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
    <ListPageShell>
      <ListPageHeader
        title="Předměty"
        description={
          <>
          Procházej předměty Ostravské univerzity. Filtruj podle obtížnosti, semestru nebo katedry.
          </>
        }
        icon={<BookOpenText className="ui-accent-text h-5 w-5" />}
      />
      <div className="space-y-6">
        <SubjectsFilterPanel />
        <Suspense key={key} fallback={<SubjectsResultsSkeleton />}>
          <SubjectsResultsSection searchParams={resolvedSearchParams} />
        </Suspense>
      </div>
    </ListPageShell>
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
