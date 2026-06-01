import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertCircle, BookOpen, CheckCircle2, Clock3, UserCircle2 } from "lucide-react";
import { getPublicProfilePath } from "@/lib/public-profile";
import { createClient } from "@/lib/supabase/server";
import type { Feedback, FlashcardDeck, Profile, Subject, SubjectMaterial, SubjectProposalRecord } from "@/lib/types/database";
import { cn, formatFileSize } from "@/lib/utils";

type DeckWithSubject = FlashcardDeck & {
  subject: { name: string; slug: string; short_tag: string } | null;
};

type MaterialWithSubject = SubjectMaterial & {
  subject: { name: string; slug: string; short_tag: string } | null;
};

type SubjectSummary = Pick<Subject, "id" | "slug" | "name" | "short_tag" | "updated_at">;

type ProposalData = {
  name?: string;
  short_tag?: string;
  slug?: string;
};

type ProposalWithSubjectState = {
  proposal: SubjectProposalRecord;
  proposalData: ProposalData;
  linkedSubject: SubjectSummary | null;
  linkedState: "active" | "updated" | "deleted" | "unknown" | null;
};

type StatusTone = "success" | "warning" | "danger" | "muted" | "info";

type ActivityGroup = {
  id: string;
  title: string;
  description: string;
  tone: StatusTone;
  items: ReactNode[];
};

