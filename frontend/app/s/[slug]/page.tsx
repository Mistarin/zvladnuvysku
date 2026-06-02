import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { findPublicMaterialGroupByShareSlug } from "@/lib/share-content";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const group = await findPublicMaterialGroupByShareSlug(slug);

  return {
    title: group ? `${group.title} | Složka materiálů` : "Složka materiálů",
  };
}

export default async function MaterialGroupSharePage({ params }: PageProps) {
  const { slug } = await params;
  const group = await findPublicMaterialGroupByShareSlug(slug);

  if (!group) {
    notFound();
  }

  redirect(`/materialy?skupina=${encodeURIComponent(group.id)}`);
}
