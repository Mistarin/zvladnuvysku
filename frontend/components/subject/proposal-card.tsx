'use client'

import { useState } from 'react'
import { CheckCircle, XCircle, User, Calendar, Tag, FileEdit, FilePlus } from 'lucide-react'
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
}

export function ProposalCard({ proposal, currentSubjectData }: ProposalCardProps) {
  const [isPending, setIsPending] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [showReject, setShowReject] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [done, setDone] = useState(false)

  const handleApprove = async () => {
    setIsPending(true)
    setFeedback(null)
    const result = await approveProposal(proposal.id)
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

  if (done && feedback?.type === 'success') {
    return (
      <div className="glass-card p-4 flex items-center gap-3 text-sm text-muted-foreground border border-border/50 opacity-60">
        <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
        <span>{feedback.message} — <span className="font-medium">{String(proposal.data.name ?? proposal.id)}</span></span>
      </div>
    )
  }

  return (
    <div className="glass-card p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${proposal.type === 'new' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-blue-500/15 text-blue-600 dark:text-blue-400'}`}>
          {proposal.type === 'new' ? <FilePlus className="w-3 h-3" /> : <FileEdit className="w-3 h-3" />}
          {proposal.type === 'new' ? 'Nový předmět' : 'Úprava'}
        </span>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Calendar className="w-3 h-3" /> {formattedDate}
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
        {Object.entries(proposal.data).map(([key, value]) => {
          if (value === undefined || value === null || value === '') return null
          const label = FIELD_LABELS[key] ?? key
          const current = currentSubjectData?.[key]
          const changed = proposal.type === 'edit' && current !== undefined && current !== value
          const formattedValue = formatProposalValue(value)
          const formattedCurrent = changed ? formatProposalValue(current) : null

          return (
            <div key={key} className={`flex flex-col gap-2 rounded-lg px-3 py-3 text-sm ${changed ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-muted/50'}`}>
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

      {/* Moderator note */}
      {proposal.note && (
        <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-sm">
          <p className="text-xs text-muted-foreground mb-1 font-medium">Poznámka od studenta:</p>
          <p className="text-foreground">{proposal.note}</p>
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
      <div className="flex flex-wrap gap-3 pt-2 border-t border-border">
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
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-destructive/40 focus:border-destructive/40"
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
    </div>
  )
}
