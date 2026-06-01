import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { MyActivityDashboard, type ActivityAttention, type ActivityCardData, type ActivitySectionData, type StatusTone } from "@/components/activity/my-activity-dashboard";
import { getPublicProfilePath } from "@/lib/public-profile";
import { createClient } from "@/lib/supabase/server";
import { getStoragePublicUrl } from "@/lib/storage";
import type { ActivityAcknowledgement, Feedback, FlashcardDeck, Profile, Subject, SubjectMaterial, SubjectProposalRecord } from "@/lib/types/database";
import { formatFileSize } from "@/lib/utils";

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

type ActivityAcknowledgementRow = Pick<ActivityAcknowledgement, "item_type" | "item_id" | "state_token">;

export default async function MyActivityPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/prihlaseni?redirect_to=/moje-aktivita");
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
          href={hasDisplayName ? getPublicProfilePath(user.id) : "/#hall-of-fame?action=set-display-name"}
          className="inline-flex items-center justify-center rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          {hasDisplayName ? "Otevřít veřejný profil" : "Nastavit jméno v žebříčku"}
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
    { data: acknowledgements },
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
    supabase.from("activity_acknowledgements").select("item_type, item_id, state_token").eq("user_id", userId),
  ]);

  const typedProfile = profile as Profile | null;
  const myDecks = (decks ?? []) as DeckWithSubject[];
  const myMaterials = (materials ?? []) as MaterialWithSubject[];
  const myProposals = (proposals ?? []) as SubjectProposalRecord[];
  const myFeedback = (feedback ?? []) as Feedback[];
  const myAcknowledgements = (acknowledgements ?? []) as ActivityAcknowledgementRow[];
  const acknowledgementSet = new Set(myAcknowledgements.map((item) => `${item.item_type}:${item.item_id}:${item.state_token}`));

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

  const sections: ActivitySectionData[] = [
    {
      id: "proposals",
      title: "Návrhy předmětů",
      description: "Přepni si mezi čekajícími, schválenými a zamítnutými návrhy. U schválených uvidíš i pozdější úpravy nebo smazání předmětu.",
      actionHref: "/navrhnout",
      actionLabel: "Poslat nový návrh",
      tabs: [
        {
          id: "pending",
          label: "Čeká",
          description: "Nové návrhy a úpravy čekající na kontrolu.",
          empty: "V čekajících návrzích teď nic není.",
          tone: "warning",
          items: proposalsWithState.filter(({ proposal }) => proposal.status === "pending").map((item) => buildProposalCard(item, acknowledgementSet)),
        },
        {
          id: "approved",
          label: "Schváleno",
          description: "Schválené návrhy včetně následných změn na navázaném předmětu.",
          empty: "Ve schválených návrzích teď nic není.",
          tone: "success",
          items: proposalsWithState.filter(({ proposal }) => proposal.status === "approved").map((item) => buildProposalCard(item, acknowledgementSet)),
        },
        {
          id: "rejected",
          label: "Zamítnuto",
          description: "Návrhy vrácené k doplnění nebo přepracování.",
          empty: "V zamítnutých návrzích teď nic není.",
          tone: "danger",
          items: proposalsWithState.filter(({ proposal }) => proposal.status === "rejected").map((item) => buildProposalCard(item, acknowledgementSet)),
        },
      ],
    },
    {
      id: "materials",
      title: "Nahrané materiály",
      description: "Přehled podle moderace. Poslední tři položky jsou hned vidět, starší si můžeš rozbalit.",
      tabs: [
        {
          id: "pending",
          label: "Čeká",
          description: "Materiály, které ještě neprošly moderací.",
          empty: "V čekajících materiálech teď nic není.",
          tone: "warning",
          items: myMaterials.filter((material) => material.moderation_status === "pending").map((material) => buildMaterialCard(material, acknowledgementSet)),
        },
        {
          id: "approved",
          label: "Schváleno",
          description: "Materiály dostupné ostatním uživatelům.",
          empty: "Ve schválených materiálech teď nic není.",
          tone: "success",
          items: myMaterials.filter((material) => material.moderation_status === "approved").map((material) => buildMaterialCard(material, acknowledgementSet)),
        },
        {
          id: "rejected",
          label: "Zamítnuto",
          description: "Materiály vrácené k doplnění nebo opravě.",
          empty: "V zamítnutých materiálech teď nic není.",
          tone: "danger",
          items: myMaterials.filter((material) => material.moderation_status === "rejected").map((material) => buildMaterialCard(material, acknowledgementSet)),
        },
      ],
    },
    {
      id: "feedback",
      title: "Feedback a nahlášené problémy",
      description: "Tři přehledné stavy pro to, jestli se problém řeší, čeká nebo už je uzavřený.",
      tabs: [
        {
          id: "new",
          label: "Nové",
          description: "Zprávy, které ještě nikdo nezačal řešit.",
          empty: "V novém feedbacku teď nic není.",
          tone: "muted",
          items: myFeedback.filter((item) => item.status === "new").map((item) => buildFeedbackCard(item, acknowledgementSet)),
        },
        {
          id: "in_progress",
          label: "Rozpracováno",
          description: "Feedback, na kterém už se pracuje.",
          empty: "V rozpracovaném feedbacku teď nic není.",
          tone: "warning",
          items: myFeedback.filter((item) => item.status === "in_progress").map((item) => buildFeedbackCard(item, acknowledgementSet)),
        },
        {
          id: "resolved",
          label: "Vyřešeno",
          description: "Uzavřené podněty a opravené problémy.",
          empty: "Ve vyřešeném feedbacku teď nic není.",
          tone: "success",
          items: myFeedback.filter((item) => item.status === "resolved").map((item) => buildFeedbackCard(item, acknowledgementSet)),
        },
      ],
    },
    {
      id: "decks",
      title: "Moje balíčky kartiček",
      description: "Rychlé rozdělení na veřejné a soukromé balíčky.",
      actionHref: "/flashcardy",
      actionLabel: "Otevřít dashboard kartiček",
      tabs: [
        {
          id: "public",
          label: "Veřejné",
          description: "Balíčky viditelné pro ostatní uživatele.",
          empty: "Ve veřejných balíčcích teď nic není.",
          tone: "success",
          items: myDecks.filter((deck) => deck.is_public).map((deck) => buildDeckCard(deck)),
        },
        {
          id: "private",
          label: "Soukromé",
          description: "Balíčky jen pro tebe nebo ještě nepřipravené ke sdílení.",
          empty: "V soukromých balíčcích teď nic není.",
          tone: "muted",
          items: myDecks.filter((deck) => !deck.is_public).map((deck) => buildDeckCard(deck)),
        },
      ],
    },
  ];

  return <MyActivityDashboard displayName={typedProfile?.display_name ?? null} sections={sections} />;
}

