import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Feedback, FlashcardDeck, Profile, SubjectMaterial, SubjectProposalRecord } from "@/lib/types/database";

type DeckWithSubject = FlashcardDeck & {
  subject: { name: string; slug: string; short_tag: string } | null;
};

type MaterialWithSubject = SubjectMaterial & {
  subject: { name: string; slug: string; short_tag: string } | null;
};

export default async function MyActivityPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/prihlaseni");
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Moje aktivita</h1>
          <p className="mt-2 text-muted-foreground">
            Přehled tvých balíčků, návrhů, materiálů, feedbacku a Hall of Fame profilu.
          </p>
        </div>
        <Link
          href="/#hall-of-fame"
          className="inline-flex items-center justify-center rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          Upravit Hall of Fame profil
        </Link>
      </div>

      <Suspense fallback={<MyActivitySkeleton />}>
        <MyActivitySections userId={user.id} />
      </Suspense>
    </div>
  );
}

async function MyActivitySections({ userId }: { userId: string }) {
  const supabase = await createClient();
  const [
    { data: profile },
    { data: decks },
    { data: materials },
    { data: proposals },
    { data: feedback },
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("flashcard_decks").select("*, subject:subject_id(name, slug, short_tag)").eq("creator_id", userId).order("updated_at", { ascending: false }),
    supabase.from("subject_materials").select("*, subject:subject_id(name, slug, short_tag)").eq("uploader_id", userId).order("created_at", { ascending: false }),
    (supabase as unknown as {
      from: (table: "subject_proposals") => {
        select: (columns: string) => {
          eq: (column: string, value: string) => {
            order: (column: string, options: { ascending: boolean }) => Promise<{ data: SubjectProposalRecord[] | null }>;
          };
        };
      };
    }).from("subject_proposals").select("*").eq("proposed_by", userId).order("created_at", { ascending: false }),
    supabase.from("feedback").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
  ]);

  const typedProfile = profile as Profile | null;
  const myDecks = (decks ?? []) as DeckWithSubject[];
  const myMaterials = (materials ?? []) as MaterialWithSubject[];
  const myProposals = (proposals ?? []) as SubjectProposalRecord[];
  const myFeedback = (feedback ?? []) as Feedback[];

  return (
    <>
      <div className="mb-8 grid gap-4 md:grid-cols-4">
        <SummaryCard label="Veřejné jméno" value={typedProfile?.display_name?.trim() || "Chybí"} />
        <SummaryCard label="Moje balíčky" value={String(myDecks.length)} />
        <SummaryCard label="Moje materiály" value={String(myMaterials.length)} />
        <SummaryCard label="Moje návrhy" value={String(myProposals.length)} />
      </div>

      <div className="grid gap-8 xl:grid-cols-2">
        <ActivitySection title="Moje balíčky kartiček" empty="Zatím jsi nevytvořil žádný balíček." actionHref="/flashcardy" actionLabel="Otevřít dashboard kartiček">
          {myDecks.map((deck) => (
            <div key={deck.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Link href={`/flashcardy/${deck.id}`} className="font-semibold text-foreground hover:text-primary">{deck.title}</Link>
                  <p className="mt-1 text-sm text-muted-foreground">{deck.card_count} karet · {deck.is_public ? "Veřejný" : "Soukromý"}</p>
                  {deck.subject && <p className="mt-1 text-xs text-muted-foreground">{deck.subject.short_tag} · {deck.subject.name}</p>}
                </div>
                <StatusBadge tone={deck.is_public ? "success" : "muted"}>{deck.is_public ? "Veřejný" : "Soukromý"}</StatusBadge>
              </div>
            </div>
          ))}
        </ActivitySection>

        <ActivitySection title="Nahrané materiály" empty="Zatím jsi nenahrál žádný materiál.">
          {myMaterials.map((material) => (
            <div key={material.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-foreground">{material.title}</p>
                  {material.subject && <Link href={`/predmety/${material.subject.slug}`} className="mt-1 block text-sm text-muted-foreground hover:text-foreground">{material.subject.short_tag} · {material.subject.name}</Link>}
                  <p className="mt-1 text-xs text-muted-foreground">{new Date(material.created_at).toLocaleDateString("cs-CZ")}</p>
                  {material.rejection_reason && <p className="mt-2 text-sm text-destructive">Důvod zamítnutí: {material.rejection_reason}</p>}
                </div>
                <StatusBadge tone={material.moderation_status === "approved" ? "success" : material.moderation_status === "rejected" ? "danger" : "warning"}>{getMaterialStatusLabel(material.moderation_status)}</StatusBadge>
              </div>
            </div>
          ))}
        </ActivitySection>

        <ActivitySection title="Návrhy předmětů" empty="Zatím jsi neposlal žádný návrh předmětu." actionHref="/navrhnout" actionLabel="Poslat nový návrh">
          {myProposals.map((proposal) => {
            const proposalData = proposal.data as { name?: string; short_tag?: string };
            return (
              <div key={proposal.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-foreground">{proposalData.name || proposalData.short_tag || "Návrh předmětu"}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{proposal.type === "new" ? "Nový předmět" : "Úprava existujícího"} · {new Date(proposal.created_at).toLocaleDateString("cs-CZ")}</p>
                    {proposal.rejection_reason && <p className="mt-2 text-sm text-destructive">Důvod zamítnutí: {proposal.rejection_reason}</p>}
                  </div>
                  <StatusBadge tone={proposal.status === "approved" ? "success" : proposal.status === "rejected" ? "danger" : "warning"}>{getProposalStatusLabel(proposal.status)}</StatusBadge>
                </div>
              </div>
            );
          })}
        </ActivitySection>

        <ActivitySection title="Feedback a nahlášené problémy" empty="Zatím jsi neposlal žádnou zprávu.">
          {myFeedback.map((item) => (
            <div key={item.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-foreground">{getFeedbackTypeLabel(item.type)}</p>
                  {item.source_label && <p className="mt-1 text-xs text-muted-foreground">Kontext: {item.source_label}</p>}
                  <p className="mt-2 whitespace-pre-wrap text-sm text-foreground/90">{item.message}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{new Date(item.created_at).toLocaleString("cs-CZ")}</p>
                </div>
                <StatusBadge tone={item.status === "resolved" ? "success" : item.status === "in_progress" ? "warning" : "muted"}>{getFeedbackStatusLabel(item.status)}</StatusBadge>
              </div>
            </div>
          ))}
        </ActivitySection>
      </div>
    </>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-xl font-semibold text-foreground">{value}</p>
    </div>
  );
}

function ActivitySection({
  title,
  empty,
  children,
  actionHref,
  actionLabel,
}: {
  title: string;
  empty: string;
  children: React.ReactNode[];
  actionHref?: string;
  actionLabel?: string;
}) {
  const items = children.filter(Boolean);
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-foreground">{title}</h2>
        {actionHref && actionLabel && <Link href={actionHref} className="text-sm font-medium text-primary hover:underline">{actionLabel}</Link>}
      </div>
      {items.length > 0 ? (
        <div className="space-y-3">{items}</div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-background/40 px-4 py-8 text-center text-sm text-muted-foreground">{empty}</div>
      )}
    </section>
  );
}

function StatusBadge({ tone, children }: { tone: "success" | "warning" | "danger" | "muted"; children: React.ReactNode }) {
  const toneClass = tone === "success"
    ? "bg-emerald-500/10 text-emerald-600"
    : tone === "warning"
      ? "bg-amber-500/10 text-amber-600"
      : tone === "danger"
        ? "bg-destructive/10 text-destructive"
        : "bg-muted text-muted-foreground";
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${toneClass}`}>{children}</span>;
}

function MyActivitySkeleton() {
  return (
    <>
      <div className="mb-8 grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-2xl border border-border bg-card p-4">
            <div className="h-4 w-20 animate-pulse rounded bg-muted" />
            <div className="mt-2 h-8 w-16 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
      <div className="grid gap-8 xl:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <section key={index} className="space-y-4">
            <div className="h-6 w-40 animate-pulse rounded bg-muted" />
            <div className="space-y-3">
              {Array.from({ length: 2 }).map((__, itemIndex) => (
                <div key={itemIndex} className="rounded-2xl border border-border bg-card p-4">
                  <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
                  <div className="mt-2 h-4 w-1/2 animate-pulse rounded bg-muted" />
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}

function getMaterialStatusLabel(status: SubjectMaterial["moderation_status"]) {
  switch (status) {
    case "approved":
      return "Schváleno";
    case "rejected":
      return "Zamítnuto";
    default:
      return "Čeká na schválení";
  }
}

function getProposalStatusLabel(status: SubjectProposalRecord["status"]) {
  switch (status) {
    case "approved":
      return "Schváleno";
    case "rejected":
      return "Zamítnuto";
    default:
      return "Čeká na schválení";
  }
}

function getFeedbackStatusLabel(status: Feedback["status"]) {
  switch (status) {
    case "resolved":
      return "Vyřešeno";
    case "in_progress":
      return "Rozpracováno";
    default:
      return "Nové";
  }
}

function getFeedbackTypeLabel(type: Feedback["type"]) {
  switch (type) {
    case "feature":
      return "Návrh vylepšení";
    case "other":
      return "Jiná zpráva";
    default:
      return "Nahlášený problém";
  }
}
