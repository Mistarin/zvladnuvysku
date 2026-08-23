import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ListPageHeader, ListPageShell } from "@/components/layout/list-page-shell";
import { SearchLandingBar } from "@/components/search/search-landing-bar";
import { ShareLinkButton } from "@/components/share/share-link-button";
import { BookOpen, Layers } from "lucide-react";
import { DeleteDeckButton } from "@/components/flashcard/delete-deck-button";
import { DeckOwnerToolbar } from "@/components/flashcard/deck-owner-toolbar";
import { getSharePath } from "@/lib/share-links";
import { escapePostgrestText } from "@/lib/safe-query";

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
  share_slug: string;
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
    <ListPageShell>
      <ListPageHeader
        title="Balíčky kartiček"
        description={
          query
            ? <>Výsledky pro „<span className="font-medium text-foreground">{query}</span>“</>
            : "Veřejné balíčky napříč předměty."
        }
        icon={<Layers className="ui-accent-text h-5 w-5" />}
      />
      <div className="mb-8 space-y-2">
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
    </ListPageShell>
  );
}

async function PublicDeckListSection({ query }: { query: string }) {
  const supabase = await createClient();
  let decksQuery = supabase
    .from("flashcard_decks")
    .select("id, title, description, share_slug, card_count, subject:subject_id(name, slug, short_tag, faculty)")
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
      <div className="surface-card rounded-2xl p-10 text-center space-y-3">
        <p className="text-4xl"></p>
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
        <div key={deck.id} className="group block rounded-xl p-5 transition-colors surface-card interactive-surface">
          <div className="flex items-start justify-between gap-3">
            <Link href={`/flashcardy/${deck.id}`} className="min-w-0 flex-1 space-y-1">
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
            </Link>
            <div className="flex items-center gap-2">
              <ShareLinkButton
                path={getSharePath("deck", deck.share_slug)}
                className="px-2 py-1 text-[11px] sm:text-xs"
              />
              <div className="ui-accent-soft flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
                <BookOpen className="ui-accent-text h-4 w-4" />
              </div>
            </div>
          </div>

          <Link href={`/flashcardy/${deck.id}`} className="block">
            {deck.description && (
              <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                {deck.description}
              </p>
            )}

            <div className="flex items-center justify-between pt-3 text-xs text-muted-foreground">
              <span>
                 {deck.card_count} {deck.card_count === 1 ? "karta" : deck.card_count >= 2 && deck.card_count <= 4 ? "karty" : "karet"}
              </span>
              {deck.subject && (
                <span className="ui-accent-badge rounded px-1.5 py-0.5 font-mono">
                  {deck.subject.short_tag}
                </span>
              )}
            </div>
          </Link>
        </div>
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
    .select("id, title, description, share_slug, card_count, is_public, subject:subject_id(name, slug, short_tag, faculty)")
    .eq("creator_id", userId);

  if (mineQuery) {
    const safeQuery = escapePostgrestText(mineQuery);
    myDecksQuery = myDecksQuery.or(`title.ilike.%${safeQuery}%,description.ilike.%${safeQuery}%`);
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
    <section id="moje-balicky" className="mb-10 space-y-4 rounded-lg border border-white/5 bg-card/40  p-6  scroll-mt-24">
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

      <form className="grid gap-3 rounded-2xl border border-white/5 bg-background/50 p-4 md:grid-cols-[minmax(0,1fr)_180px_180px_auto]">
        <input type="text" name="mine_q" defaultValue={mineQuery} placeholder="Hledat v mých balíčcích..." className="w-full rounded-xl border border-white/5 bg-background  px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20" />
        <select name="mine_visibility" defaultValue={mineVisibility} className="w-full rounded-xl border border-white/5 bg-background  px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20">
          <option value="all">Všechny</option>
          <option value="public">Jen veřejné</option>
          <option value="private">Jen soukromé</option>
        </select>
        <select name="mine_sort" defaultValue={mineSort} className="w-full rounded-xl border border-white/5 bg-background  px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20">
          <option value="updated">Naposledy upravené</option>
          <option value="created">Nejnovější</option>
          <option value="cards">Nejvíc karet</option>
          <option value="title">A-Z</option>
        </select>
        <button type="submit" className="rounded-xl border border-white/5 bg-card/60  px-5 py-3 text-sm font-medium text-foreground hover:bg-muted/50 transition-colors">
          Filtrovat
        </button>
        {query && <input type="hidden" name="q" value={query} />}
      </form>

      {myDecks.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {myDecks.map((deck) => (
            <div key={deck.id} className="rounded-2xl border border-white/5 bg-background/50 p-6  transition-colors  hover: hover:border-primary/40 hover:bg-muted/30 group">
              <div className="flex items-start justify-between gap-3">
                <Link href={`/flashcardy/${deck.id}`} className="min-w-0 flex-1">
                  <h3 className="font-semibold text-foreground">{deck.title}</h3>
                  {deck.subject && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {deck.subject.short_tag} · {deck.subject.name}
                    </p>
                  )}
                </Link>
                <div className="flex items-center gap-2">
                  {deck.is_public && (
                    <ShareLinkButton
                      path={getSharePath("deck", deck.share_slug)}
                      className="px-2 py-1 text-[11px] sm:text-xs"
                    />
                  )}
                  <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${deck.is_public ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground"}`}>
                    {deck.is_public ? "Veřejný" : "Soukromý"}
                  </span>
                </div>
              </div>
              <Link href={`/flashcardy/${deck.id}`} className="mt-3 block">
                {deck.description && <p className="line-clamp-2 text-sm text-muted-foreground">{deck.description}</p>}
                <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                  <span> {deck.card_count} {deck.card_count === 1 ? "karta" : deck.card_count >= 2 && deck.card_count <= 4 ? "karty" : "karet"}</span>
                  <span>Otevřít </span>
                </div>
              </Link>
              <div className="mt-4 space-y-3 border-t border-white/5 pt-4">
                <DeckOwnerToolbar deckId={deck.id} isPublic={deck.is_public ?? false} variant="compact" />
                <DeleteDeckButton deckId={deck.id} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border-2 border-dashed border-white/10 px-4 py-8 text-center text-sm text-muted-foreground">
          V tomto filtru nemáš žádné balíčky.
        </div>
      )}
    </section>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-background/50  px-5 py-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}

function DeckDashboardSkeleton() {
  return (
    <section className="mb-10 space-y-4 rounded-lg border border-white/5 bg-card/40  p-6 ">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <div className="h-6 w-40 animate-pulse rounded bg-muted" />
          <div className="h-4 w-72 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-10 w-32 animate-pulse rounded-lg bg-muted" />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="rounded-2xl border border-white/5 bg-background/50  px-5 py-4">
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
        <div key={index} className="surface-card rounded-xl p-5">
          <div className="h-5 w-2/3 animate-pulse rounded bg-muted" />
          <div className="mt-2 h-4 w-1/2 animate-pulse rounded bg-muted" />
          <div className="mt-3 h-4 w-full animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}
