'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ShareLinkButton } from '@/components/share/share-link-button'
import { MaterialGroupCard, type MaterialGroupData } from '@/components/subject/material-group-card'
import { getSharePath } from '@/lib/share-links'
import { getTeacherPath } from '@/lib/teacher-slug'

type SubjectRef = {
  slug: string
  short_tag: string
  name: string
} | null

export type ProfileDeckContribution = {
  id: string
  title: string
  share_slug: string
  card_count: number
  subject: SubjectRef
}

export type ProfileMaterialContribution = {
  id: string
  title: string
  share_slug: string
  url: string | null
  sizeLabel: string
  subject: SubjectRef
}

export type ProfileMaterialGroupContribution = MaterialGroupData

type Props = {
  decks: ProfileDeckContribution[]
  materials: ProfileMaterialContribution[]
  groups?: ProfileMaterialGroupContribution[]
  subjectComments?: Array<{
    id: string
    overall: number
    comment: string
    is_anonymous: boolean
    subject: SubjectRef
  }>
  teacherReviews?: Array<{
    id: string
    rating: number | null
    review: string
    is_anonymous: boolean
    teacher: { slug: string; name: string } | null
  }>
  isOwnProfile?: boolean
}

export function ProfileSubjectContributions({
  decks,
  materials,
  groups = [],
  subjectComments = [],
  teacherReviews = [],
  isOwnProfile = false,
}: Props) {
  const [subjectSlug, setSubjectSlug] = useState('')
  const [activeTab, setActiveTab] = useState<'all' | 'decks' | 'materials' | 'groups' | 'subject-comments' | 'teacher-reviews'>('all')
  const subjectOptions = getSubjectOptions(decks, materials, groups)
  const filteredDecks = subjectSlug ? decks.filter((deck) => deck.subject?.slug === subjectSlug) : decks
  const filteredMaterials = subjectSlug ? materials.filter((material) => material.subject?.slug === subjectSlug) : materials
  const filteredGroups = subjectSlug ? groups.filter((group) => group.subject?.slug === subjectSlug) : groups

  return (
    <div className="space-y-5 xl:col-span-2">
      {subjectOptions.length > 1 ? (
        <div className="flex flex-col gap-3 rounded-[24px] border border-border bg-card p-4 shadow-[0_8px_24px_rgba(17,24,39,0.06)] dark:border-[#22344D] dark:bg-[linear-gradient(180deg,#0D1B2E,#07111F)] dark:shadow-none sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground dark:text-[#F4F8FB]">Filtrovat podle předmětu</p>
            <p className="text-xs text-muted-foreground dark:text-[#8FA3B8]">Příspěvky rozdělené podle předmětů, do kterých uživatel něco přidal.</p>
          </div>
          <select
            value={subjectSlug}
            onChange={(event) => setSubjectSlug(event.target.value)}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary/50 focus:ring-1 focus:ring-primary/30 dark:border-[#22344D] dark:bg-[#13243A] dark:text-[#F4F8FB] dark:focus:border-[#35D7E8]/50 dark:focus:ring-[#35D7E8]/30 sm:w-72"
          >
            <option value="">Všechny předměty</option>
            {subjectOptions.map((subject) => (
              <option key={subject.slug} value={subject.slug}>
                {subject.label}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2 rounded-2xl border border-border bg-card p-2 dark:border-[#22344D] dark:bg-[#0D1B2E]">
        {[
          { key: 'all', label: `Vše (${decks.length + materials.length + groups.length + subjectComments.length + teacherReviews.length})` },
          { key: 'decks', label: `Kartičky (${decks.length})` },
          { key: 'materials', label: `Materiály (${materials.length})` },
          { key: 'groups', label: `Složky (${groups.length})` },
          { key: 'subject-comments', label: `Komentáře (${subjectComments.length})` },
          { key: 'teacher-reviews', label: `Hodnocení (${teacherReviews.length})` },
        ].map((tab) => {
          const active = activeTab === tab.key
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() =>
                setActiveTab(tab.key as 'all' | 'decks' | 'materials' | 'groups' | 'subject-comments' | 'teacher-reviews')
              }
              className={`rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? 'border-border bg-muted text-foreground dark:border-[#22344D] dark:bg-[#13243A] dark:text-[#F4F8FB]'
                  : 'border-transparent bg-transparent text-muted-foreground hover:border-border hover:bg-muted/60 hover:text-foreground dark:text-[#8FA3B8] dark:hover:border-[#22344D] dark:hover:bg-white/[0.03] dark:hover:text-[#F4F8FB]'
              }`}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      <div className="space-y-8">
        {(activeTab === 'all' || activeTab === 'decks') && (
          <ProfileContributionSection title="Veřejné balíčky kartiček" empty="Zatím žádné veřejné balíčky.">
          {filteredDecks.map((deck) => (
            <div key={deck.id} className="flex items-start justify-between gap-3 px-1 py-3">
              <div>
                <Link href={`/flashcardy/${deck.id}`} className="font-semibold text-foreground transition-colors hover:text-primary dark:text-[#F4F8FB] dark:hover:text-[#35D7E8]">
                  {deck.title}
                </Link>
                <p className="mt-1 text-sm text-muted-foreground dark:text-[#8FA3B8]">{deck.card_count} karet</p>
                {deck.subject && <SubjectLink subject={deck.subject} />}
              </div>
              <ShareLinkButton
                path={getSharePath('deck', deck.share_slug)}
                className="px-2 py-1 text-[11px] sm:text-xs"
              />
            </div>
          ))}
          </ProfileContributionSection>
        )}

        {(activeTab === 'all' || activeTab === 'materials') && (
          <ProfileContributionSection title="Samostatné materiály" empty="Zatím žádné samostatné materiály.">
          {filteredMaterials.map((material) => (
            <div key={material.id} className="flex items-start justify-between gap-3 px-1 py-3">
              <div>
                {material.url ? (
                  <a
                    href={material.url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-foreground transition-colors hover:text-primary dark:text-[#F4F8FB] dark:hover:text-[#35D7E8]"
                  >
                    {material.title}
                  </a>
                ) : (
                  <p className="font-semibold text-foreground dark:text-[#F4F8FB]">{material.title}</p>
                )}
                <p className="mt-1 text-sm text-muted-foreground dark:text-[#8FA3B8]">{material.sizeLabel}</p>
                {material.subject && <SubjectLink subject={material.subject} />}
              </div>
              <ShareLinkButton
                path={getSharePath('material', material.share_slug)}
                className="px-2 py-1 text-[11px] sm:text-xs"
              />
            </div>
          ))}
          </ProfileContributionSection>
        )}

        {(activeTab === 'all' || activeTab === 'groups') && (
          <ProfileContributionSection title="Složky materiálů" empty="Zatím žádné veřejné složky materiálů.">
          {filteredGroups.map((group) => (
            <MaterialGroupCard key={group.id} group={group} showSubject surface="dashboard" />
          ))}
          </ProfileContributionSection>
        )}

        {(activeTab === 'all' || activeTab === 'subject-comments') && (
          <ProfileContributionSection title="Komentáře k předmětům" empty="Zatím žádné schválené komentáře k předmětům.">
            {subjectComments.map((comment) => (
              <div key={comment.id} className="space-y-2 px-1 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground dark:text-[#F4F8FB]">{comment.subject?.name ?? 'Předmět'}</p>
                    {comment.subject ? (
                      <Link
                        href={`/predmety/${comment.subject.slug}`}
                        className="mt-1 block text-xs text-muted-foreground transition-colors hover:text-foreground dark:text-[#8FA3B8] dark:hover:text-[#F4F8FB]"
                      >
                        {comment.subject.short_tag}
                      </Link>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    {comment.is_anonymous && isOwnProfile ? (
                      <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground dark:bg-[#13243A] dark:text-[#8FA3B8]">anon</span>
                    ) : null}
                    <span className="text-sm font-semibold text-[#F6B73C]">{comment.overall}/5</span>
                  </div>
                </div>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/80 dark:text-[#CBD7E6]">{comment.comment}</p>
              </div>
            ))}
          </ProfileContributionSection>
        )}

        {(activeTab === 'all' || activeTab === 'teacher-reviews') && (
          <ProfileContributionSection title="Hodnocení učitelů" empty="Zatím žádná schválená hodnocení učitelů.">
            {teacherReviews.map((review) => (
              <div key={review.id} className="space-y-2 px-1 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground dark:text-[#F4F8FB]">{review.teacher?.name ?? 'Vyučující'}</p>
                    {review.teacher ? (
                      <Link
                        href={getTeacherPath(review.teacher.slug)}
                        className="mt-1 block text-xs text-muted-foreground transition-colors hover:text-foreground dark:text-[#8FA3B8] dark:hover:text-[#F4F8FB]"
                      >
                        Detail vyučujícího
                      </Link>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    {review.is_anonymous && isOwnProfile ? (
                      <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground dark:bg-[#13243A] dark:text-[#8FA3B8]">anon</span>
                    ) : null}
                    {review.rating ? <span className="text-sm font-semibold text-[#F6B73C]">{review.rating}/5</span> : null}
                  </div>
                </div>
                {review.review ? <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/80 dark:text-[#CBD7E6]">{review.review}</p> : null}
              </div>
            ))}
          </ProfileContributionSection>
        )}
      </div>
    </div>
  )
}

function SubjectLink({ subject }: { subject: NonNullable<SubjectRef> }) {
  return (
    <Link href={`/predmety/${subject.slug}`} className="mt-1 block text-xs text-muted-foreground transition-colors hover:text-foreground dark:text-[#8FA3B8] dark:hover:text-[#F4F8FB]">
      {subject.short_tag} · {subject.name}
    </Link>
  )
}

function ProfileContributionSection({
  title,
  empty,
  children,
}: {
  title: string
  empty: string
  children: React.ReactNode[]
}) {
  const items = children.filter(Boolean)

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold text-foreground dark:text-[#F4F8FB]">{title}</h2>
      {items.length > 0 ? (
        <div className="divide-y divide-border rounded-2xl bg-card px-4 dark:divide-[#22344D] dark:bg-[#0D1B2E]">{items}</div>
      ) : (
        <div className="rounded-[22px] border border-dashed border-border bg-background/50 px-4 py-8 text-center text-sm text-muted-foreground dark:border-[#22344D] dark:bg-white/[0.02] dark:text-[#8FA3B8]">
          {empty}
        </div>
      )}
    </section>
  )
}

function getSubjectOptions(
  decks: ProfileDeckContribution[],
  materials: ProfileMaterialContribution[],
  groups: ProfileMaterialGroupContribution[],
) {
  const subjects = new Map<string, string>()

  for (const item of [...decks, ...materials, ...groups]) {
    if (item.subject) {
      subjects.set(item.subject.slug, `${item.subject.short_tag} · ${item.subject.name}`)
    }
  }

  return Array.from(subjects, ([slug, label]) => ({ slug, label })).sort((left, right) =>
    left.label.localeCompare(right.label, 'cs'),
  )
}