function buildProposalCard(item: ProposalWithSubjectState, acknowledgementSet: Set<string>): ActivityCardData {
  const { proposal, proposalData, linkedSubject, linkedState } = item;
  const title = proposalData.name || proposalData.short_tag || "Návrh předmětu";
  const linkedStateMeta = getProposalLinkedStateMeta(linkedState, linkedSubject?.updated_at);
  const panels: NonNullable<ActivityCardData["panels"]> = [];

  if (proposal.note?.trim()) {
    panels.push({
      label: "Tvoje poznámka",
      value: proposal.note,
      tone: "default" as const,
    });
  }

  if (proposal.rejection_reason) {
    panels.push({
      label: "Důvod zamítnutí",
      value: proposal.rejection_reason,
      tone: "danger" as const,
    });
  }

  const attention = getProposalAttention(item, acknowledgementSet);

  return {
    id: `proposal-${proposal.id}`,
    title,
    subtitle: `${proposal.type === "new" ? "Nový předmět" : "Úprava existujícího"} · Odesláno ${formatDate(proposal.created_at)}`,
    link: linkedSubject
      ? {
          href: `/predmety/${linkedSubject.slug}`,
          label: `${linkedSubject.short_tag} · ${linkedSubject.name}`,
        }
      : undefined,
    badges: [
      { label: getProposalStatusLabel(proposal.status), tone: getProposalStatusTone(proposal.status) },
      ...(linkedStateMeta ? [{ label: linkedStateMeta.label, tone: linkedStateMeta.tone }] : []),
      ...(attention?.acknowledged ? [{ label: "Přečteno", tone: "muted" as const }] : []),
    ],
    meta: [
      ...(proposal.reviewed_at ? [{ label: "Vyřízeno", value: formatDateTime(proposal.reviewed_at) }] : []),
      ...(linkedStateMeta?.detail ? [{ label: "Aktualizace", value: linkedStateMeta.detail }] : []),
    ],
    panels,
    attention,
  };
}

function buildMaterialCard(material: MaterialWithSubject, acknowledgementSet: Set<string>): ActivityCardData {
  const attention = getMaterialAttention(material, acknowledgementSet);
  const subjectLabel = material.subject ? `${material.subject.short_tag} · ${material.subject.name}` : undefined;
  const fileUrl = getStoragePublicUrl("study_materials", material.file_path);
  const panels = material.rejection_reason
    ? [
        {
          label: "Důvod zamítnutí",
          value: material.rejection_reason,
          tone: "danger" as const,
        },
      ]
    : undefined;

  return {
    id: `material-${material.id}`,
    title: material.title,
    subtitle: subjectLabel,
    supportingText: `Nahráno ${formatDateTime(material.created_at)}`,
    link: fileUrl
      ? {
          href: fileUrl,
          label: "Otevřít soubor",
          external: true,
        }
      : material.subject
        ? {
            href: `/predmety/${material.subject.slug}`,
            label: "Otevřít předmět",
          }
        : undefined,
    badges: [
      { label: getMaterialStatusLabel(material.moderation_status), tone: getMaterialStatusTone(material.moderation_status) },
      ...(attention?.acknowledged ? [{ label: "Přečteno", tone: "muted" as const }] : []),
    ],
    meta: [
      { label: "Velikost", value: formatFileSize(material.size_bytes) },
      ...(material.moderated_at ? [{ label: "Moderováno", value: formatDateTime(material.moderated_at) }] : []),
    ],
    panels,
    attention,
  };
}

