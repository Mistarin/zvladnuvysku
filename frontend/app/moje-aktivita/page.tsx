import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { MyActivityDashboard, type ActivityAttention, type ActivityCardData, type ActivitySectionData, type StatusTone } from "@/components/activity/my-activity-dashboard";
import type { MaterialGroupData } from "@/components/subject/material-group-card";
import { getPublicProfilePath } from "@/lib/public-profile";
import { getPublicProfileIdentity, hasPublicProfileIdentity } from "@/lib/public-profile-identity";
import { createClient } from "@/lib/supabase/server";
import { normalizeDepartmentName } from "@/lib/department-name";
import { getStoragePublicUrl } from "@/lib/storage";
import type { ActivityAcknowledgement, Feedback, FlashcardDeck, Profile, Subject, SubjectMaterial, SubjectProposalRecord } from "@/lib/types/database";
import { formatFileSize } from "@/lib/utils";

type DeckWithSubject = FlashcardDeck & {
  subject: { name: string; slug: string; short_tag: string } | null;
};

type MaterialWithSubject = SubjectMaterial & {
  subject: { name: string; slug: string; short_tag: string } | null;
};

type MaterialGroupWithSubject = {
  id: string;
  title: string;
  share_slug: string;
  uploader_id: string;
  created_at: string;
  subject: { id: string; name: string; slug: string; short_tag: string } | null;
  materials: Array<{
    id: string;
    title: string;
    share_slug: string;
    file_path: string;
    size_bytes: number;
    page_count: number | null;
    created_at: string;
    moderation_status: "pending" | "approved" | "rejected";
  }> | null;
};

type SubjectSummary = Pick<Subject, "id" | "slug" | "name" | "short_tag" | "updated_at">;

type ProposalData = {
  name?: string;
  short_tag?: string;
  slug?: string;
  description?: string;
  target_audience?: string;
  real_requirements?: string;
  difficulty?: number;
  time_intensity?: number;
  attendance_type?: string;
  exam_from_home?: boolean;
  credits?: number;
  semester?: string;
  faculty?: string;
  year?: number;
  teachers?: Array<{ id?: string; name?: string; faculty?: string | null; department?: string | null }>;
  materials?: Array<{ title?: string; file_path?: string; size_bytes?: number }>;
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
    .select("display_name, faculty, secondary_faculty")
    .eq("user_id", user.id)
    .maybeSingle();
  const typedProfile = profile as Pick<Profile, "display_name" | "faculty" | "secondary_faculty"> | null;
  const hasPublicIdentity = hasPublicProfileIdentity(typedProfile);

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-3">
        <span className="inline-flex rounded-md border border-[#F6B73C]/25 bg-[#F6B73C]/12 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#F6B73C]">
          Dashboard
        </span>
      </div>

      <div className="mb-6 rounded-[30px] border border-[#22344D] bg-[linear-gradient(180deg,#0D1B2E,#07111F)] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.32)] sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-50 sm:text-4xl">Moje aktivita</h1>
            <p className="mt-3 max-w-2xl text-sm text-slate-400 sm:text-base">
            Všechny tvoje balíčky, návrhy, materiály i feedback na jednom místě.
            </p>
          </div>
          <Link
            href={hasPublicIdentity ? getPublicProfilePath(user.id) : "/#hall-of-fame"}
            className="inline-flex items-center justify-center rounded-xl border border-[#22344D] bg-[#13243A] px-5 py-2.5 text-sm font-medium text-[#F4F8FB] transition-colors hover:bg-[#22344D]"
          >
            {hasPublicIdentity ? "Otevřít veřejný profil" : "Doplnit veřejný profil"}
          </Link>
        </div>
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
    { data: groups },
    { data: proposals },
    { data: feedback },
    { data: acknowledgements },
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("flashcard_decks").select("*, subject:subject_id(name, slug, short_tag)").eq("creator_id", userId).order("updated_at", { ascending: false }),
    supabase.from("subject_materials").select("*, subject:subject_id(name, slug, short_tag)").eq("uploader_id", userId).order("created_at", { ascending: false }),
    supabase
      .from("material_groups")
      .select("id, title, share_slug, uploader_id, created_at, subject:subject_id(id, name, slug, short_tag), materials:subject_materials(id, title, share_slug, file_path, size_bytes, page_count, moderation_status)")
      .eq("uploader_id", userId)
      .order("created_at", { ascending: false }),
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
  const publicIdentity = getPublicProfileIdentity(typedProfile);
  const myDecks = (decks ?? []) as DeckWithSubject[];
  const myMaterials = (materials ?? []) as MaterialWithSubject[];
  const myGroups = ((groups ?? []) as MaterialGroupWithSubject[]).map((group) => ({
    id: group.id,
    title: group.title,
    share_slug: group.share_slug,
    uploader_id: group.uploader_id,
    created_at: group.created_at,
    uploader_display_name: typedProfile?.display_name ?? null,
    subject: group.subject,
    materials: (group.materials ?? []).map((material) => ({
      ...material,
      created_at: material.created_at,
      public_url: getStoragePublicUrl("study_materials", material.file_path) ?? "",
    })),
  })) satisfies MaterialGroupData[];
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
      description: "Přehled čekajících, schválených i vrácených návrhů. U schválených uvidíš i pozdější změny na předmětu.",
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
      description: "Materiály rozdělené podle stavu moderace.",
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
      id: "groups",
      title: "Skupiny materiálů",
      description: "Složky materiálů můžeš filtrovat podle předmětu a rovnou je přejmenovat nebo spravovat.",
      tabs: [
        {
          id: "all",
          label: "Všechny",
          description: "Každá skupina zobrazuje svoje soubory i rychlou správu názvu.",
          empty: "Zatím nemáš žádné skupiny materiálů.",
          tone: "muted",
          items: myGroups.map((group) => buildMaterialGroupCard(group)),
        },
      ],
    },
    {
      id: "feedback",
      title: "Feedback a nahlášené problémy",
      description: "Uvidíš, co je nové, co se řeší a co už je uzavřené.",
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
      description: "Přehled veřejných i soukromých balíčků.",
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

  return (
    <div className="space-y-8">
      <MyActivityDashboard publicIdentity={publicIdentity} sections={sections} />
    </div>
  );
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

  panels.push(...buildProposalDataPanels(proposalData));

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
    actions: proposal.status === "pending"
      ? [
          { type: "link", href: `/navrhnout?proposal=${proposal.id}`, label: "Upravit návrh" },
          { type: "deletePendingProposal", proposalId: proposal.id, label: "Smazat návrh" },
        ]
      : undefined,
    attention,
  };
}

