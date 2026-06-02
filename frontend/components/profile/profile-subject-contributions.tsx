'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ShareLinkButton } from '@/components/share/share-link-button'
import { MaterialGroupCard, type MaterialGroupData } from '@/components/subject/material-group-card'
import { getSharePath } from '@/lib/share-links'

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
}

export function ProfileSubjectContributions({ decks, materials, groups = [] }: Props) {
  const [subjectSlug, setSubjectSlug] = useState('')
  const [activeTab, setActiveTab] = useState<'all' | 'decks' | 'materials' | 'groups'>('all')
  const subjectOptions = getSubjectOptions(decks, materials, groups)
  const filteredDecks = subjectSlug ? decks.filter((deck) => deck.subject?.slug === subjectSlug) : decks
  const filteredMaterials = subjectSlug ? materials.filter((material) => material.subject?.slug === subjectSlug) : materials
  const filteredGroups = subjectSlug ? groups.filter((group) => group.subject?.slug === subjectSlug) : groups

  return (
    <div className="space-y-4 xl:col-span-2">
      {subjectOptions.length > 1 ? (
        <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Filtrovat podle předmětu</p>
            <p className="text-xs text-muted-foreground">Příspěvky rozdělené podle předmětů, do kterých uživatel něco přidal.</p>
          </div>
          <select
            value={subjectSlug}
            onChange={(event) => setSubjectSlug(event.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/40 sm:w-72"
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

      <div className="flex flex-wrap gap-2 rounded-2xl border border-border bg-card p-3">
        {[
          { key: 'all', label: 'Vše' },
          { key: 'decks', label: 'Kartičky' },
          { key: 'materials', label: 'Materiály' },
          { key: 'groups', label: 'Složky' },
        ].map((tab) => {
          const active = activeTab === tab.key
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as 'all' | 'decks' | 'materials' | 'groups')}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                active
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      <div className="grid gap-8 xl:grid-cols-2">
        {(activeTab === 'all' || activeTab === 'decks') && (
          <ProfileContributionSection title="Veřejné balíčky kartiček" empty="Zatím žádné veřejné balíčky.">
          {filteredDecks.map((deck) => (
            <div key={deck.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <Link href={`/flashcardy/${deck.id}`} className="font-semibold text-foreground hover:text-primary">
                  {deck.title}
                </Link>
                <ShareLinkButton
                  path={getSharePath('deck', deck.share_slug)}
                  className="px-2 py-1 text-[11px] sm:text-xs"
                />
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{deck.card_count} karet</p>
              {deck.subject && <SubjectLink subject={deck.subject} />}
            </div>
          ))}
          </ProfileContributionSection>
        )}

        {(activeTab === 'all' || activeTab === 'materials') && (
          <ProfileContributionSection title="Samostatné materiály" empty="Zatím žádné samostatné materiály.">
          {filteredMaterials.map((material) => (
            <div key={material.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                {material.url ? (
                  <a
                    href={material.url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-foreground hover:text-primary"
                  >
                    {material.title}
                  </a>
                ) : (
                  <p className="font-semibold text-foreground">{material.title}</p>
                )}
                <ShareLinkButton
                  path={getSharePath('material', material.share_slug)}
                  className="px-2 py-1 text-[11px] sm:text-xs"
                />
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{material.sizeLabel}</p>
              {material.subject && <SubjectLink subject={material.subject} />}
            </div>
          ))}
          </ProfileContributionSection>
        )}

        {(activeTab === 'all' || activeTab === 'groups') && (
          <ProfileContributionSection title="Složky materiálů" empty="Zatím žádné veřejné složky materiálů.">
          {filteredGroups.map((group) => (
            <MaterialGroupCard key={group.id} group={group} showSubject />
          ))}
          </ProfileContributionSection>
        )}
      </div>
    </div>
  )
}

function SubjectLink({ subject }: { subject: NonNullable<SubjectRef> }) {
  return (
    <Link href={`/predmety/${subject.slug}`} className="mt-1 block text-xs text-muted-foreground hover:text-foreground">
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
        <div className="space-y-3">{items}</div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-background/40 px-4 py-8 text-center text-sm text-muted-foreground">
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
