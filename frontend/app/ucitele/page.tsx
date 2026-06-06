import { Suspense } from "react";
import type { Metadata } from "next";
import { GraduationCap } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ListPageHeader, ListPageShell } from "@/components/layout/list-page-shell";
import { TeacherTable } from "@/components/teacher/teacher-table";
import { TeachersFilterPanel } from "@/components/teacher/teachers-filter-panel";
import { TeacherProposalDialog } from "@/components/teacher/teacher-proposal-dialog";
import { getPublicProfileIdentity } from "@/lib/public-profile-identity";
import { hasAcceptedCurrentLegalVersion, hasCompletedPublicProfileSetup } from "@/lib/legal-consent";
import { getTeacherFiltersFromSearchParams } from "@/lib/teachers";
import { getTeachersDirectoryData } from "@/lib/teachers-server";

export const metadata: Metadata = {
  title: "Vyučující | ZvládnuVýšku",
  description: "Seznam vyučujících na Ostravské univerzitě a jejich hodnocení.",
};

interface TeachersPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

type ViewerProfile = {
  display_name?: string | null;
  faculty?: string | null;
  secondary_faculty?: string | null;
  legal_accepted_at?: string | null;
  legal_accepted_version?: string | null;
} | null;

export default async function TeachersPage({ searchParams }: TeachersPageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const profile: ViewerProfile = user
    ? (
        await supabase
          .from("profiles")
          .select("display_name, faculty, secondary_faculty, legal_accepted_at, legal_accepted_version")
          .eq("user_id", user.id)
          .maybeSingle()
      ).data as ViewerProfile
    : null;
  const hasPublicIdentity = hasCompletedPublicProfileSetup(profile);
  const hasAcceptedLegal = hasAcceptedCurrentLegalVersion(profile);
  const publicIdentity = getPublicProfileIdentity(profile);
  const resolvedSearchParams = (await searchParams) ?? {};
  const filters = getTeacherFiltersFromSearchParams(resolvedSearchParams);

  return (
    <ListPageShell>
      <ListPageHeader
        title="Vyučující"
        description="Prohlížej si profily vyučujících, hodnoť jejich přístup a filtruj podle fakulty, katedry nebo vyučovaného předmětu."
        icon={<GraduationCap className="ui-accent-text h-5 w-5" />}
        actions={<TeacherProposalDialog
          hasPublicProfileIdentity={hasPublicIdentity}
          initialDisplayName={publicIdentity.displayName}
          initialFaculty={publicIdentity.faculty}
          initialSecondaryFaculty={publicIdentity.secondaryFaculty}
          initialLegalAcceptedAt={hasAcceptedLegal ? profile?.legal_accepted_at ?? null : null}
          initialLegalAcceptedVersion={profile?.legal_accepted_version ?? null}
        />}
      />
      <Suspense fallback={<TeachersListSkeleton />}>
        <TeachersListSection filters={filters} />
      </Suspense>
    </ListPageShell>
  );
}

async function TeachersListSection({
  filters,
}: {
  filters: ReturnType<typeof getTeacherFiltersFromSearchParams>;
}) {
  const directoryData = await getTeachersDirectoryData(filters).catch((error) => {
    console.error("Error fetching teachers:", error);
    return null;
  });

  if (!directoryData) {
    return (
      <div className="py-12 text-center text-destructive">
        Nepodařilo se načíst seznam vyučujících.
      </div>
    );
  }

  const { teachers, totalCount, departments, subjects } = directoryData;

  return (
    <div className="space-y-6">
      <TeachersFilterPanel departments={departments} subjects={subjects} />
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          <span className="font-medium text-foreground">{totalCount}</span>{" "}
          {totalCount === 1 ? "vyučující" : totalCount < 5 ? "vyučující" : "vyučujících"}
        </span>
      </div>
      <TeacherTable teachers={teachers} />
    </div>
  );
}

function TeachersListSkeleton() {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card/90 p-4 shadow-sm">
        <div className="h-11 animate-pulse rounded-2xl bg-muted" />
      </div>
      <div className="rounded-xl border border-border">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="border-b border-border/50 px-4 py-4 last:border-0">
            <div className="space-y-2">
              <div className="h-4 w-48 animate-pulse rounded bg-muted" />
              <div className="h-3 w-32 animate-pulse rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
