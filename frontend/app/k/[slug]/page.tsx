import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { findPublicDeckByShareSlug } from "@/lib/share-content";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const deck = await findPublicDeckByShareSlug(slug);

  return {
    title: deck ? `${deck.title} | Balíček kartiček` : "Balíček kartiček",
  };
}

export default async function DeckSharePage({ params }: PageProps) {
  const { slug } = await params;
  const deck = await findPublicDeckByShareSlug(slug);

  if (!deck) {
    notFound();
  }

  redirect(`/flashcardy/${deck.id}`);
}
