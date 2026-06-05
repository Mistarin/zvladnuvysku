import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, ShieldAlert } from "lucide-react";
import { AdminAutoRefresh } from "@/components/admin/admin-auto-refresh";
import { createClient } from "@/lib/supabase/server";
import { DepartmentList } from "./department-list";

export const metadata: Metadata = {
  title: "Správa kateder | Admin panel",
  description: "Správa kateder Ostravské univerzity v administraci ZvládnuVýšku.",
};

export default async function AdminDepartmentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/prihlaseni");

  const role = user.app_metadata?.role as string | undefined;
  const isAdmin = role === "admin" || role === "moderator";

  if (!isAdmin) {
    return (
      <div className="container mx-auto max-w-2xl space-y-4 px-4 py-24 text-center">
        <ShieldAlert className="mx-auto h-16 w-16 text-destructive/60" />
        <h1 className="text-2xl font-bold text-foreground">Přístup odepřen</h1>
        <p className="text-muted-foreground">Tato stránka je dostupná pouze pro administrátory a moderátory.</p>
      </div>
    );
  }

  const { data: departments, error } = await supabase
    .from("departments")
    .select("id, name, slug, faculty, created_at, updated_at, subjects(count), teachers(count)")
    .order("faculty")
    .order("name");

  if (error) {
    console.error("Error fetching departments:", error);
  }

  const typedDepartments = ((departments ?? []) as Array<{
    id: string;
    name: string;
    slug: string;
    faculty: string;
    created_at: string;
    updated_at: string;
    subjects?: Array<{ count: number | null }> | null;
    teachers?: Array<{ count: number | null }> | null;
  }>).map((department) => ({
    id: department.id,
    name: department.name,
    slug: department.slug,
    faculty: department.faculty,
    created_at: department.created_at,
    updated_at: department.updated_at,
    subject_count: department.subjects?.[0]?.count ?? 0,
    teacher_count: department.teachers?.[0]?.count ?? 0,
  }));

  return (
    <div className="container mx-auto max-w-6xl space-y-8 px-4 py-8">
      <AdminAutoRefresh />

      <div className="flex items-center gap-4 border-b border-white/5 pb-4">
        <Link href="/admin" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
          ← Zpět do adminu
        </Link>
        <Link href="/admin/subjects" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
          Správa předmětů
        </Link>
        <Link href="/admin/ucitele" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
          Správa vyučujících
        </Link>
        <span className="text-sm font-semibold text-foreground">Správa kateder</span>
      </div>

      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-primary/10 p-2.5">
          <Building2 className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Správa kateder</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Upravuj centrální seznam kateder a jejich vazby na předměty a vyučující.
          </p>
        </div>
      </div>

      <DepartmentList initialDepartments={typedDepartments} />
    </div>
  );
}
