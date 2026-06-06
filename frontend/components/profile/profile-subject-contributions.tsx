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
    <div className="space-y-5 xl:col-span-2">
      {subjectOptions.length > 1 ? (
        <div className="flex flex-col gap-3 rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(11,17,32,0.98),rgba(6,10,22,0.96))] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-50">Filtrovat podle předmětu</p>
            <p className="text-xs text-slate-400">Příspěvky rozdělené podle předmětů, do kterých uživatel něco přidal.</p>
          </div>
          <select
            value={subjectSlug}
            onChange={(event) => setSubjectSlug(event.target.value)}
            className="w-full rounded-xl border border-white/10 bg-[#1f2937] px-3 py-2 text-sm text-slate-100 outline-none transition-colors focus:border-[#02BED6]/40 focus:ring-1 focus:ring-[#02BED6]/30 sm:w-72"
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

      <div className="flex flex-wrap gap-2 rounded-2xl border border-white/10 bg-[#0f1728] p-2">
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
              className={`rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? 'border-white/10 bg-[#2a3344] text-slate-50'
                  : 'border-transparent bg-transparent text-slate-400 hover:border-white/5 hover:bg-white/[0.03] hover:text-slate-100'
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
            <div key={deck.id} className="rounded-[22px] border border-white/10 bg-[rgba(255,255,255,0.03)] p-4">
              <div className="flex items-start justify-between gap-3">
                <Link href={`/flashcardy/${deck.id}`} className="font-semibold text-slate-50 transition-colors hover:text-[#6dd9e8]">
                  {deck.title}
                </Link>
                <ShareLinkButton
                  path={getSharePath('deck', deck.share_slug)}
                  className="px-2 py-1 text-[11px] sm:text-xs"
                />
              </div>
              <p className="mt-1 text-sm text-slate-400">{deck.card_count} karet</p>
              {deck.subject && <SubjectLink subject={deck.subject} />}
            </div>
          ))}
          </ProfileContributionSection>
        )}

        {(activeTab === 'all' || activeTab === 'materials') && (
          <ProfileContributionSection title="Samostatné materiály" empty="Zatím žádné samostatné materiály.">
          {filteredMaterials.map((material) => (
            <div key={material.id} className="rounded-[22px] border border-white/10 bg-[rgba(255,255,255,0.03)] p-4">
              <div className="flex items-start justify-between gap-3">
                {material.url ? (
                  <a
                    href={material.url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-slate-50 transition-colors hover:text-[#6dd9e8]"
                  >
                    {material.title}
                  </a>
                ) : (
                  <p className="font-semibold text-slate-50">{material.title}</p>
                )}
                <ShareLinkButton
                  path={getSharePath('material', material.share_slug)}
                  className="px-2 py-1 text-[11px] sm:text-xs"
                />
              </div>
              <p className="mt-1 text-sm text-slate-400">{material.sizeLabel}</p>
              {material.subject && <SubjectLink subject={material.subject} />}
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
      </div>
    </div>
  )
}

function SubjectLink({ subject }: { subject: NonNullable<SubjectRef> }) {
  return (
    <Link href={`/predmety/${subject.slug}`} className="mt-1 block text-xs text-slate-400 transition-colors hover:text-slate-100">
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
      <h2 className="text-xl font-bold text-slate-50">{title}</h2>
      {items.length > 0 ? (
        <div className="space-y-3">{items}</div>
      ) : (
        <div className="rounded-[22px] border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-center text-sm text-slate-400">
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
