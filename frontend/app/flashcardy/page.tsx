import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SearchLandingBar } from "@/components/search/search-landing-bar";
import { BookOpen, Layers } from "lucide-react";
import { DeleteDeckButton } from "@/components/flashcard/delete-deck-button";
import { DeckOwnerToolbar } from "@/components/flashcard/deck-owner-toolbar";

interface PageProps {
  searchParams: Promise<{
    q?: string;
    mine_q?: string;
    mine_visibility?: "all" | "public" | "private";
    mine_sort?: "updated" | "created" | "cards" | "title";
  }>;
}

interface FlashcardDeckListItem {
  id: string;
  title: string;
  description: string | null;
  card_count: number;
  is_public?: boolean;
  subject: { name: string; slug: string; short_tag: string; faculty: string | null } | null;
}

export const metadata: Metadata = {
  title: "Balíčky kartiček",
  description: "Veřejné balíčky kartiček napříč předměty.",
};

export default async function FlashcardDeckListPage({ searchParams }: PageProps) {
  const { q, mine_q, mine_visibility, mine_sort } = await searchParams;
  const query = q?.trim() ?? "";
  const mineQuery = mine_q?.trim() ?? "";
  const mineVisibility = mine_visibility ?? "all";
  const mineSort = mine_sort ?? "updated";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <nav className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/" className="transition-colors hover:text-foreground">Domů</Link>
        <span>/</span>
        <span className="text-foreground font-medium">Kartičky</span>
      </nav>

      <div className="mb-8 space-y-2">
        <div className="flex items-center gap-3">
          <div className="ui-accent-soft flex h-11 w-11 items-center justify-center rounded-2xl">
            <Layers className="ui-accent-text h-5 w-5" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Balíčky kartiček</h1>
            <p className="text-muted-foreground">
              {query
                ? <>Výsledky pro „<span className="font-medium text-foreground">{query}</span>“</>
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

      {user && (
        <Suspense
          key={`${user.id}-${mineQuery}-${mineVisibility}-${mineSort}-${query}`}
          fallback={<DeckDashboardSkeleton />}
        >
          <MyDecksSection
            userId={user.id}
            query={query}
            mineQuery={mineQuery}
            mineVisibility={mineVisibility}
            mineSort={mineSort}
          />
        </Suspense>
      )}

      <Suspense key={query} fallback={<PublicDeckListSkeleton />}>
        <PublicDeckListSection query={query} />
      </Suspense>
    </div>
  );
}

