'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Check, ChevronDown, FileText, FolderOpen, Layers3, MessageSquareText, Search, Star, SquareStack } from 'lucide-react'
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
  const filterRef = useRef<HTMLDivElement | null>(null)
  const [subjectSlug, setSubjectSlug] = useState('')
  const [activeTab, setActiveTab] = useState<'all' | 'decks' | 'materials' | 'groups' | 'subject-comments' | 'teacher-reviews'>('all')
  const [filterOpen, setFilterOpen] = useState(false)
  const [filterQuery, setFilterQuery] = useState('')
  const subjectOptions = getSubjectOptions(decks, materials, groups)
  const visibleSubjectOptions = subjectOptions.filter((subject) =>
    subject.label.toLocaleLowerCase('cs').includes(filterQuery.trim().toLocaleLowerCase('cs')),
  )
  const filteredDecks = subjectSlug ? decks.filter((deck) => deck.subject?.slug === subjectSlug) : decks
  const filteredMaterials = subjectSlug ? materials.filter((material) => material.subject?.slug === subjectSlug) : materials
  const filteredGroups = subjectSlug ? groups.filter((group) => group.subject?.slug === subjectSlug) : groups
  const activeSubjectLabel = subjectOptions.find((subject) => subject.slug === subjectSlug)?.label ?? 'Všechny předměty'
  const tabs = [
    { key: 'all', label: 'Vše', count: decks.length + materials.length + groups.length + subjectComments.length + teacherReviews.length, tone: 'default' as const, icon: Layers3 },
    { key: 'decks', label: 'Kartičky', count: decks.length, tone: 'primary' as const, icon: SquareStack },
    { key: 'materials', label: 'Materiály', count: materials.length, tone: 'community' as const, icon: FileText },
    { key: 'groups', label: 'Složky', count: groups.length, tone: 'community' as const, icon: FolderOpen },
    { key: 'subject-comments', label: 'Komentáře', count: subjectComments.length, tone: 'muted' as const, icon: MessageSquareText },
    { key: 'teacher-reviews', label: 'Hodnocení', count: teacherReviews.length, tone: 'community' as const, icon: Star },
  ]

  useEffect(() => {
    if (!filterOpen) return

    const handlePointerDown = (event: PointerEvent) => {
      if (!filterRef.current?.contains(event.target as Node)) {
        setFilterOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setFilterOpen(false)
      }
    }

    window.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [filterOpen])

  return (
    <div className="space-y-6 xl:col-span-2">
      {subjectOptions.length > 1 ? (
        <div className="flex flex-col gap-4 rounded-[24px] border border-border bg-card p-4 shadow-[0_8px_24px_rgba(17,24,39,0.06)]">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">Filtrovat podle předmětu</p>
            <p className="text-xs text-muted-foreground">Příspěvky rozdělené podle předmětů, do kterých uživatel něco přidal.</p>
          </div>
          <div ref={filterRef} className="relative w-full max-w-md">
            <button
              type="button"
              onClick={() => setFilterOpen((current) => !current)}
              className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-background px-3 py-2.5 text-left text-sm text-foreground transition-colors hover:border-primary/30 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
            >
              <span className="truncate">{activeSubjectLabel}</span>
              <ChevronDown className={`size-4 shrink-0 text-muted-foreground transition-transform ${filterOpen ? 'rotate-180' : ''}`} />
            </button>

            {filterOpen ? (
              <div className="absolute left-0 top-[calc(100%+0.6rem)] z-20 w-full rounded-2xl border border-border bg-card p-2 shadow-[0_20px_48px_rgba(17,24,39,0.16)]">
                <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2">
                  <Search className="size-4 text-muted-foreground" />
                  <input
                    value={filterQuery}
                    onChange={(event) => setFilterQuery(event.target.value)}
                    placeholder="Hledat předmět"
                    className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                  />
                </div>

                <div className="mt-2 max-h-72 overflow-y-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setSubjectSlug('')
                      setFilterQuery('')
                      setFilterOpen(false)
                    }}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-muted"
                  >
                    <span>Všechny předměty</span>
                    {!subjectSlug ? <Check className="size-4 text-primary" /> : null}
                  </button>

                  {visibleSubjectOptions.length > 0 ? (
                    visibleSubjectOptions.map((subject) => (
                      <button
                        key={subject.slug}
                        type="button"
                        onClick={() => {
                          setSubjectSlug(subject.slug)
                          setFilterQuery('')
                          setFilterOpen(false)
                        }}
                        className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-muted"
                      >
                        <span className="truncate">{subject.label}</span>
                        {subjectSlug === subject.slug ? <Check className="size-4 shrink-0 text-primary" /> : null}
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-3 text-sm text-muted-foreground">
                      Žádný předmět neodpovídá hledání.
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2 rounded-2xl border border-border bg-card p-2">
        {tabs.map((tab) => {
          const active = activeTab === tab.key
          const Icon = tab.icon
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() =>
                setActiveTab(tab.key as 'all' | 'decks' | 'materials' | 'groups' | 'subject-comments' | 'teacher-reviews')
              }
              className={`rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? 'border-border bg-muted text-foreground'
                  : 'border-transparent bg-transparent text-muted-foreground hover:border-border hover:bg-muted/60 hover:text-foreground'
              }`}
            >
              <span className="flex items-center gap-2">
                <Icon className="size-4" />
                <span>{tab.label}</span>
                <span className={getCountBadgeClass(tab.tone, active)}>{tab.count}</span>
              </span>
            </button>
          )
        })}
      </div>

      <div className="space-y-8">
        {(activeTab === 'all' || activeTab === 'decks') && (
          <ProfileContributionSection title="Veřejné balíčky kartiček" empty="Zatím žádné veřejné balíčky.">
          {filteredDecks.map((deck) => (
            <div key={deck.id} className="flex items-start justify-between gap-3 border-l-3 border-primary/70 pl-4 py-4">
              <div>
                <Link href={`/flashcardy/${deck.id}`} className="font-semibold text-foreground transition-colors hover:text-primary">
                  {deck.title}
                </Link>
                <p className="mt-1 text-sm text-muted-foreground">
                  <span className="font-semibold text-primary">{deck.card_count}</span> karet
                </p>
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
            <div key={material.id} className="flex items-start justify-between gap-3 border-l-3 border-[var(--color-student-accent)]/70 pl-4 py-4">
              <div>
                {material.url ? (
                  <a
                    href={material.url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-foreground transition-colors hover:text-primary"
                  >
                    {material.title}
                  </a>
                ) : (
                  <p className="font-semibold text-foreground">{material.title}</p>
                )}
                <p className="mt-1 text-sm text-muted-foreground">
                  <span className="font-semibold text-[var(--color-student-accent)]">{material.sizeLabel}</span>
                </p>
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
            <div key={group.id} className="border-l-3 border-[var(--color-student-accent)]/70 pl-4 py-4">
              <MaterialGroupCard group={group} showSubject surface="dashboard" />
            </div>
          ))}
          </ProfileContributionSection>
        )}

        {(activeTab === 'all' || activeTab === 'subject-comments') && (
          <ProfileContributionSection title="Komentáře k předmětům" empty="Zatím žádné schválené komentáře k předmětům.">
            {subjectComments.map((comment) => (
              <div key={comment.id} className="space-y-2 border-l-3 border-border pl-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{comment.subject?.name ?? 'Předmět'}</p>
                    {comment.subject ? (
                      <Link
                        href={`/predmety/${comment.subject.slug}`}
                        className="mt-1 block text-xs text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {comment.subject.short_tag}
                      </Link>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    {comment.is_anonymous && isOwnProfile ? (
                      <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">anon</span>
                    ) : null}
                    <span className="text-sm font-semibold text-[var(--color-student-accent)]">{comment.overall}/5</span>
                  </div>
                </div>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/80">{comment.comment}</p>
              </div>
            ))}
          </ProfileContributionSection>
        )}

        {(activeTab === 'all' || activeTab === 'teacher-reviews') && (
          <ProfileContributionSection title="Hodnocení učitelů" empty="Zatím žádná schválená hodnocení učitelů.">
            {teacherReviews.map((review) => (
              <div key={review.id} className="space-y-2 border-l-3 border-[var(--color-student-accent)]/70 pl-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{review.teacher?.name ?? 'Vyučující'}</p>
                    {review.teacher ? (
                      <Link
                        href={getTeacherPath(review.teacher.slug)}
                        className="mt-1 block text-xs text-muted-foreground transition-colors hover:text-foreground"
                      >
                        Detail vyučujícího
                      </Link>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    {review.is_anonymous && isOwnProfile ? (
                      <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">anon</span>
                    ) : null}
                    {review.rating ? <span className="text-sm font-semibold text-[var(--color-student-accent)]">{review.rating}/5</span> : null}
                  </div>
                </div>
                {review.review ? <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/80">{review.review}</p> : null}
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
    <Link href={`/predmety/${subject.slug}`} className="mt-1 block text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
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
      <h2 className="text-xl font-bold text-foreground">{title}</h2>
      {items.length > 0 ? (
        <div className="divide-y divide-border rounded-2xl bg-card px-5">{items}</div>
      ) : (
        <div className="rounded-[22px] border border-dashed border-border bg-background/50 px-4 py-8 text-center text-sm text-muted-foreground">
          {empty}
        </div>
      )}
    </section>
  )
}

function getCountBadgeClass(tone: 'default' | 'primary' | 'community' | 'muted', active: boolean) {
  if (active) {
    if (tone === 'primary') return 'inline-flex min-w-6 items-center justify-center rounded-md bg-primary/12 px-2 py-0.5 text-xs font-semibold text-primary'
    if (tone === 'community') return 'inline-flex min-w-6 items-center justify-center rounded-md bg-[var(--color-student-accent)]/12 px-2 py-0.5 text-xs font-semibold text-[var(--color-student-accent)]'
    return 'inline-flex min-w-6 items-center justify-center rounded-md bg-background px-2 py-0.5 text-xs font-semibold text-foreground'
  }

  if (tone === 'primary') return 'inline-flex min-w-6 items-center justify-center rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary'
  if (tone === 'community') return 'inline-flex min-w-6 items-center justify-center rounded-md bg-[var(--color-student-accent)]/10 px-2 py-0.5 text-xs font-semibold text-[var(--color-student-accent)]'
  if (tone === 'muted') return 'inline-flex min-w-6 items-center justify-center rounded-md bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground'
  return 'inline-flex min-w-6 items-center justify-center rounded-md bg-muted px-2 py-0.5 text-xs font-semibold text-foreground'
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
