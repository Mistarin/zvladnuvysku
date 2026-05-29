import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SearchLandingBar } from "@/components/search/search-landing-bar";
import { BookOpen, Layers } from "lucide-react";

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

interface FlashcardDeckListItem {
  id: string;
  title: string;
  description: string | null;
  card_count: number;
  subject: { name: string; slug: string; short_tag: string; faculty: string | null } | null;
}

export const metadata: Metadata = {
  title: "Balíčky kartiček",
  description: "Veřejné balíčky kartiček napříč předměty.",
};

export default async function FlashcardDeckListPage({ searchParams }: PageProps) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  const supabase = await createClient();

  let decksQuery = supabase
    .from("flashcard_decks")
    .select("id, title, description, card_count, subject:subject_id(name, slug, short_tag, faculty)")
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
        <span className="text-foreground font-medium">Kartičky</span>
      </nav>

      <div className="mb-8 space-y-2">
        <div className="flex items-center gap-3">
          <div className="ui-accent-soft w-11 h-11 rounded-2xl flex items-center justify-center">
            <Layers className="ui-accent-text w-5 h-5" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Balíčky kartiček</h1>
            <p className="text-muted-foreground">
              {query
                ? <>Výsledky pro „<span className="text-foreground font-medium">{query}</span>“</>
                : "Veřejné balíčky napříč předměty."}
            </p>
          </div>
        </div>
        <SearchLandingBar
          basePath="/flashcardy"
          placeholder="Hledat balíček nebo předmět..."
          emptyHint="Napiš název balíčku a stiskni Enter."
        />
      </div>

      {decks.length === 0 ? (
        <div className="glass-card rounded-2xl p-10 text-center space-y-3">
          <p className="text-4xl">🃏</p>
          <p className="text-lg font-semibold text-foreground">Žádné balíčky</p>
          <p className="text-sm text-muted-foreground">
            {query ? "Pro zadaný dotaz jsme nic nenašli." : "Zatím tu nejsou žádné veřejné balíčky."}
          </p>
          {query && (
            <Link href="/flashcardy" className="ui-accent-text text-sm hover:underline">
              Zobrazit všechny balíčky
            </Link>
          )}
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
                  <h2 className="font-semibold text-foreground group-hover:text-[var(--accent-color)] transition-colors leading-snug">
                    {deck.title}
                  </h2>
                  {deck.subject && (
                    <div className="space-y-1 min-w-0">
                      <p className="text-xs text-muted-foreground truncate">
                        {deck.subject.short_tag} · {deck.subject.name}
                      </p>
                      {deck.subject.faculty && (
                        <p className="text-[11px] text-muted-foreground/80 truncate">
                          {deck.subject.faculty}
                        </p>
                      )}
                    </div>
                  )}
                </div>
                <div className="ui-accent-soft w-8 h-8 rounded-lg flex items-center justify-center shrink-0">
                  <BookOpen className="ui-accent-text w-4 h-4" />
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
                  <span className="ui-accent-badge font-mono px-1.5 py-0.5 rounded">
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
