import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { MaterialManagementCard } from "@/components/admin/material-management-card";
import { AdminAutoRefresh } from "@/components/admin/admin-auto-refresh";
import { getPublicUserSummaryMap } from "@/lib/public-user-summaries";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/types/database";

export const metadata: Metadata = {
  title: "Správa materiálů … Admin",
};

type ManagedMaterial = Database["public"]["Tables"]["subject_materials"]["Row"] & {
  subject: Pick<Database["public"]["Tables"]["subjects"]["Row"], "name" | "slug"> | null;
};

const STATUS_FILTERS = [
  { key: "approved", label: "Schválené" },
  { key: "pending", label: "Čekající" },
  { key: "rejected", label: "Zamítnuté" },
  { key: "all", label: "Všechny" },
] as const;

type StatusFilter = (typeof STATUS_FILTERS)[number]["key"];

export default async function AdminMaterialsPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = await props.searchParams;
  const query = (searchParams.q as string | undefined)?.trim().toLowerCase() ?? "";
  const rawStatus = searchParams.status as string | undefined;
  const status = STATUS_FILTERS.some((item) => item.key === rawStatus) ? (rawStatus as StatusFilter) : "approved";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/prihlaseni");

  const role = user.app_metadata?.role as string | undefined;
  const isAdmin = role === "admin" || role === "moderator";

  if (!isAdmin) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-24 text-center space-y-4">
        <ShieldAlert className="mx-auto h-16 w-16 text-destructive/60" />
        <h1 className="text-2xl font-bold text-foreground">Přístup odepřen</h1>
        <p className="text-muted-foreground">Tato stránka je dostupná pouze pro administrátory a moderátory.</p>
      </div>
    );
  }

  let request = supabase
    .from("subject_materials")
    .select("*, subject:subject_id(name, slug)")
    .order("created_at", { ascending: false })
    .limit(200);

  if (status !== "all") {
    request = request.eq("moderation_status" as never, status);
  }

  const { data } = await request;
  let materials = (data ?? []) as unknown as ManagedMaterial[];

  const userSummaries = await getPublicUserSummaryMap(
    materials.map((material) => material.uploader_id),
    supabase,
  );

  if (query) {
    materials = materials.filter((material) =>
      [material.title, material.file_path, material.subject?.name, userSummaries[material.uploader_id]?.displayName]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(query)),
    );
  }

  const materialsWithMissingScoring = materials.filter(
    (material) => material.page_count === null && material.points_override === null,
  ).length;

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <AdminAutoRefresh />
      <div className="flex items-center gap-4 border-b border-white/5 pb-4">
        <Link href="/admin" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Zpět do adminu
        </Link>
        <Link href="/admin/subjects" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          Správa předmětů
        </Link>
        <Link href="/admin/ucitele" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          Správa vyučujících
        </Link>
        <Link href="/admin/katedry" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          Správa kateder
        </Link>
        <span className="text-sm font-semibold text-foreground">Správa materiálů</span>
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-foreground">Správa materiálů</h1>
        <p className="text-sm text-muted-foreground">
          Tady můžeš zpětně upravit počet stran nebo materiálu ručně přiřadit bodové pásmo.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-white/5 bg-card/40  p-5 ">
          <p className="text-sm text-muted-foreground">Zobrazené materiály</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{materials.length}</p>
        </div>
        <div className="rounded-2xl border border-white/5 bg-card/40  p-5 ">
          <p className="text-sm text-muted-foreground">Bez bodů</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{materialsWithMissingScoring}</p>
        </div>
        <div className="rounded-2xl border border-white/5 bg-card/40  p-5 ">
          <p className="text-sm text-muted-foreground">Aktivní filtr</p>
          <p className="mt-2 text-lg font-semibold text-foreground">
            {STATUS_FILTERS.find((item) => item.key === status)?.label ?? "Schválené"}
          </p>
        </div>
      </div>

      <div className="space-y-4 rounded-lg border border-white/5 bg-card/40  p-6 ">
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((item) => {
            const params = new URLSearchParams();
            if (item.key !== "approved") params.set("status", item.key);
            if (query) params.set("q", query);
            const href = params.toString() ? `/admin/materialy?${params.toString()}` : "/admin/materialy";
            const active = status === item.key;

            return (
              <Link
                key={item.key}
                href={href}
                className={`inline-flex items-center rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-white/5 bg-background  text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>

        <form className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
          <input
            type="text"
            name="q"
            defaultValue={query}
            placeholder="Hledat podle názvu materiálu, předmětu nebo uživatele..."
            className="w-full rounded-xl border border-white/5 bg-background  px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
          />
          {status !== "approved" && <input type="hidden" name="status" value={status} />}
          <button
            type="submit"
            className="rounded-xl border border-white/5 bg-card/60  px-5 py-3 text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
          >
            Filtrovat
          </button>
        </form>
      </div>

      {materials.length > 0 ? (
        <div className="space-y-4">
          {materials.map((material) => (
            <MaterialManagementCard
              key={material.id}
              material={material}
              subjectName={material.subject?.name}
              subjectSlug={material.subject?.slug}
              author={userSummaries[material.uploader_id] ?? null}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border-2 border-dashed border-white/10 bg-background/40 px-4 py-10 text-center text-sm text-muted-foreground">
          Pro tenhle filtr jsme nenašli žádné materiály.
        </div>
      )}
    </div>
  );
}