async function PublicDeckListSection({ query }: { query: string }) {
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

  if (decks.length === 0) {
    return (
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
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {decks.map((deck) => (
        <Link
          key={deck.id}
          href={`/flashcardy/${deck.id}`}
          className="group block rounded-xl p-5 transition-all glass-card hover-card"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <h2 className="font-semibold leading-snug text-foreground transition-colors group-hover:text-[var(--accent-color)]">
                {deck.title}
              </h2>
              {deck.subject && (
                <div className="min-w-0 space-y-1">
                  <p className="truncate text-xs text-muted-foreground">
                    {deck.subject.short_tag} · {deck.subject.name}
                  </p>
                  {deck.subject.faculty && (
                    <p className="truncate text-[11px] text-muted-foreground/80">
                      {deck.subject.faculty}
                    </p>
                  )}
                </div>
              )}
            </div>
            <div className="ui-accent-soft flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
              <BookOpen className="ui-accent-text h-4 w-4" />
            </div>
          </div>

          {deck.description && (
            <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
              {deck.description}
            </p>
          )}

          <div className="flex items-center justify-between pt-3 text-xs text-muted-foreground">
            <span>
              🃏 {deck.card_count} {deck.card_count === 1 ? "karta" : deck.card_count >= 2 && deck.card_count <= 4 ? "karty" : "karet"}
            </span>
            {deck.subject && (
              <span className="ui-accent-badge rounded px-1.5 py-0.5 font-mono">
                {deck.subject.short_tag}
              </span>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}

async function MyDecksSection({
  userId,
  query,
  mineQuery,
  mineVisibility,
  mineSort,
}: {
  userId: string;
  query: string;
  mineQuery: string;
  mineVisibility: "all" | "public" | "private";
  mineSort: "updated" | "created" | "cards" | "title";
}) {
  const supabase = await createClient();
  let myDecksQuery = supabase
    .from("flashcard_decks")
    .select("id, title, description, card_count, is_public, subject:subject_id(name, slug, short_tag, faculty)")
    .eq("creator_id", userId);

  if (mineQuery) {
    myDecksQuery = myDecksQuery.or(`title.ilike.%${mineQuery}%,description.ilike.%${mineQuery}%`);
  }
  if (mineVisibility === "public") {
    myDecksQuery = myDecksQuery.eq("is_public", true);
  } else if (mineVisibility === "private") {
    myDecksQuery = myDecksQuery.eq("is_public", false);
  }

  if (mineSort === "title") {
    myDecksQuery = myDecksQuery.order("title", { ascending: true });
  } else if (mineSort === "created") {
    myDecksQuery = myDecksQuery.order("created_at", { ascending: false });
  } else if (mineSort === "cards") {
    myDecksQuery = myDecksQuery.order("card_count", { ascending: false });
  } else {
    myDecksQuery = myDecksQuery.order("updated_at", { ascending: false });
  }

  const { data } = await myDecksQuery.limit(50);
  const myDecks = (data ?? []) as FlashcardDeckListItem[];
  const publicDeckCount = myDecks.filter((deck) => deck.is_public).length;
  const privateDeckCount = myDecks.filter((deck) => !deck.is_public).length;
  const totalCardCount = myDecks.reduce((sum, deck) => sum + deck.card_count, 0);

  return (
    <section id="moje-balicky" className="mb-10 space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm scroll-mt-24">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Moje balíčky</h2>
          <p className="text-sm text-muted-foreground">
            Tvůj vlastní dashboard s filtry podle viditelnosti, názvu a řazení.
          </p>
        </div>
        <Link
          href="/flashcardy/novy"
          className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          + Nový balíček
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Celkem balíčků" value={String(myDecks.length)} />
        <StatCard label="Veřejné / soukromé" value={`${publicDeckCount} / ${privateDeckCount}`} />
        <StatCard label="Otázek napříč balíčky" value={String(totalCardCount)} />
      </div>

      <form className="grid gap-3 rounded-xl border border-border/60 bg-background/60 p-4 md:grid-cols-[minmax(0,1fr)_180px_180px_auto]">
        <input type="text" name="mine_q" defaultValue={mineQuery} placeholder="Hledat v mých balíčcích..." className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20" />
        <select name="mine_visibility" defaultValue={mineVisibility} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20">
          <option value="all">Všechny</option>
          <option value="public">Jen veřejné</option>
          <option value="private">Jen soukromé</option>
        </select>
        <select name="mine_sort" defaultValue={mineSort} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20">
          <option value="updated">Naposledy upravené</option>
          <option value="created">Nejnovější</option>
          <option value="cards">Nejvíc karet</option>
          <option value="title">A-Z</option>
        </select>
        <button type="submit" className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted">
          Filtrovat
        </button>
        {query && <input type="hidden" name="q" value={query} />}
      </form>

      {myDecks.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {myDecks.map((deck) => (
            <div key={deck.id} className="rounded-xl border border-border bg-background p-5 transition-all hover:border-primary/40 hover:bg-muted/30">
              <Link href={`/flashcardy/${deck.id}`} className="block">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-foreground">{deck.title}</h3>
                    {deck.subject && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {deck.subject.short_tag} · {deck.subject.name}
                      </p>
                    )}
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${deck.is_public ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground"}`}>
                    {deck.is_public ? "Veřejný" : "Soukromý"}
                  </span>
                </div>
                {deck.description && <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{deck.description}</p>}
                <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                  <span>🃏 {deck.card_count} {deck.card_count === 1 ? "karta" : deck.card_count >= 2 && deck.card_count <= 4 ? "karty" : "karet"}</span>
                  <span>Otevřít →</span>
                </div>
              </Link>
              <div className="mt-4 space-y-3 border-t border-border/70 pt-4">
                <DeckOwnerToolbar deckId={deck.id} isPublic={deck.is_public ?? false} variant="compact" />
                <DeleteDeckButton deckId={deck.id} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          V tomto filtru nemáš žádné balíčky.
        </div>
      )}
    </section>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/70 bg-background/70 px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}

function DeckDashboardSkeleton() {
  return (
    <section className="mb-10 space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <div className="h-6 w-40 animate-pulse rounded bg-muted" />
          <div className="h-4 w-72 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-10 w-32 animate-pulse rounded-lg bg-muted" />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="rounded-xl border border-border/70 bg-background/70 px-4 py-3">
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            <div className="mt-2 h-8 w-16 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    </section>
  );
}

function PublicDeckListSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="glass-card rounded-xl p-5">
          <div className="h-5 w-2/3 animate-pulse rounded bg-muted" />
          <div className="mt-2 h-4 w-1/2 animate-pulse rounded bg-muted" />
          <div className="mt-3 h-4 w-full animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}