export default async function MyActivityPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/prihlaseni");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("user_id", user.id)
    .maybeSingle();
  const typedProfile = profile as Pick<Profile, "display_name"> | null;
  const hasDisplayName = Boolean(typedProfile?.display_name?.trim());

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Moje aktivita</h1>
          <p className="mt-2 text-muted-foreground">
            Přehled tvých balíčků, návrhů, materiálů, feedbacku a změn po schválení.
          </p>
        </div>
        <Link
          href={hasDisplayName ? getPublicProfilePath(user.id) : "/#hall-of-fame"}
          className="inline-flex items-center justify-center rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          {hasDisplayName ? "Otevřít veřejný profil" : "Upravit Hall of Fame profil"}
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

  const proposalSubjectIds = Array.from(
    new Set(myProposals.map((proposal) => proposal.subject_id).filter((subjectId): subjectId is string => Boolean(subjectId))),
  );
  const inferredProposalSlugs = Array.from(
    new Set(
      myProposals
        .filter((proposal) => proposal.status === "approved" && proposal.type === "new" && !proposal.subject_id)
        .map((proposal) => inferProposalSlug(proposal.data as ProposalData))
        .filter((slug): slug is string => Boolean(slug)),
    ),
  );

  const [subjectsByIdResult, subjectsBySlugResult] = await Promise.all([
    proposalSubjectIds.length > 0
      ? supabase.from("subjects").select("id, slug, name, short_tag, updated_at").in("id", proposalSubjectIds)
      : Promise.resolve({ data: [] as SubjectSummary[] }),
    inferredProposalSlugs.length > 0
      ? supabase.from("subjects").select("id, slug, name, short_tag, updated_at").in("slug", inferredProposalSlugs)
      : Promise.resolve({ data: [] as SubjectSummary[] }),
  ]);

  const subjectsById = new Map<string, SubjectSummary>();
  const subjectsBySlug = new Map<string, SubjectSummary>();

  for (const subject of [...((subjectsByIdResult.data ?? []) as SubjectSummary[]), ...((subjectsBySlugResult.data ?? []) as SubjectSummary[])]) {
    subjectsById.set(subject.id, subject);
    subjectsBySlug.set(subject.slug, subject);
  }

  const proposalsWithState: ProposalWithSubjectState[] = myProposals.map((proposal) => {
    const proposalData = (proposal.data as ProposalData | null) ?? {};
    const inferredSlug = !proposal.subject_id ? inferProposalSlug(proposalData) : null;
    const linkedSubject = proposal.subject_id
      ? subjectsById.get(proposal.subject_id) ?? null
      : inferredSlug
        ? subjectsBySlug.get(inferredSlug) ?? null
        : null;

    return {
      proposal,
      proposalData,
      linkedSubject,
      linkedState: getProposalLinkedState(proposal, linkedSubject, Boolean(proposal.subject_id || inferredSlug)),
    };
  });

  const pendingMaterials = myMaterials.filter((material) => material.moderation_status === "pending");
  const approvedMaterials = myMaterials.filter((material) => material.moderation_status === "approved");
  const rejectedMaterials = myMaterials.filter((material) => material.moderation_status === "rejected");

  const pendingProposals = proposalsWithState.filter(({ proposal }) => proposal.status === "pending");
  const approvedProposals = proposalsWithState.filter(({ proposal }) => proposal.status === "approved");
  const rejectedProposals = proposalsWithState.filter(({ proposal }) => proposal.status === "rejected");

  const newFeedback = myFeedback.filter((item) => item.status === "new");
  const inProgressFeedback = myFeedback.filter((item) => item.status === "in_progress");
  const resolvedFeedback = myFeedback.filter((item) => item.status === "resolved");

  const publicDecks = myDecks.filter((deck) => deck.is_public);
  const privateDecks = myDecks.filter((deck) => !deck.is_public);

  const pendingReviewCount = pendingMaterials.length + pendingProposals.length;
  const approvedContributionCount = approvedMaterials.length + approvedProposals.length;
  const attentionCount =
    rejectedMaterials.length +
    rejectedProposals.length +
    approvedProposals.filter(({ linkedState }) => linkedState === "deleted" || linkedState === "updated").length;
  const openFeedbackCount = newFeedback.length + inProgressFeedback.length;

  const proposalGroups: ActivityGroup[] = [
    {
      id: "proposal-pending",
      title: "Čeká na schválení",
      description: "Nové návrhy a úpravy čekající na kontrolu.",
      tone: "warning",
      items: pendingProposals.map((item) => <ProposalCard key={item.proposal.id} item={item} />),
    },
    {
      id: "proposal-approved",
      title: "Schváleno",
      description: "Schválené návrhy včetně pozdějších změn na navázaném předmětu.",
      tone: "success",
      items: approvedProposals.map((item) => <ProposalCard key={item.proposal.id} item={item} />),
    },
    {
      id: "proposal-rejected",
      title: "Zamítnuto",
      description: "Návrhy, které potřebují přepracovat nebo doplnit.",
      tone: "danger",
      items: rejectedProposals.map((item) => <ProposalCard key={item.proposal.id} item={item} />),
    },
  ];

  const materialGroups: ActivityGroup[] = [
    {
      id: "material-pending",
      title: "Čeká na schválení",
      description: "Materiály, které ještě neprošly moderací.",
      tone: "warning",
      items: pendingMaterials.map((material) => <MaterialCard key={material.id} material={material} />),
    },
    {
      id: "material-approved",
      title: "Schváleno",
      description: "Materiály dostupné ostatním uživatelům.",
      tone: "success",
      items: approvedMaterials.map((material) => <MaterialCard key={material.id} material={material} />),
    },
    {
      id: "material-rejected",
      title: "Zamítnuto",
      description: "Materiály vrácené k doplnění nebo opravě.",
      tone: "danger",
      items: rejectedMaterials.map((material) => <MaterialCard key={material.id} material={material} />),
    },
  ];

  const feedbackGroups: ActivityGroup[] = [
    {
      id: "feedback-new",
      title: "Nové",
      description: "Zprávy, které ještě nikdo nezačal řešit.",
      tone: "muted",
      items: newFeedback.map((item) => <FeedbackCard key={item.id} item={item} />),
    },
    {
      id: "feedback-progress",
      title: "Rozpracováno",
      description: "Feedback, na kterém už se pracuje.",
      tone: "warning",
      items: inProgressFeedback.map((item) => <FeedbackCard key={item.id} item={item} />),
    },
    {
      id: "feedback-resolved",
      title: "Vyřešeno",
      description: "Uzavřené podněty a opravené problémy.",
      tone: "success",
      items: resolvedFeedback.map((item) => <FeedbackCard key={item.id} item={item} />),
    },
  ];

  const deckGroups: ActivityGroup[] = [
    {
      id: "deck-public",
      title: "Veřejné",
      description: "Balíčky viditelné pro ostatní uživatele.",
      tone: "success",
      items: publicDecks.map((deck) => <DeckCard key={deck.id} deck={deck} />),
    },
    {
      id: "deck-private",
      title: "Soukromé",
      description: "Balíčky jen pro tebe nebo ještě nepřipravené ke sdílení.",
      tone: "muted",
      items: privateDecks.map((deck) => <DeckCard key={deck.id} deck={deck} />),
    },
  ];

  return (
    <>
      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryCard
          icon={<UserCircle2 className="h-4 w-4" />}
          label="Veřejné jméno"
          value={typedProfile?.display_name?.trim() || "Chybí"}
          meta={typedProfile?.display_name?.trim() ? "Zobrazuje se u profilu a recenzí." : "Doplň si ho pro veřejný profil a recenze."}
        />
        <SummaryCard
          icon={<BookOpen className="h-4 w-4" />}
          label="Balíčky"
          value={String(myDecks.length)}
          meta={`${publicDecks.length} veřejné · ${privateDecks.length} soukromé`}
        />
        <SummaryCard
          icon={<Clock3 className="h-4 w-4" />}
          label="Čeká na schválení"
          value={String(pendingReviewCount)}
          meta={`${pendingProposals.length} návrhy · ${pendingMaterials.length} materiály`}
          tone="warning"
        />
        <SummaryCard
          icon={<CheckCircle2 className="h-4 w-4" />}
          label="Schválené příspěvky"
          value={String(approvedContributionCount)}
          meta={`${approvedProposals.length} návrhy · ${approvedMaterials.length} materiály`}
          tone="success"
        />
        <SummaryCard
          icon={<AlertCircle className="h-4 w-4" />}
          label="Potřebuje pozornost"
          value={String(attentionCount + openFeedbackCount)}
          meta={`${attentionCount} příspěvky · ${openFeedbackCount} otevřený feedback`}
          tone={attentionCount + openFeedbackCount > 0 ? "danger" : "muted"}
        />
      </div>

      <div className="space-y-8">
        <ActivitySection
          title="Návrhy předmětů"
          description="U schválených návrhů uvidíš i to, jestli byl navázaný předmět od té doby upraven nebo smazán."
          empty="Zatím jsi neposlal žádný návrh předmětu."
          actionHref="/navrhnout"
          actionLabel="Poslat nový návrh"
          groups={proposalGroups}
        />

        <div className="grid gap-8 xl:grid-cols-2">
          <ActivitySection
            title="Nahrané materiály"
            description="Rozdělené podle moderace, aby bylo hned vidět, co ještě čeká a co se vrátilo."
            empty="Zatím jsi nenahrál žádný materiál."
            groups={materialGroups}
          />
          <ActivitySection
            title="Feedback a nahlášené problémy"
            description="Přehled, v jaké fázi je každý nahlášený problém nebo návrh."
            empty="Zatím jsi neposlal žádnou zprávu."
            groups={feedbackGroups}
          />
        </div>

        <ActivitySection
          title="Moje balíčky kartiček"
          description="Rychlé rozdělení na veřejné a soukromé balíčky."
          empty="Zatím jsi nevytvořil žádný balíček."
          actionHref="/flashcardy"
          actionLabel="Otevřít dashboard kartiček"
          groups={deckGroups}
        />
      </div>
    </>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  meta,
  tone = "muted",
}: {
  icon: ReactNode;
  label: string;
  value: string;
  meta: string;
  tone?: Exclude<StatusTone, "info">;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className={cn("inline-flex h-8 w-8 items-center justify-center rounded-full", getToneSurfaceClass(tone))}>{icon}</span>
        <span>{label}</span>
      </div>
      <p className="mt-3 text-xl font-semibold text-foreground">{value}</p>
      <p className="mt-2 text-sm text-muted-foreground">{meta}</p>
    </div>
  );
}

