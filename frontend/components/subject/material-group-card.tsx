'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FolderOpen, FileText, User, ChevronDown, ChevronUp, Pencil, Trash2 } from 'lucide-react'
import { ShareLinkButton } from '@/components/share/share-link-button'
import { getSharePath } from '@/lib/share-links'
import { formatFileSize } from '@/lib/utils'
import { deleteMaterialGroup, renameMaterialGroup } from '@/app/actions/contributions'

export interface MaterialGroupItem {
  id: string
  title: string
  share_slug: string
  file_path: string
  size_bytes: number
  page_count: number | null
  created_at: string
  moderation_status: 'pending' | 'approved' | 'rejected'
  public_url: string
}

export interface MaterialGroupData {
  id: string
  title: string
  share_slug: string
  created_at: string
  uploader_id: string
  uploader_display_name: string | null
  subject: { name: string; slug: string; short_tag: string } | null
  materials: MaterialGroupItem[]
}

interface MaterialGroupCardProps {
  group: MaterialGroupData
  showSubject?: boolean
  /** If provided, shows manage controls (rename/delete) */
  isOwner?: boolean
  compact?: boolean
  defaultExpanded?: boolean
  onDeleted?: (groupId: string) => void
}

export function MaterialGroupCard({
  group,
  showSubject = false,
  isOwner = false,
  compact = false,
  defaultExpanded = true,
  onDeleted,
}: MaterialGroupCardProps) {
  const router = useRouter()
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(group.title)
  const [currentTitle, setCurrentTitle] = useState(group.title)
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const approvedCount = group.materials.filter(m => m.moderation_status === 'approved').length
  const pendingCount = group.materials.filter(m => m.moderation_status === 'pending').length
  const totalPages = group.materials.reduce((sum, m) => sum + (m.page_count ?? 0), 0)

  const handleRename = async () => {
    if (editTitle.trim() === currentTitle) { setIsEditing(false); return }
    setIsPending(true)
    setError(null)
    const result = await renameMaterialGroup(group.id, editTitle)
    if (result.success) {
      setCurrentTitle(editTitle.trim())
      setIsEditing(false)
      router.refresh()
    } else {
      setError(result.error)
    }
    setIsPending(false)
  }

  const handleDelete = async () => {
    if (!confirm('Opravdu chceš smazat tuhle skupinu? Materiály zůstanou zachované, jen se od skupiny odpojí.')) return
    setIsPending(true)
    const result = await deleteMaterialGroup(group.id)
    if (result.success) {
      if (onDeleted) {
        onDeleted(group.id)
      } else {
        router.refresh()
      }
    } else {
      setError(result.error)
      setIsPending(false)
    }
  }

  return (
    <div className="glass-card overflow-hidden">
      {/* Header */}
      <div className={`${compact ? 'p-3.5' : 'p-4'} ${isExpanded ? 'border-b border-border/50' : ''}`}>
        {/* Uploader line */}
        <div className={`flex items-center gap-1.5 text-xs text-muted-foreground ${compact ? 'mb-1.5' : 'mb-2'}`}>
          <User className="w-3 h-3" />
          <span>{group.uploader_display_name ?? 'Anonymní'}</span>
          {showSubject && group.subject && (
            <>
              <span className="mx-1">·</span>
              <Link
                href={`/predmety/${group.subject.slug}`}
                className="font-mono font-semibold bg-primary/10 text-primary px-1.5 py-0.5 rounded hover:bg-primary/20 transition-colors"
              >
                {group.subject.short_tag}
              </Link>
            </>
          )}
          <span className="ml-auto">{new Date(group.created_at).toLocaleDateString('cs-CZ')}</span>
        </div>

        {/* Title row */}
        <div className="flex items-start gap-2">
          <FolderOpen className={`${compact ? 'w-4 h-4' : 'w-5 h-5'} text-amber-500 mt-0.5 shrink-0`} />
          {isEditing ? (
            <div className="flex-1 flex gap-2">
              <input
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setIsEditing(false) }}
                className="flex-1 rounded-lg border border-border bg-background px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                autoFocus
                disabled={isPending}
                maxLength={120}
              />
              <button onClick={handleRename} disabled={isPending} className="text-xs text-primary hover:underline">Uložit</button>
              <button onClick={() => setIsEditing(false)} className="text-xs text-muted-foreground hover:text-foreground">Zrušit</button>
            </div>
          ) : (
            <div className="flex-1 min-w-0">
              <h3 className={`${compact ? 'text-sm' : 'text-base'} font-semibold text-foreground leading-tight break-words`}>
                {currentTitle}
              </h3>
            </div>
          )}
        </div>

        {/* Stats + controls */}
        <div className={`flex items-center gap-3 ${compact ? 'mt-1.5' : 'mt-2'} flex-wrap`}>
          <span className="text-xs text-muted-foreground">
            {group.materials.length} {group.materials.length === 1 ? 'soubor' : group.materials.length < 5 ? 'soubory' : 'souborů'}
            {totalPages > 0 && ` · ${totalPages} stran`}
          </span>
          {approvedCount > 0 && (
            <span className="text-xs text-emerald-600 dark:text-emerald-400">{approvedCount} schváleno</span>
          )}
          {pendingCount > 0 && (
            <span className="text-xs text-amber-600 dark:text-amber-400">{pendingCount} čeká</span>
          )}

          <div className="ml-auto flex items-center gap-2">
            {approvedCount > 0 && (
              <ShareLinkButton
                path={getSharePath('group', group.share_slug)}
                label="Sdílet složku"
                copiedLabel="Odkaz zkopírován"
                className="px-2 py-1 text-[11px] sm:text-xs"
              />
            )}
            {isOwner && !isEditing && (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                  title="Přejmenovat skupinu"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isPending}
                  className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                  title="Smazat skupinu"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </>
            )}
            <button
              onClick={() => setIsExpanded(v => !v)}
              className="p-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>
        {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
      </div>

      {/* Materials list */}
      {isExpanded && (
        <ul className="divide-y divide-border/50">
          {group.materials.map(material => (
            <li key={material.id}>
              <div className={`flex items-center gap-3 ${compact ? 'px-3.5 py-2.5' : 'px-4 py-3'} hover:bg-muted/50 transition-colors group`}>
                <a
                  href={material.public_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex min-w-0 flex-1 items-center gap-3"
                >
                  <div className="w-7 h-7 rounded-lg bg-sky-500/10 flex items-center justify-center shrink-0">
                    <FileText className="w-3.5 h-3.5 text-sky-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`${compact ? 'text-[13px]' : 'text-sm'} font-medium text-foreground truncate group-hover:text-primary transition-colors`}>
                      {material.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(material.size_bytes)}
                      {material.page_count != null && ` · ${material.page_count} stran`}
                    </p>
                  </div>
                </a>
                <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
                  material.moderation_status === 'approved'
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                    : material.moderation_status === 'rejected'
                    ? 'bg-destructive/10 text-destructive'
                    : 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
                }`}>
                  {material.moderation_status === 'approved' ? 'Schváleno' : material.moderation_status === 'rejected' ? 'Zamítnuto' : 'Čeká'}
                </span>
                {material.moderation_status === 'approved' && (
                  <ShareLinkButton
                    path={getSharePath('material', material.share_slug)}
                    label="Sdílet"
                    copiedLabel="Zkopírováno"
                    className="shrink-0 px-2 py-1 text-[11px] sm:text-xs"
                  />
                )}
              </div>
            </li>
          ))}
          {group.materials.length === 0 && (
            <li className="px-4 py-3 text-sm text-muted-foreground italic">Ve skupině zatím nejsou žádné soubory.</li>
          )}
        </ul>
      )}
    </div>
  )
}