function buildProposalDataPanels(proposalData: ProposalData): NonNullable<ActivityCardData["panels"]> {
  const lines = [
    formatProposalLine("Název", proposalData.name),
    formatProposalLine("Zkratka", proposalData.short_tag),
    formatProposalLine("Popis", proposalData.description),
    formatProposalLine("Pro koho", proposalData.target_audience),
    formatProposalLine("Reálné požadavky", proposalData.real_requirements),
    formatProposalLine("Obtížnost", proposalData.difficulty),
    formatProposalLine("Časová náročnost", proposalData.time_intensity),
    formatProposalLine("Docházka", proposalData.attendance_type),
    formatProposalLine("Zkouška z domova", typeof proposalData.exam_from_home === "boolean" ? (proposalData.exam_from_home ? "ano" : "ne") : undefined),
    formatProposalLine("Kredity", proposalData.credits),
    formatProposalLine("Semestr", proposalData.semester),
    formatProposalLine("Fakulta", proposalData.faculty),
    formatProposalLine("Ročník", proposalData.year),
    formatProposalLine("Vyučující", formatProposalTeachers(proposalData.teachers)),
    formatProposalLine("Materiály", formatProposalMaterials(proposalData.materials)),
  ].filter((line): line is string => Boolean(line));

  if (lines.length === 0) {
    return [];
  }

  return [{
    label: "Co jsi odeslal(a)",
    value: lines.join("\n"),
    tone: "info" as const,
  }];
}

function formatProposalLine(label: string, value: string | number | null | undefined) {
  if (value === null || value === undefined) {
    return null;
  }

  const text = String(value).trim();
  return text ? `${label}: ${text}` : null;
}

function formatProposalTeachers(teachers: ProposalData["teachers"]) {
  if (!Array.isArray(teachers) || teachers.length === 0) {
    return null;
  }

  return teachers
    .map((teacher) => {
      const name = teacher.name?.trim();
      if (!name) return null;
      const details = [teacher.faculty, normalizeDepartmentName(teacher.department)].filter(Boolean).join(' · ')
      return details ? `${name} (${details})` : name;
    })
    .filter(Boolean)
    .join(", ");
}

function formatProposalMaterials(materials: ProposalData["materials"]) {
  if (!Array.isArray(materials) || materials.length === 0) {
    return null;
  }

  return materials
    .map((material) => material.title?.trim())
    .filter(Boolean)
    .join(", ");
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
    subjectFilter: material.subject
      ? {
          key: material.subject.slug,
          label: subjectLabel ?? material.subject.name,
        }
      : undefined,
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

function buildMaterialGroupCard(group: MaterialGroupData): ActivityCardData {
  const subjectLabel = group.subject ? `${group.subject.short_tag} · ${group.subject.name}` : "Bez předmětu";

  return {
    id: `group-${group.id}`,
    title: group.title,
    subjectFilter: group.subject
      ? {
          key: group.subject.slug,
          label: subjectLabel,
        }
      : undefined,
    badges: [],
    meta: [],
    materialGroup: group,
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
    subjectFilter: deck.subject
      ? {
          key: deck.subject.slug,
          label: `${deck.subject.short_tag} · ${deck.subject.name}`,
        }
      : undefined,
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
          <div key={index} className="rounded-[1.5rem] border border-white/5 bg-card/40 backdrop-blur-md p-5 shadow-sm">
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            <div className="mt-3 h-8 w-20 animate-pulse rounded bg-muted" />
            <div className="mt-2 h-4 w-full animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>

      {Array.from({ length: 4 }).map((_, index) => (
        <section key={index} className="space-y-4">
          <div className="h-6 w-48 animate-pulse rounded bg-muted" />
          <div className="rounded-[1.5rem] border border-white/5 bg-card/40 backdrop-blur-md p-5 shadow-sm">
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 3 }).map((__, buttonIndex) => (
                <div key={buttonIndex} className="h-12 animate-pulse rounded-xl bg-muted" />
              ))}
            </div>
            <div className="mt-4 space-y-3">
              {Array.from({ length: 3 }).map((__, itemIndex) => (
                <div key={itemIndex} className="rounded-[1.5rem] border border-white/5 bg-background/50 p-5 shadow-sm">
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