function ActivitySection({
  title,
  description,
  empty,
  groups,
  actionHref,
  actionLabel,
}: {
  title: string;
  description: string;
  empty: string;
  groups: ActivityGroup[];
  actionHref?: string;
  actionLabel?: string;
}) {
  const visibleGroups = groups.filter((group) => group.items.length > 0);

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        {actionHref && actionLabel ? (
          <Link href={actionHref} className="text-sm font-medium text-primary hover:underline">
            {actionLabel}
          </Link>
        ) : null}
      </div>

      {visibleGroups.length > 0 ? (
        <div className="space-y-4">
          {visibleGroups.map((group) => (
            <StatusGroup key={group.id} title={group.title} description={group.description} tone={group.tone} count={group.items.length}>
              {group.items}
            </StatusGroup>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-background/40 px-4 py-8 text-center text-sm text-muted-foreground">{empty}</div>
      )}
    </section>
  );
}

function StatusGroup({
  title,
  description,
  tone,
  count,
  children,
}: {
  title: string;
  description: string;
  tone: StatusTone;
  count: number;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-4 flex flex-col gap-3 border-b border-border/70 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-foreground">{title}</h3>
            <StatusBadge tone={tone}>{count}</StatusBadge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function ProposalCard({ item }: { item: ProposalWithSubjectState }) {
  const { proposal, proposalData, linkedSubject, linkedState } = item;
  const title = proposalData.name || proposalData.short_tag || "Návrh předmětu";
  const linkedStateMeta = getProposalLinkedStateMeta(linkedState, linkedSubject?.updated_at);

  return (
    <div className="rounded-2xl border border-border bg-background/70 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-foreground">{title}</p>
            <StatusBadge tone={getProposalStatusTone(proposal.status)}>{getProposalStatusLabel(proposal.status)}</StatusBadge>
            {linkedStateMeta ? <StatusBadge tone={linkedStateMeta.tone}>{linkedStateMeta.label}</StatusBadge> : null}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {proposal.type === "new" ? "Nový předmět" : "Úprava existujícího"} · Odesláno {formatDate(proposal.created_at)}
          </p>
          {linkedSubject ? (
            <Link href={`/predmety/${linkedSubject.slug}`} className="mt-2 inline-flex items-center gap-2 text-sm text-primary hover:underline">
              {linkedSubject.short_tag} · {linkedSubject.name}
            </Link>
          ) : null}
        </div>
      </div>

      <div className="mt-4 grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
        {proposal.reviewed_at ? <MetaRow label="Vyřízeno" value={formatDateTime(proposal.reviewed_at)} /> : null}
        {linkedStateMeta?.detail ? <MetaRow label="Aktualizace" value={linkedStateMeta.detail} /> : null}
      </div>

      {proposal.note?.trim() ? (
        <div className="mt-4 rounded-xl border border-border/70 bg-card px-3 py-2">
          <p className="text-xs font-medium text-muted-foreground">Tvoje poznámka</p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-foreground/90">{proposal.note}</p>
        </div>
      ) : null}

      {proposal.rejection_reason ? (
        <div className="mt-4 rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2">
          <p className="text-xs font-medium text-destructive">Důvod zamítnutí</p>
          <p className="mt-1 text-sm text-destructive">{proposal.rejection_reason}</p>
        </div>
      ) : null}
    </div>
  );
}

function MaterialCard({ material }: { material: MaterialWithSubject }) {
  return (
    <div className="rounded-2xl border border-border bg-background/70 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-foreground">{material.title}</p>
            <StatusBadge tone={getMaterialStatusTone(material.moderation_status)}>{getMaterialStatusLabel(material.moderation_status)}</StatusBadge>
          </div>
          {material.subject ? (
            <Link href={`/predmety/${material.subject.slug}`} className="mt-1 block text-sm text-primary hover:underline">
              {material.subject.short_tag} · {material.subject.name}
            </Link>
          ) : null}
        </div>
      </div>

      <div className="mt-4 grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
        <MetaRow label="Nahráno" value={formatDateTime(material.created_at)} />
        <MetaRow label="Velikost" value={formatFileSize(material.size_bytes)} />
        {material.moderated_at ? <MetaRow label="Moderováno" value={formatDateTime(material.moderated_at)} /> : null}
      </div>

      {material.rejection_reason ? (
        <div className="mt-4 rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2">
          <p className="text-xs font-medium text-destructive">Důvod zamítnutí</p>
          <p className="mt-1 text-sm text-destructive">{material.rejection_reason}</p>
        </div>
      ) : null}
    </div>
  );
}

function FeedbackCard({ item }: { item: Feedback }) {
  return (
    <div className="rounded-2xl border border-border bg-background/70 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-foreground">{getFeedbackTypeLabel(item.type)}</p>
            <StatusBadge tone={getFeedbackStatusTone(item.status)}>{getFeedbackStatusLabel(item.status)}</StatusBadge>
          </div>
          {item.source_label ? <p className="mt-1 text-sm text-muted-foreground">Kontext: {item.source_label}</p> : null}
        </div>
      </div>

      <p className="mt-4 whitespace-pre-wrap text-sm text-foreground/90">{item.message}</p>

      <div className="mt-4 grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
        <MetaRow label="Odesláno" value={formatDateTime(item.created_at)} />
        <MetaRow label="Naposledy změněno" value={formatDateTime(item.updated_at)} />
      </div>
    </div>
  );
}

function DeckCard({ deck }: { deck: DeckWithSubject }) {
  return (
    <div className="rounded-2xl border border-border bg-background/70 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/flashcardy/${deck.id}`} className="font-semibold text-foreground hover:text-primary">
              {deck.title}
            </Link>
            <StatusBadge tone={deck.is_public ? "success" : "muted"}>{deck.is_public ? "Veřejný" : "Soukromý"}</StatusBadge>
          </div>
          {deck.subject ? <p className="mt-1 text-sm text-muted-foreground">{deck.subject.short_tag} · {deck.subject.name}</p> : null}
        </div>
      </div>

      <div className="mt-4 grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
        <MetaRow label="Karet" value={String(deck.card_count)} />
        <MetaRow label="Naposledy upraveno" value={formatDateTime(deck.updated_at)} />
      </div>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground/80">{label}</p>
      <p className="mt-1 text-sm text-foreground/90">{value}</p>
    </div>
  );
}

function StatusBadge({ tone, children }: { tone: StatusTone; children: ReactNode }) {
  return <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold", getToneSurfaceClass(tone))}>{children}</span>;
}

function MyActivitySkeleton() {
  return (
    <>
      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="rounded-2xl border border-border bg-card p-4">
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            <div className="mt-3 h-8 w-20 animate-pulse rounded bg-muted" />
            <div className="mt-2 h-4 w-full animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>

      <div className="space-y-8">
        {Array.from({ length: 3 }).map((_, index) => (
          <section key={index} className="space-y-4">
            <div className="h-6 w-48 animate-pulse rounded bg-muted" />
            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="h-4 w-40 animate-pulse rounded bg-muted" />
              <div className="mt-4 space-y-3">
                {Array.from({ length: 2 }).map((__, itemIndex) => (
                  <div key={itemIndex} className="rounded-2xl border border-border bg-background/70 p-4">
                    <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
                    <div className="mt-2 h-4 w-1/2 animate-pulse rounded bg-muted" />
                  </div>
                ))}
              </div>
            </div>
          </section>
        ))}
      </div>
    </>
  );
}

function inferProposalSlug(proposalData: ProposalData) {
  const explicitSlug = proposalData.slug?.trim();
  if (explicitSlug) {
    return explicitSlug;
  }

  const base = proposalData.short_tag?.trim() || proposalData.name?.trim() || "";
  return base ? base.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") : null;
}

function getProposalLinkedState(
  proposal: SubjectProposalRecord,
  linkedSubject: SubjectSummary | null,
  hadLinkHint: boolean,
): ProposalWithSubjectState["linkedState"] {
  if (proposal.status !== "approved") {
    return null;
  }

  if (!hadLinkHint) {
    return "unknown";
  }

  if (!linkedSubject) {
    return "deleted";
  }

  if (proposal.reviewed_at) {
    const reviewedAt = new Date(proposal.reviewed_at).getTime();
    const updatedAt = new Date(linkedSubject.updated_at).getTime();

    if (!Number.isNaN(reviewedAt) && !Number.isNaN(updatedAt) && updatedAt > reviewedAt + 1000) {
      return "updated";
    }
  }

  return "active";
}

function getProposalLinkedStateMeta(linkedState: ProposalWithSubjectState["linkedState"], updatedAt?: string | null) {
  switch (linkedState) {
    case "updated":
      return {
        label: "Později upraveno",
        tone: "info" as const,
        detail: updatedAt ? `Poslední změna ${formatDateTime(updatedAt)}.` : "Navázaný předmět se po schválení změnil.",
      };
    case "deleted":
      return {
        label: "Později smazáno",
        tone: "danger" as const,
        detail: "Navázaný předmět už v katalogu není.",
      };
    case "active":
      return {
        label: "Aktuální",
        tone: "success" as const,
        detail: null,
      };
    case "unknown":
      return {
        label: "Nelze navázat",
        tone: "muted" as const,
        detail: "U staršího návrhu chybí dost dat pro spolehlivé propojení.",
      };
    default:
      return null;
  }
}

function getToneSurfaceClass(tone: StatusTone) {
  switch (tone) {
    case "success":
      return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
    case "warning":
      return "bg-amber-500/10 text-amber-700 dark:text-amber-400";
    case "danger":
      return "bg-destructive/10 text-destructive";
    case "info":
      return "bg-sky-500/10 text-sky-700 dark:text-sky-400";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function getMaterialStatusTone(status: SubjectMaterial["moderation_status"]): StatusTone {
  switch (status) {
    case "approved":
      return "success";
    case "rejected":
      return "danger";
    default:
      return "warning";
  }
}

function getProposalStatusTone(status: SubjectProposalRecord["status"]): StatusTone {
  switch (status) {
    case "approved":
      return "success";
    case "rejected":
      return "danger";
    default:
      return "warning";
  }
}

function getFeedbackStatusTone(status: Feedback["status"]): StatusTone {
  switch (status) {
    case "resolved":
      return "success";
    case "in_progress":
      return "warning";
    default:
      return "muted";
  }
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

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("cs-CZ");
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("cs-CZ");
}
