import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { findPublicMaterialByShareSlug } from "@/lib/share-content";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const material = await findPublicMaterialByShareSlug(slug);

  return {
    title: material ? `${material.title} | Materiál` : "Materiál",
  };
}

export default async function MaterialSharePage({ params }: PageProps) {
  const { slug } = await params;
  const material = await findPublicMaterialByShareSlug(slug);

  if (!material?.publicUrl) {
    notFound();
  }

  redirect(material.publicUrl);
}
