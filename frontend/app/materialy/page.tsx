import type { Metadata } from "next";
import Link from "next/link";
import { MaterialDirectoryClient } from "@/components/material/material-directory-client";
import { getPublicMaterialDirectorySnapshot } from "@/lib/material-directory";

interface PageProps {
  searchParams: Promise<{ q?: string; view?: string; group?: string; skupina?: string }>;
}

export const metadata: Metadata = {
  title: "Studijní materiály",
  description: "Schválené studijní materiály a skupiny materiálů napříč předměty.",
};

export default async function MaterialListPage({ searchParams }: PageProps) {
  const { q, view, group, skupina } = await searchParams;
  const query = q?.trim() ?? "";
  const focusedGroupId = group ?? skupina ?? undefined;
  const { groups, standaloneMaterials } = await getPublicMaterialDirectorySnapshot();

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <nav className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/" className="transition-colors hover:text-foreground">Domů</Link>
        <span>/</span>
        <span className="font-medium text-foreground">Materiály</span>
      </nav>

      <MaterialDirectoryClient
        groups={groups}
        standaloneMaterials={standaloneMaterials}
        initialQuery={query}
        initialView={view === "files" ? "files" : "groups"}
        focusedGroupId={focusedGroupId}
      />
    </div>
  );
}
