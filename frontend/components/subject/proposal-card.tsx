'use client'

import { useState } from 'react'
import { CheckCircle, XCircle, User, Calendar, Tag, FileEdit, FilePlus, FileText, FolderOpen } from 'lucide-react'
import { approveProposal, rejectProposal } from '@/app/admin/actions'
import { PublicUserLink } from '@/components/profile/public-user-link'
import type { PublicUserSummary } from '@/lib/public-user-summaries'

// Inline type until subject_proposals is in generated types
export interface SubjectProposal {
  id: string
  type: 'new' | 'edit'
  subject_id: string | null
  data: Record<string, unknown>
  note: string | null
  proposed_by: string
  proposed_by_email?: string
  proposed_by_profile?: PublicUserSummary | null
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  reviewed_at?: string | null
  rejection_reason?: string | null
}

const FIELD_LABELS: Record<string, string> = {
  name: 'Název', short_tag: 'Zkratka', description: 'Popis',
  target_audience: 'Pro koho', real_requirements: 'Reálné požadavky',
  difficulty: 'Obtížnost', time_intensity: 'Časová náročnost',
  attendance_type: 'Docházka',
  credits: 'Kredity', semester: 'Semestr', faculty: 'Fakulta', year: 'Ročník',
}

function formatProposalValue(value: unknown): string {
  if (typeof value === 'boolean') return value ? 'Ano' : 'Ne'
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === 'string' || typeof item === 'number') return String(item)
        if (item && typeof item === 'object') {
          const record = item as Record<string, unknown>
          return record.name || record.title || record.short_tag
            ? [record.name, record.title, record.short_tag].filter(Boolean).join(' · ')
            : JSON.stringify(item)
        }
        return String(item)
      })
      .join('\n')
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    return JSON.stringify(record, null, 2)
  }
  return String(value)
}

interface ProposalCardProps {
  proposal: SubjectProposal
  currentSubjectData?: Record<string, unknown> | null
  readonly?: boolean
  materialUrls?: Record<string, string>
}

type ProposalMaterial = {
  title: string
  file_path: string
  size_bytes: number
  page_count: number | null
}

function getProposalMaterials(value: unknown): ProposalMaterial[] {
  if (!Array.isArray(value)) return []

  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return []
    const record = item as Record<string, unknown>
    if (
      typeof record.title !== 'string' ||
      typeof record.file_path !== 'string' ||
      typeof record.size_bytes !== 'number'
    ) {
      return []
    }

    return [{
      title: record.title,
      file_path: record.file_path,
      size_bytes: record.size_bytes,
      page_count: typeof record.page_count === 'number' ? record.page_count : null,
    }]
  })
}

function getMaterialGroupTitle(value: unknown) {
  return typeof value === 'string' ? value : ''
}

