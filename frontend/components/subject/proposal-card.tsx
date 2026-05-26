'use client'

import { useState } from 'react'
import { CheckCircle, XCircle, User, Calendar, Tag, FileEdit, FilePlus } from 'lucide-react'
import { approveProposal, rejectProposal } from '@/app/admin/actions'

// Inline type until subject_proposals is in generated types
export interface SubjectProposal {
  id: string
  type: 'new' | 'edit'
  subject_id: string | null
  data: Record<string, unknown>
  note: string | null
  proposed_by: string
  proposed_by_email?: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
}

const FIELD_LABELS: Record<string, string> = {
  name: 'Název', short_tag: 'Zkratka', description: 'Popis',
  target_audience: 'Pro koho', real_requirements: 'Reálné požadavky',
  difficulty: 'Obtížnost', time_intensity: 'Časová náročnost',
  attendance_required: 'Povinná docházka', credits: 'Kredity',
  semester: 'Semestr', faculty: 'Fakulta', department: 'Katedra', year: 'Ročník',
}

interface ProposalCardProps {
  proposal: SubjectProposal
  currentSubjectData?: Record<string, unknown> | null
}

export function ProposalCard({ proposal, currentSubjectData }: ProposalCardProps) {
  const [isPending, setIsPending] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [showReject, setShowReject] = useState(false)

  const handleApprove = async () => {
    setIsPending(true)
    await approveProposal(proposal.id)
    setIsPending(false)
  }

  const handleReject = async () => {
    setIsPending(true)
    await rejectProposal(proposal.id, rejectReason || undefined)
    setIsPending(false)
    setShowReject(false)
  }

  const formattedDate = new Date(proposal.created_at).toLocaleDateString('cs-CZ', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })

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
          {proposal.proposed_by_email ?? proposal.proposed_by.slice(0, 8) + '…'}
        </span>
      </div>

      {/* Data fields */}
      <div className="space-y-2">
        {Object.entries(proposal.data).map(([key, value]) => {
          if (value === undefined || value === null || value === '') return null
          const label = FIELD_LABELS[key] ?? key
          const current = currentSubjectData?.[key]
          const changed = proposal.type === 'edit' && current !== undefined && current !== value

          return (
            <div key={key} className={`flex gap-2 text-sm rounded-lg px-3 py-2 ${changed ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-muted/50'}`}>
              <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground min-w-[130px]">
                <Tag className="w-3 h-3" /> {label}
              </span>
              <div className="flex-1 space-y-0.5">
                <span className="text-foreground">{String(value)}</span>
                {changed && (
                  <div className="text-xs text-muted-foreground line-through">{String(current)}</div>
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

      {/* Actions */}
      <div className="flex flex-wrap gap-3 pt-2 border-t border-border">
        <button onClick={handleApprove} disabled={isPending}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium accent-gradient text-white hover:opacity-90 transition-all disabled:opacity-50">
          <CheckCircle className="w-4 h-4" /> Schválit
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