function buildFeedbackCard(item: Feedback, acknowledgementSet: Set<string>): ActivityCardData {
  const attention = getFeedbackAttention(item, acknowledgementSet);

  return {
    id: `feedback-${item.id}`,
    title: getFeedbackTypeLabel(item.type),
    subtitle: item.source_label ? `Kontext: ${item.source_label}` : undefined,
    badges: [
      { label: getFeedbackStatusLabel(item.status), tone: getFeedbackStatusTone(item.status) },
      ...(attention?.acknowledged ? [{ label: "Přečteno", tone: "muted" as const }] : []),
    ],
    meta: [
      { label: "Odesláno", value: formatDateTime(item.created_at) },
      { label: "Naposledy změněno", value: formatDateTime(item.updated_at) },
    ],
    body: item.message,
    attention,
  };
}

function buildDeckCard(deck: DeckWithSubject): ActivityCardData {
  return {
    id: `deck-${deck.id}`,
    title: deck.title,
    subtitle: deck.subject ? `${deck.subject.short_tag} · ${deck.subject.name}` : undefined,
    link: {
      href: `/flashcardy/${deck.id}`,
      label: "Otevřít balíček",
    },
    badges: [{ label: deck.is_public ? "Veřejný" : "Soukromý", tone: deck.is_public ? "success" : "muted" }],
    meta: [
      { label: "Karet", value: String(deck.card_count) },
      { label: "Naposledy upraveno", value: formatDateTime(deck.updated_at) },
    ],
  };
}

function getProposalAttention(item: ProposalWithSubjectState, acknowledgementSet: Set<string>): ActivityAttention | undefined {
  if (item.proposal.status !== "rejected" && item.linkedState !== "updated" && item.linkedState !== "deleted") {
    return undefined;
  }

  const stateToken = buildProposalStateToken(item);
  return {
    itemType: "subject_proposal",
    itemId: item.proposal.id,
    stateToken,
    acknowledged: acknowledgementSet.has(`subject_proposal:${item.proposal.id}:${stateToken}`),
  };
}

function getMaterialAttention(material: MaterialWithSubject, acknowledgementSet: Set<string>): ActivityAttention | undefined {
  if (material.moderation_status !== "rejected") {
    return undefined;
  }

  const stateToken = buildMaterialStateToken(material);
  return {
    itemType: "subject_material",
    itemId: material.id,
    stateToken,
    acknowledged: acknowledgementSet.has(`subject_material:${material.id}:${stateToken}`),
  };
}

function getFeedbackAttention(item: Feedback, acknowledgementSet: Set<string>): ActivityAttention | undefined {
  if (item.status !== "new" && item.status !== "in_progress") {
    return undefined;
  }

  const stateToken = buildFeedbackStateToken(item);
  return {
    itemType: "feedback",
    itemId: item.id,
    stateToken,
    acknowledged: acknowledgementSet.has(`feedback:${item.id}:${stateToken}`),
  };
}

function buildProposalStateToken(item: ProposalWithSubjectState) {
  const { proposal, linkedState, linkedSubject } = item;
  return [proposal.status, proposal.reviewed_at ?? "", proposal.rejection_reason ?? "", linkedState ?? "", linkedSubject?.updated_at ?? ""].join("|");
}

function buildMaterialStateToken(material: MaterialWithSubject) {
  return [material.moderation_status, material.moderated_at ?? "", material.rejection_reason ?? ""].join("|");
}

function buildFeedbackStateToken(item: Feedback) {
  return [item.status, item.updated_at].join("|");
}

function MyActivitySkeleton() {
  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="rounded-2xl border border-border bg-card p-4">
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            <div className="mt-3 h-8 w-20 animate-pulse rounded bg-muted" />
            <div className="mt-2 h-4 w-full animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>

      {Array.from({ length: 4 }).map((_, index) => (
        <section key={index} className="space-y-4">
          <div className="h-6 w-48 animate-pulse rounded bg-muted" />
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 3 }).map((__, buttonIndex) => (
                <div key={buttonIndex} className="h-12 animate-pulse rounded-xl bg-muted" />
              ))}
            </div>
            <div className="mt-4 space-y-3">
              {Array.from({ length: 3 }).map((__, itemIndex) => (
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