export function ProposalCard({ proposal, currentSubjectData, readonly = false, materialUrls = {} }: ProposalCardProps) {
  const proposalDataRecord = proposal.data as Record<string, unknown>
  const [isPending, setIsPending] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [showReject, setShowReject] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [done, setDone] = useState(false)
  const [proposalMaterials, setProposalMaterials] = useState<ProposalMaterial[]>(() => getProposalMaterials(proposalDataRecord.materials))
  const [materialGroupTitle, setMaterialGroupTitle] = useState(() => getMaterialGroupTitle(proposalDataRecord.material_group_title))

  const handleApprove = async () => {
    setIsPending(true)
    setFeedback(null)
    const result = await approveProposal(proposal.id, {
      materials: proposalMaterials,
      materialGroupTitle: materialGroupTitle.trim() || null,
    })
    if (result.success) {
      setFeedback({ type: 'success', message: 'Návrh byl schválen ✓' })
      setDone(true)
    } else {
      setFeedback({ type: 'error', message: result.error })
    }
    setIsPending(false)
  }

  const handleReject = async () => {
    setIsPending(true)
    setFeedback(null)
    const result = await rejectProposal(proposal.id, rejectReason || undefined)
    if (result.success) {
      setFeedback({ type: 'success', message: 'Návrh byl zamítnut' })
      setDone(true)
    } else {
      setFeedback({ type: 'error', message: result.error })
    }
    setIsPending(false)
    setShowReject(false)
  }

  const formattedDate = new Date(proposal.created_at).toLocaleDateString('cs-CZ', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
  const formattedReviewedDate = proposal.reviewed_at
    ? new Date(proposal.reviewed_at).toLocaleDateString('cs-CZ', {
        day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
      })
    : null
  const statusTone =
    proposal.status === 'approved'
      ? 'bg-[#70C96B]/15 text-[#70C96B]'
      : proposal.status === 'rejected'
        ? 'bg-destructive/10 text-destructive'
        : 'bg-[#F6B73C]/15 text-[#F6B73C]'
  const statusLabel =
    proposal.status === 'approved'
      ? 'Schváleno'
      : proposal.status === 'rejected'
        ? 'Zamítnuto'
        : 'Čeká'

  if (done && feedback?.type === 'success') {
    return (
      <div className="glass-card flex items-center gap-3 p-4 text-sm text-muted-foreground opacity-60">
        <CheckCircle className="h-4 w-4 shrink-0 text-[#70C96B]" />
        <span>{feedback.message} — <span className="font-medium">{String(proposalDataRecord.name ?? proposal.id)}</span></span>
      </div>
    )
  }

  return (
    <div className="glass-card space-y-5 p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${proposal.type === 'new' ? 'bg-[#70C96B]/15 text-[#70C96B]' : 'bg-primary/15 text-primary'}`}>
          {proposal.type === 'new' ? <FilePlus className="w-3 h-3" /> : <FileEdit className="w-3 h-3" />}
          {proposal.type === 'new' ? 'Nový předmět' : 'Úprava'}
        </span>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Calendar className="w-3 h-3" /> {formattedDate}
        </span>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${statusTone}`}>
          {proposal.status === 'approved' ? <CheckCircle className="w-3 h-3" /> : proposal.status === 'rejected' ? <XCircle className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
          {statusLabel}
        </span>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <User className="w-3 h-3" />
          <PublicUserLink
            userId={proposal.proposed_by}
            summary={proposal.proposed_by_profile ?? null}
            fallbackLabel={proposal.proposed_by_email ?? proposal.proposed_by.slice(0, 8) + '…'}
            allowFallbackLink
          />
        </span>
      </div>

      {/* Data fields */}
      <div className="space-y-2">
        {Object.entries(proposalDataRecord).map(([key, value]) => {
          if (key === 'materials' || key === 'material_group_title') return null
          if (value === undefined || value === null || value === '') return null
          const label = FIELD_LABELS[key] ?? key
          const current = currentSubjectData?.[key]
          const changed = proposal.type === 'edit' && current !== undefined && current !== value
          const formattedValue = formatProposalValue(value)
          const formattedCurrent = changed ? formatProposalValue(current) : null

          return (
            <div key={key} className={`flex flex-col gap-2 rounded-lg px-3 py-3 text-sm ${changed ? 'border border-[#F6B73C]/20 bg-[#F6B73C]/10' : 'bg-muted/50'}`}>
              <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground min-w-[130px]">
                <Tag className="w-3 h-3" /> {label}
              </span>
              <div className="flex-1 space-y-0.5">
                <div className="whitespace-pre-wrap break-words text-foreground">{formattedValue}</div>
                {changed && formattedCurrent && (
                  <div className="whitespace-pre-wrap break-words text-xs text-muted-foreground line-through">{formattedCurrent}</div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {proposalMaterials.length > 0 && (
        <div className="space-y-4 rounded-[1.5rem] border border-border bg-background/50 p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold text-foreground">Navržené PDF materiály</p>
          </div>

          {proposalMaterials.length > 1 && (
            <div className="space-y-1">
              <label className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                <FolderOpen className="h-3.5 w-3.5" />
                Název skupiny po schválení
              </label>
              <input
                value={materialGroupTitle}
                onChange={(e) => setMaterialGroupTitle(e.target.value)}
                placeholder="např. Vše ke zkoušce"
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm shadow-inner outline-none focus:bg-background focus:ring-1 focus:ring-primary/40"
                maxLength={120}
              />
            </div>
          )}

          <div className="space-y-3">
            {proposalMaterials.map((material, index) => {
              const publicUrl = materialUrls[material.file_path] ?? '#'

              return (
                <div key={`${material.file_path}-${index}`} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <a
                        href={publicUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-foreground hover:text-primary"
                      >
                        {material.title}
                      </a>
                      <p className="mt-1 break-all text-xs text-muted-foreground">{material.file_path}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {(material.size_bytes / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>

                    <div className="sm:w-36">
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">Počet stran</label>
                      <input
                        type="number"
                        min={1}
                        max={9999}
                        value={material.page_count ?? ''}
                        onChange={(e) => {
                          const nextValue = e.target.value.trim()
                          setProposalMaterials((current) => current.map((item, currentIndex) => (
                            currentIndex === index
                              ? { ...item, page_count: nextValue ? Number(nextValue) : null }
                              : item
                          )))
                        }}
                        className="w-full rounded-xl border border-white/5 bg-muted/30 shadow-inner px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary/40 focus:bg-background transition-all"
                        placeholder="např. 18"
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Moderator note */}
      {proposal.note && (
        <div className="rounded-xl border border-white/5 bg-background/50 px-4 py-3 text-sm shadow-sm">
          <p className="text-xs text-muted-foreground mb-1 font-medium">Poznámka od studenta:</p>
          <p className="text-foreground">{proposal.note}</p>
        </div>
      )}

      {(formattedReviewedDate || proposal.rejection_reason) && (
        <div className="space-y-2 rounded-xl border border-white/5 bg-background/50 px-4 py-3 text-sm shadow-sm">
          {formattedReviewedDate && (
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">Vyřízeno</p>
              <p className="text-foreground">{formattedReviewedDate}</p>
            </div>
          )}
          {proposal.rejection_reason && (
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">Důvod zamítnutí</p>
              <p className="text-foreground">{proposal.rejection_reason}</p>
            </div>
          )}
        </div>
      )}

      {/* Feedback banner */}
      {feedback && (
        <div className={`rounded-lg px-3 py-2.5 text-sm font-medium ${
          feedback.type === 'success'
            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
            : 'bg-destructive/10 text-destructive border border-destructive/20'
        }`}>
          {feedback.message}
        </div>
      )}

      {/* Actions */}
      {!readonly && proposal.status === 'pending' && (
        <div className="flex flex-wrap gap-3 pt-4 mt-2 border-t border-white/5">
        <button onClick={handleApprove} disabled={isPending}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium accent-gradient text-white hover:opacity-90 transition-all disabled:opacity-50">
          <CheckCircle className="w-4 h-4" /> {isPending ? 'Zpracovávám…' : 'Schválit'}
        </button>

        {showReject ? (
          <div className="flex-1 flex gap-2 items-center">
            <input
              placeholder="Důvod zamítnutí (volitelné)"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="flex-1 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 shadow-inner text-sm outline-none focus:ring-1 focus:ring-destructive/40 focus:bg-background transition-all"
            />
            <button onClick={handleReject} disabled={isPending}
              className="px-4 py-2 rounded-xl text-sm font-medium bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-all disabled:opacity-50">
              Potvrdit
            </button>
            <button onClick={() => setShowReject(false)} className="text-xs text-muted-foreground hover:text-foreground">Zrušit</button>
          </div>
        ) : (
          <button onClick={() => setShowReject(true)} disabled={isPending}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border border-destructive/50 text-destructive hover:bg-destructive/10 transition-all">
            <XCircle className="w-4 h-4" /> Zamítnout
          </button>
        )}
        </div>
      )}
    </div>
  )
}
