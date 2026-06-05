import type { Metadata } from "next";
import { ListPageShell } from "@/components/layout/list-page-shell";
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
    <ListPageShell>
      <MaterialDirectoryClient
        groups={groups}
        standaloneMaterials={standaloneMaterials}
        initialQuery={query}
        initialView={view === "files" ? "files" : "groups"}
        focusedGroupId={focusedGroupId}
      />
    </ListPageShell>
  );
}
