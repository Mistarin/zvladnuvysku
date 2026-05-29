import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { BookOpen, Layers } from "lucide-react";

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

interface FlashcardDeckListItem {
  id: string;
  title: string;
  description: string | null;
  card_count: number;
  subject: { name: string; slug: string; short_tag: string } | null;
}

export const metadata: Metadata = {
  title: "Flashcard balíčky",
  description: "Veřejné flashcard balíčky napříč předměty.",
};

export default async function FlashcardDeckListPage({ searchParams }: PageProps) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  const supabase = await createClient();

  let decksQuery = supabase
    .from("flashcard_decks")
    .select("id, title, description, card_count, subject:subject_id(name, slug, short_tag)")
    .eq("is_public", true)
    .order("card_count", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(60);

  if (query) {
    decksQuery = decksQuery.ilike("title", `%${query}%`);
  }

  const { data } = await decksQuery;
  const decks = (data ?? []) as FlashcardDeckListItem[];

  return (
    <div className="container mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Link href="/" className="hover:text-foreground transition-colors">Domů</Link>
        <span>/</span>
        <span className="text-foreground font-medium">Flashcardy</span>
      </nav>

      <div className="mb-8 space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Layers className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Flashcard balíčky</h1>
            <p className="text-muted-foreground">
              {query
                ? <>Výsledky pro „<span className="text-foreground font-medium">{query}</span>“</>
                : "Veřejné balíčky napříč předměty."}
            </p>
          </div>
        </div>
      </div>

      {decks.length === 0 ? (
        <div className="glass-card rounded-2xl p-10 text-center space-y-3">
          <p className="text-4xl">🃏</p>
          <p className="text-lg font-semibold text-foreground">Žádné balíčky</p>
          <p className="text-sm text-muted-foreground">
            {query ? "Pro zadaný dotaz jsme nic nenašli." : "Zatím tu nejsou žádné veřejné balíčky."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {decks.map((deck) => (
            <Link
              key={deck.id}
              href={`/flashcardy/${deck.id}`}
              className="block glass-card hover-card rounded-xl p-5 space-y-3 transition-all group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <h2 className="font-semibold text-foreground group-hover:text-primary transition-colors leading-snug">
                    {deck.title}
                  </h2>
                  {deck.subject && (
                    <p className="text-xs text-muted-foreground truncate">
                      {deck.subject.short_tag} · {deck.subject.name}
                    </p>
                  )}
                </div>
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <BookOpen className="w-4 h-4 text-primary" />
                </div>
              </div>

              {deck.description && (
                <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                  {deck.description}
                </p>
              )}

              <div className="flex items-center justify-between pt-1 text-xs text-muted-foreground">
                <span>
                  🃏 {deck.card_count} {deck.card_count === 1 ? "karta" : deck.card_count >= 2 && deck.card_count <= 4 ? "karty" : "karet"}
                </span>
                {deck.subject && (
                  <span className="font-mono text-primary/80 bg-primary/10 px-1.5 py-0.5 rounded">
                    {deck.subject.short_tag}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
