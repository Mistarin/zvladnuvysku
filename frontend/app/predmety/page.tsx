import { SubjectsBrowser } from "@/components/subject/subjects-browser";
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
  const filters = getSubjectFiltersFromSearchParams(resolvedSearchParams);
  const sort = getSubjectSortFromSearchParams(resolvedSearchParams);
  const page = getSubjectPageFromSearchParams(resolvedSearchParams);
  const { subjects, totalCount } = await getSubjectsPage(filters, sort, page);

  return (
    <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Předměty</h1>
        <p className="text-muted-foreground mt-1">
          Procházej předměty Ostravské univerzity. Filtruj podle obtížnosti, semestru nebo katedry.
        </p>
      </div>
      <SubjectsBrowser subjects={subjects} totalCount={totalCount} page={page} />
    </div>
  );
}
