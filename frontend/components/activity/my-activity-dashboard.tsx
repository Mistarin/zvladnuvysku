'use client'

import { type Dispatch, type ReactNode, type SetStateAction, useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { AlertCircle, BookOpen, CheckCircle2, ChevronDown, ChevronUp, Clock3, Loader2, UserCircle2 } from 'lucide-react'
import { markActivityItemRead, markActivityItemUnread } from '@/app/actions/activity'
import { deletePendingSubjectProposal } from '@/app/actions/contributions'
import { MaterialGroupCard, type MaterialGroupData } from '@/components/subject/material-group-card'
import { Button } from '@/components/ui/button'
import type { PublicProfileIdentityDraft } from '@/lib/public-profile-identity'
import { cn } from '@/lib/utils'

export type StatusTone = 'success' | 'warning' | 'danger' | 'muted' | 'info'

export type ActivityBadge = {
  label: string
  tone: StatusTone
}

export type ActivityLink = {
  href: string
  label: string
  external?: boolean
}

export type ActivityMeta = {
  label: string
  value: string
}

export type ActivityPanel = {
  label: string
  value: string
  tone: 'default' | 'danger' | 'info'
}

export type ActivityAttention = {
  itemType: 'subject_proposal' | 'subject_material' | 'feedback'
  itemId: string
  stateToken: string
  acknowledged: boolean
}

export type ActivityAction =
  | {
      type: 'link'
      href: string
      label: string
    }
  | {
      type: 'deletePendingProposal'
      proposalId: string
      label: string
    }

export type ActivityCardData = {
  id: string
  title: string
  materialGroup?: MaterialGroupData
  subtitle?: string
  supportingText?: string
  subjectFilter?: {
    key: string
    label: string
  }
  link?: ActivityLink
  badges: ActivityBadge[]
  meta: ActivityMeta[]
  body?: string
  panels?: ActivityPanel[]
  actions?: ActivityAction[]
  attention?: ActivityAttention
}

export type ActivityTabData = {
  id: string
  label: string
  description: string
  empty: string
  tone: StatusTone
  items: ActivityCardData[]
}

export type ActivitySectionData = {
  id: 'proposals' | 'materials' | 'feedback' | 'decks' | 'groups'
  title: string
  description: string
  actionHref?: string
  actionLabel?: string
  tabs: ActivityTabData[]
}

type MyActivityDashboardProps = {
  publicIdentity: PublicProfileIdentityDraft
  sections: ActivitySectionData[]
}

type SummaryCardData = {
  id: string
  label: string
  value: string
  meta: ReactNode
  tone: Exclude<StatusTone, 'info'>
  icon: ReactNode
}

export function MyActivityDashboard({ publicIdentity, sections: initialSections }: MyActivityDashboardProps) {
  const [sections, setSections] = useState(initialSections)
  const [expandedTabs, setExpandedTabs] = useState<Record<string, boolean>>({})
  const [activeSectionId, setActiveSectionId] = useState<ActivitySectionData['id']>(() => initialSections[0]?.id ?? 'proposals')
  const [activeTabs, setActiveTabs] = useState<Record<string, string>>(() =>
    Object.fromEntries(initialSections.map((section) => [section.id, getInitialTabId(section)])),
  )
  const [subjectFilters, setSubjectFilters] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [pendingKey, setPendingKey] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const summaryCards = useMemo(() => buildSummaryCards(publicIdentity, sections), [publicIdentity, sections])
  const activeSection = sections.find((section) => section.id === activeSectionId) ?? sections[0] ?? null

  const handleAttentionToggle = (attention: ActivityAttention) => {
    const itemKey = getAttentionKey(attention)
    const nextAcknowledged = !attention.acknowledged

    setError(null)
    setPendingKey(itemKey)
    setSections((currentSections) => patchAcknowledgedState(currentSections, attention, nextAcknowledged))

    startTransition(async () => {
      const action = nextAcknowledged ? markActivityItemRead : markActivityItemUnread
      const result = await action({
        itemType: attention.itemType,
        itemId: attention.itemId,
        stateToken: attention.stateToken,
      })

      if (!result.success) {
        setSections((currentSections) => patchAcknowledgedState(currentSections, attention, attention.acknowledged))
        setError(result.error)
      }

      setPendingKey((currentKey) => (currentKey === itemKey ? null : currentKey))
    })
  }

  const handleDeletePendingProposal = (proposalId: string) => {
    if (!window.confirm('Opravdu chceš smazat tento čekající návrh?')) {
      return
    }

    const itemKey = `delete-subject-proposal:${proposalId}`
    const previousSections = sections
    setError(null)
    setPendingKey(itemKey)
    setSections((currentSections) => removeActivityCard(currentSections, `proposal-${proposalId}`))

    startTransition(async () => {
      const result = await deletePendingSubjectProposal(proposalId)

      if (!result.success) {
        setSections(previousSections)
        setError(result.error)
      }

      setPendingKey((currentKey) => (currentKey === itemKey ? null : currentKey))
    })
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {summaryCards.map((card) => (
          <SummaryCard key={card.id} card={card} />
        ))}
      </div>

      {error ? (
        <div className="rounded-2xl border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {activeSection ? (
        <section className="space-y-4">
          <div className="overflow-x-auto pb-1">
            <div className="inline-flex min-w-full gap-2 rounded-2xl border border-border bg-card p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] dark:border-[#22344D] dark:bg-[#0D1B2E] sm:min-w-0">
              {sections.map((section) => {
                const isActive = section.id === activeSection.id
                return (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => setActiveSectionId(section.id)}
                    className={cn(
                      'flex min-w-[10rem] flex-1 items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-colors',
                      isActive
                        ? 'border-border bg-muted text-foreground dark:border-[#22344D] dark:bg-[#13243A] dark:text-[#F4F8FB]'
                        : 'border-transparent bg-transparent text-muted-foreground hover:border-border hover:bg-muted/60 hover:text-foreground dark:text-[#8FA3B8] dark:hover:border-[#22344D] dark:hover:bg-white/[0.03] dark:hover:text-[#F4F8FB]',
                    )}
                  >
                    <span className="truncate text-sm font-semibold">{section.title}</span>
                    <span
                      className={cn(
                        'rounded-md border px-2 py-0.5 text-xs font-semibold',
                        isActive
                          ? 'border-border bg-background text-foreground dark:border-[#22344D] dark:bg-white/[0.06] dark:text-[#F4F8FB]'
                          : 'border-border bg-card text-muted-foreground dark:border-[#22344D] dark:bg-[#13243A] dark:text-[#CBD7E6]',
                      )}
                    >
                      {getSectionItemCount(section)}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {renderSectionContent({
            section: activeSection,
            activeTabs,
            subjectFilters,
            expandedTabs,
            isPending,
            pendingKey,
            setActiveTabs,
            setSubjectFilters,
            setExpandedTabs,
            handleAttentionToggle,
            handleDeletePendingProposal,
          })}
        </section>
      ) : null}
    </div>
  )
}

type RenderSectionContentArgs = {
  section: ActivitySectionData
  activeTabs: Record<string, string>
  subjectFilters: Record<string, string>
  expandedTabs: Record<string, boolean>
  isPending: boolean
  pendingKey: string | null
  setActiveTabs: Dispatch<SetStateAction<Record<string, string>>>
  setSubjectFilters: Dispatch<SetStateAction<Record<string, string>>>
  setExpandedTabs: Dispatch<SetStateAction<Record<string, boolean>>>
  handleAttentionToggle: (attention: ActivityAttention) => void
  handleDeletePendingProposal: (proposalId: string) => void
}

function renderSectionContent({
  section,
  activeTabs,
  subjectFilters,
  expandedTabs,
  isPending,
  pendingKey,
  setActiveTabs,
  setSubjectFilters,
  setExpandedTabs,
  handleAttentionToggle,
  handleDeletePendingProposal,
}: RenderSectionContentArgs) {
  const activeTabId = activeTabs[section.id] ?? section.tabs[0]?.id ?? ''
  const activeTab = section.tabs.find((tab) => tab.id === activeTabId) ?? section.tabs[0]

  if (!activeTab) {
    return null
  }

  const subjectOptions = getSectionSubjectOptions(section)
  const selectedSubject = subjectFilters[section.id] ?? ''
  const filteredActiveItems = selectedSubject
    ? activeTab.items.filter((item) => item.subjectFilter?.key === selectedSubject)
    : activeTab.items
  const visibleItems = filteredActiveItems.slice(0, 3)
  const olderItems = filteredActiveItems.slice(3)
  const expandKey = `${section.id}:${activeTab.id}`
  const isExpanded = expandedTabs[expandKey] ?? false

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground dark:text-[#F4F8FB]">{section.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground dark:text-[#8FA3B8]">{section.description}</p>
        </div>
        {section.actionHref && section.actionLabel ? (
          <Link href={section.actionHref} className="text-sm font-medium text-[#02BED6] transition-colors hover:text-[#35D7E8]">
            {section.actionLabel}
          </Link>
        ) : null}
      </div>

      <div className="rounded-[28px] border border-border bg-card p-5 shadow-[0_8px_24px_rgba(17,24,39,0.06)] dark:border-[#22344D] dark:bg-[linear-gradient(180deg,#0D1B2E,#07111F)] dark:shadow-[0_18px_60px_rgba(0,0,0,0.28)] sm:p-6">
        <div
          className="grid gap-2 rounded-2xl border border-border bg-background p-2 dark:border-[#22344D] dark:bg-[#0D1B2E]"
          style={{ gridTemplateColumns: `repeat(${section.tabs.length}, minmax(0, 1fr))` }}
        >
          {section.tabs.map((tab) => {
            const isActive = activeTab.id === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTabs((current) => ({ ...current, [section.id]: tab.id }))}
                className={cn(
                  'rounded-xl border px-4 py-3 text-left transition-colors',
                  isActive
                    ? 'border-border bg-muted text-foreground dark:border-[#22344D] dark:bg-[#13243A] dark:text-[#F4F8FB]'
                    : 'border-transparent bg-transparent text-muted-foreground hover:border-border hover:bg-muted/60 hover:text-foreground dark:text-[#8FA3B8] dark:hover:border-[#22344D] dark:hover:bg-white/[0.03] dark:hover:text-[#F4F8FB]',
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate text-sm font-semibold">{tab.label}</span>
                  <span
                    className={cn(
                      'rounded-md border px-2.5 py-0.5 text-xs font-bold',
                      isActive
                        ? getToneCounterClass(tab.tone)
                        : 'border-border bg-card text-muted-foreground dark:border-[#22344D] dark:bg-[#13243A] dark:text-[#CBD7E6]',
                    )}
                  >
                    {tab.items.length}
                  </span>
                </div>
              </button>
            )
          })}
        </div>

        <div className="mt-5 border-t border-border pt-5 dark:border-[#22344D]">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground dark:text-[#8FA3B8]">{activeTab.description}</p>
            {subjectOptions.length > 1 ? (
              <select
                value={selectedSubject}
                onChange={(event) =>
                  setSubjectFilters((current) => ({
                    ...current,
                    [section.id]: event.target.value,
                  }))
                }
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary/50 focus:ring-1 focus:ring-primary/30 dark:border-[#22344D] dark:bg-[#13243A] dark:text-[#F4F8FB] dark:focus:border-[#35D7E8]/50 dark:focus:ring-[#35D7E8]/30 sm:w-64"
              >
                <option value="">Všechny předměty</option>
                {subjectOptions.map((subject) => (
                  <option key={subject.key} value={subject.key}>
                    {subject.label}
                  </option>
                ))}
              </select>
            ) : null}
          </div>

          {visibleItems.length > 0 ? (
            <div className="space-y-3">
              {visibleItems.map((item) => (
                <ActivityCard
                  key={item.id}
                  item={item}
                  pendingKey={isPending ? pendingKey : null}
                  onAttentionToggle={handleAttentionToggle}
                  onDeletePendingProposal={handleDeletePendingProposal}
                />
              ))}

              {olderItems.length > 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-background/50 p-3 dark:border-[#22344D] dark:bg-white/[0.02]">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedTabs((current) => ({
                        ...current,
                        [expandKey]: !isExpanded,
                      }))
                    }
                    className="flex w-full items-center justify-between gap-3 text-left text-sm font-medium text-foreground dark:text-[#F4F8FB]"
                  >
                    <span>{isExpanded ? 'Skrýt starší položky' : `Zobrazit starší položky (${olderItems.length})`}</span>
                    {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                  </button>

                  {isExpanded ? (
                    <div className="mt-3 space-y-3">
                      {olderItems.map((item) => (
                        <ActivityCard
                          key={item.id}
                          item={item}
                          pendingKey={isPending ? pendingKey : null}
                          onAttentionToggle={handleAttentionToggle}
                          onDeletePendingProposal={handleDeletePendingProposal}
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-background/50 px-4 py-8 text-center text-sm text-muted-foreground dark:border-[#22344D] dark:bg-white/[0.02] dark:text-[#8FA3B8]">
              {selectedSubject ? 'Pro vybraný předmět tu nic není.' : activeTab.empty}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function getSectionSubjectOptions(section: ActivitySectionData) {
  const subjects = new Map<string, string>()

  for (const tab of section.tabs) {
    for (const item of tab.items) {
      if (item.subjectFilter) {
        subjects.set(item.subjectFilter.key, item.subjectFilter.label)
      }
    }
  }

  return Array.from(subjects, ([key, label]) => ({ key, label })).sort((left, right) =>
    left.label.localeCompare(right.label, 'cs'),
  )
}

function getSectionItemCount(section: ActivitySectionData) {
  return section.tabs.reduce((total, tab) => total + tab.items.length, 0)
}

function SummaryCard({ card }: { card: SummaryCardData }) {
  return (
    <div className="rounded-[24px] border border-border bg-card p-5 shadow-[0_8px_24px_rgba(17,24,39,0.06)] dark:border-[#22344D] dark:bg-[rgba(13,27,46,0.94)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
      <div className="flex items-center gap-3 text-sm font-medium text-muted-foreground dark:text-[#8FA3B8]">
        <span className={cn('inline-flex h-10 w-10 items-center justify-center rounded-xl border', getToneSurfaceClass(card.tone))}>
          {card.icon}
        </span>
        <span>{card.label}</span>
      </div>
      <p className="mt-4 text-3xl font-bold text-foreground dark:text-[#F4F8FB]">{card.value}</p>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground dark:text-[#8FA3B8]">{card.meta}</p>
    </div>
  )
}

function ActivityCard({
  item,
  pendingKey,
  onAttentionToggle,
  onDeletePendingProposal,
}: {
  item: ActivityCardData
  pendingKey: string | null
  onAttentionToggle: (attention: ActivityAttention) => void
  onDeletePendingProposal: (proposalId: string) => void
}) {
  const attentionPending = Boolean(item.attention && pendingKey === getAttentionKey(item.attention))

  if (item.materialGroup) {
    return (
      <MaterialGroupCard
        group={item.materialGroup}
        showSubject
        isOwner
        compact
        defaultExpanded={false}
        surface="dashboard"
      />
    )
  }

  return (
    <div
      className={cn(
        'rounded-[24px] border border-border bg-card p-5 shadow-[0_8px_24px_rgba(17,24,39,0.06)] dark:border-[#22344D] dark:bg-[rgba(13,27,46,0.94)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]',
        item.attention?.acknowledged ? 'opacity-75' : null,
      )}
    >
      <div className="flex flex-col gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-foreground dark:text-[#F4F8FB]">{item.title}</p>
            {item.badges.map((badge) => (
              <StatusBadge key={`${item.id}-${badge.label}`} tone={badge.tone}>
                {badge.label}
              </StatusBadge>
            ))}
          </div>

          {item.subtitle ? <p className="mt-1 text-sm text-muted-foreground dark:text-[#8FA3B8]">{item.subtitle}</p> : null}
          {item.supportingText ? <p className="mt-1 text-sm text-muted-foreground dark:text-[#8FA3B8]">{item.supportingText}</p> : null}
          {item.link ? (
            item.link.external ? (
              <a
                href={item.link.href}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center gap-2 text-sm text-primary transition-colors hover:text-primary/80 dark:text-[#02BED6] dark:hover:text-[#35D7E8]"
              >
                {item.link.label}
              </a>
            ) : (
              <Link href={item.link.href} className="mt-2 inline-flex items-center gap-2 text-sm text-primary transition-colors hover:text-primary/80 dark:text-[#02BED6] dark:hover:text-[#35D7E8]">
                {item.link.label}
              </Link>
            )
          ) : null}
        </div>

        {item.body ? <p className="whitespace-pre-wrap text-sm text-foreground/80 dark:text-[#CBD7E6]">{item.body}</p> : null}

        {item.meta.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {item.meta.map((meta) => (
              <div key={`${item.id}-${meta.label}`} className="rounded-xl border border-border bg-background px-3 py-2 dark:border-[#22344D] dark:bg-[#13243A]">
                <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground dark:text-[#8FA3B8]">{meta.label}</p>
                <p className="mt-1 text-sm text-foreground/80 dark:text-[#CBD7E6]">{meta.value}</p>
              </div>
            ))}
          </div>
        ) : null}

        {item.panels?.length ? (
          <div className="space-y-3">
            {item.panels.map((panel) => (
              <div
                key={`${item.id}-${panel.label}`}
                className={cn(
                  'rounded-xl border px-3 py-2',
                  panel.tone === 'danger'
                    ? 'border-destructive/25 bg-destructive/10'
                  : panel.tone === 'info'
                      ? 'border-primary/20 bg-primary/10'
                      : 'border-border bg-background dark:border-[#22344D] dark:bg-[#13243A]',
                )}
              >
                <p
                  className={cn(
                    'text-xs font-medium',
                    panel.tone === 'danger'
                      ? 'text-destructive'
                      : panel.tone === 'info'
                        ? 'text-primary'
                        : 'text-muted-foreground dark:text-[#8FA3B8]',
                  )}
                >
                  {panel.label}
                </p>
                <p
                  className={cn(
                    'mt-1 whitespace-pre-wrap text-sm',
                    panel.tone === 'danger'
                      ? 'text-destructive'
                      : panel.tone === 'info'
                        ? 'text-foreground'
                        : 'text-foreground/80 dark:text-[#CBD7E6]',
                  )}
                >
                  {panel.value}
                </p>
              </div>
            ))}
          </div>
        ) : null}

        {item.actions?.length ? (
          <div className="flex flex-wrap items-center justify-end gap-2">
            {item.actions.map((action) => {
              if (action.type === 'link') {
                return (
                  <Link
                    key={`${item.id}-${action.href}`}
                    href={action.href}
                    className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-background px-3 text-[0.8rem] font-medium text-foreground transition-colors hover:bg-muted dark:border-[#22344D] dark:bg-[#13243A] dark:text-[#F4F8FB] dark:hover:bg-[#22344D]"
                  >
                    {action.label}
                  </Link>
                )
              }

              const deletePending = pendingKey === `delete-subject-proposal:${action.proposalId}`
              return (
                <Button
                  key={`${item.id}-${action.proposalId}`}
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={deletePending}
                  onClick={() => onDeletePendingProposal(action.proposalId)}
                  className="border-destructive/30 bg-transparent text-destructive hover:bg-destructive/10"
                >
                  {deletePending ? <Loader2 className="size-4 animate-spin" /> : null}
                  {action.label}
                </Button>
              )
            })}
          </div>
        ) : null}

        {item.attention ? (
          <div className="flex items-center justify-end">
            <Button
              type="button"
              variant={item.attention.acknowledged ? 'ghost' : 'outline'}
              size="sm"
              disabled={attentionPending}
              onClick={() => onAttentionToggle(item.attention!)}
            >
              {attentionPending ? <Loader2 className="size-4 animate-spin" /> : null}
              {item.attention.acknowledged ? 'Vrátit do pozornosti' : 'Označit jako přečtené'}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function StatusBadge({ tone, children }: { tone: StatusTone; children: ReactNode }) {
  return <span className={cn('inline-flex rounded-md border px-2.5 py-1 text-xs font-semibold', getToneSurfaceClass(tone))}>{children}</span>
}

function buildSummaryCards(publicIdentity: PublicProfileIdentityDraft, sections: ActivitySectionData[]): SummaryCardData[] {
  const proposals = sections.find((section) => section.id === 'proposals')
  const materials = sections.find((section) => section.id === 'materials')
  const decks = sections.find((section) => section.id === 'decks')
  const groups = sections.find((section) => section.id === 'groups')

  const pendingProposals = getTabItemCount(proposals, 'pending')
  const approvedProposals = getTabItemCount(proposals, 'approved')
  const pendingMaterials = getTabItemCount(materials, 'pending')
  const approvedMaterials = getTabItemCount(materials, 'approved')
  const publicDecks = getTabItemCount(decks, 'public')
  const privateDecks = getTabItemCount(decks, 'private')
  const materialGroups = getTabItemCount(groups, 'all')

  const attentionItems = sections.flatMap((section) =>
    section.tabs.flatMap((tab) => tab.items.filter((item) => item.attention && !item.attention.acknowledged)),
  )
  const attentionContributions = attentionItems.filter((item) => item.attention?.itemType !== 'feedback').length
  const attentionFeedback = attentionItems.filter((item) => item.attention?.itemType === 'feedback').length
  const hasIdentity = Boolean(publicIdentity.displayName.trim() && publicIdentity.faculty)

  return [
    {
      id: 'public-profile',
      label: 'Veřejný profil',
      value: hasIdentity ? publicIdentity.displayName : 'Chybí',
      meta: hasIdentity
        ? (
            <>
              {publicIdentity.faculties.join(' · ')} · Zobrazuje se u profilu, recenzí a v Hall of Fame.{' '}
              <Link href="/#hall-of-fame" className="text-primary hover:underline">
                Upravit
              </Link>
            </>
          )
        : (
            <>
              Doplň jméno i fakultu.{' '}
              <Link href="/#hall-of-fame" className="text-primary hover:underline">
                Nastavit profil
              </Link>
            </>
          ),
      tone: 'muted',
      icon: <UserCircle2 className="h-4 w-4" />,
    },
    {
      id: 'decks',
      label: 'Balíčky',
      value: String(publicDecks + privateDecks),
      meta: `${publicDecks} veřejné · ${privateDecks} soukromé · ${materialGroups} skupin`,
      tone: 'muted',
      icon: <BookOpen className="h-4 w-4" />,
    },
    {
      id: 'pending',
      label: 'Čeká na schválení',
      value: String(pendingProposals + pendingMaterials),
      meta: `${pendingProposals} návrhy · ${pendingMaterials} materiály`,
      tone: 'warning',
      icon: <Clock3 className="h-4 w-4" />,
    },
    {
      id: 'approved',
      label: 'Schváleno celkem',
      value: String(approvedProposals + approvedMaterials),
      meta: `${approvedProposals} návrhy předmětů · ${approvedMaterials} materiály`,
      tone: 'success',
      icon: <CheckCircle2 className="h-4 w-4" />,
    },
    {
      id: 'attention',
      label: 'Potřebuje pozornost',
      value: String(attentionContributions + attentionFeedback),
      meta: `${attentionContributions} příspěvky · ${attentionFeedback} feedback`,
      tone: attentionContributions + attentionFeedback > 0 ? 'danger' : 'muted',
      icon: <AlertCircle className="h-4 w-4" />,
    },
  ]
}

function patchAcknowledgedState(
  sections: ActivitySectionData[],
  attention: ActivityAttention,
  acknowledged: boolean,
) {
  return sections.map((section) => ({
    ...section,
    tabs: section.tabs.map((tab) => ({
      ...tab,
      items: tab.items.map((item) => {
        if (!item.attention) {
          return item
        }

        return item.attention.itemType === attention.itemType &&
          item.attention.itemId === attention.itemId &&
          item.attention.stateToken === attention.stateToken
          ? { ...item, attention: { ...item.attention, acknowledged } }
          : item
      }),
    })),
  }))
}

function removeActivityCard(sections: ActivitySectionData[], cardId: string) {
  return sections.map((section) => ({
    ...section,
    tabs: section.tabs.map((tab) => ({
      ...tab,
      items: tab.items.filter((item) => item.id !== cardId),
    })),
  }))
}

function getTabItemCount(section: ActivitySectionData | undefined, tabId: string) {
  return section?.tabs.find((tab) => tab.id === tabId)?.items.length ?? 0
}

function getInitialTabId(section: ActivitySectionData) {
  return section.tabs.find((tab) => tab.items.length > 0)?.id ?? section.tabs[0]?.id ?? ''
}

function getAttentionKey(attention: ActivityAttention) {
  return `${attention.itemType}:${attention.itemId}:${attention.stateToken}`
}

function getToneSurfaceClass(tone: StatusTone) {
  switch (tone) {
    case 'success':
      return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
    case 'warning':
      return 'border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300'
    case 'danger':
      return 'border-destructive/30 bg-destructive/10 text-destructive'
    case 'info':
      return 'border-primary/20 bg-primary/10 text-primary'
    default:
      return 'border-border bg-background text-foreground/80 dark:border-[#22344D] dark:bg-[#13243A] dark:text-[#CBD7E6]'
  }
}

function getToneCounterClass(tone: StatusTone) {
  switch (tone) {
    case 'success':
      return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
    case 'warning':
      return 'border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300'
    case 'danger':
      return 'border-destructive/30 bg-destructive/10 text-destructive'
    case 'info':
      return 'border-primary/20 bg-primary/10 text-primary'
    default:
      return 'border-border bg-background text-foreground dark:border-[#22344D] dark:bg-[#13243A] dark:text-[#F4F8FB]'
  }
}
