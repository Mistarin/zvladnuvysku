'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { deleteOwnSubjectRating, getMySubjectRating } from '@/app/actions/contributions'
import { ReviewVisibilityField } from '@/components/review/review-visibility-field'
import { useRating } from '@/hooks/use-rating'
import { WelcomeDisplayNameModal } from '@/components/layout/welcome-display-name-modal'
import { Loader2 } from 'lucide-react'

interface RatingFormProps {
  subjectId: string
  isLoggedIn: boolean
  hasPublicProfileIdentity: boolean
  initialDisplayName: string
  initialFaculty: string | null
}

function StarPicker({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (v: number) => void
}) {
  const [hovered, setHovered] = useState(0)
  const active = hovered || value

  return (
    <div className="space-y-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            className="text-xl transition-transform hover:scale-110"
            aria-label={`${star} z 5`}
          >
            <span className={active >= star ? 'text-yellow-400' : 'text-muted/60'}>
              ★
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

export function RatingForm({
  subjectId,
  isLoggedIn,
  hasPublicProfileIdentity: initialHasPublicProfileIdentity,
  initialDisplayName,
  initialFaculty,
}: RatingFormProps) {
  const router = useRouter()
  const { submit, isSubmitting, error, success } = useRating()

  const [overall, setOverall] = useState(0)
  const [difficulty, setDifficulty] = useState(0)
  const [usefulness, setUsefulness] = useState(0)
  const [workload, setWorkload] = useState(0)
  const [comment, setComment] = useState('')
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [hasExistingRating, setHasExistingRating] = useState(false)
  const [hasPublicProfileIdentity, setHasPublicProfileIdentity] = useState(initialHasPublicProfileIdentity)
  const [showDisplayNameModal, setShowDisplayNameModal] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [statusTone, setStatusTone] = useState<'success' | 'error'>('success')
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (!isLoggedIn) return

    async function fetchExisting() {
      const result = await getMySubjectRating(subjectId)
      if (!result.success) {
        return
      }
      const existingRating = result.data

      if (existingRating) {
        setOverall(existingRating.overall || 0)
        setDifficulty(existingRating.difficulty || 0)
        setUsefulness(existingRating.usefulness || 0)
        setWorkload(existingRating.workload || 0)
        setComment(existingRating.comment || '')
        setIsAnonymous(existingRating.is_anonymous)
        setHasExistingRating(true)
        return
      }

      setOverall(0)
      setDifficulty(0)
      setUsefulness(0)
      setWorkload(0)
      setComment('')
      setIsAnonymous(false)
      setHasExistingRating(false)
    }

    fetchExisting()
  }, [subjectId, isLoggedIn])

  if (!isLoggedIn) {
    return (
      <div className="text-center py-6 space-y-3">
        <p className="text-muted-foreground text-sm">
          Pro přidání hodnocení se musíš přihlásit školním účtem.
        </p>
        <Link
          href="/prihlaseni"
          className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium accent-gradient text-white hover:opacity-90 transition-all"
        >
          Přihlásit se →
        </Link>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (overall === 0) return
    if (!isAnonymous && !hasPublicProfileIdentity) {
      setShowDisplayNameModal(true)
      return
    }
    setStatusMessage(null)
    setStatusTone('success')
    const saved = await submit({
      subjectId,
      overall,
      difficulty: difficulty || undefined,
      usefulness: usefulness || undefined,
      workload: workload || undefined,
      comment,
      isAnonymous,
    })
    if (!saved) return

    setHasExistingRating(true)
    setStatusMessage('Hodnocení bylo uloženo.')
    router.refresh()
  }

  const handleDelete = async () => {
    if (!window.confirm('Opravdu chceš smazat celé svoje hodnocení tohoto předmětu?')) {
      return
    }

    setIsDeleting(true)
    setStatusMessage(null)
    setStatusTone('success')
    const result = await deleteOwnSubjectRating(subjectId)
    setIsDeleting(false)

    if (!result.success) {
      setStatusTone('error')
      setStatusMessage(result.error)
      return
    }

    setOverall(0)
    setDifficulty(0)
    setUsefulness(0)
    setWorkload(0)
    setComment('')
    setIsAnonymous(false)
    setHasExistingRating(false)
    setStatusMessage('Hodnocení bylo smazáno.')
    router.refresh()
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Celkové hodnocení — povinné */}
        <div>
          <StarPicker
            label="Celkové hodnocení *"
            value={overall}
            onChange={setOverall}
          />
          {overall === 0 && (
            <p className="text-xs text-muted-foreground/70 mt-1">Povinné</p>
          )}
        </div>

        {/* Volitelné dimenze */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StarPicker label="Obtížnost" value={difficulty} onChange={setDifficulty} />
          <StarPicker label="Užitečnost" value={usefulness} onChange={setUsefulness} />
          <StarPicker label="Pracovní zátěž" value={workload} onChange={setWorkload} />
        </div>

        <ReviewVisibilityField isAnonymous={isAnonymous} onChange={setIsAnonymous} />

        {/* Komentář */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground" htmlFor="rating-comment">
            Komentář <span className="opacity-50">(max 2000 znaků)</span>
          </label>
          <textarea
            id="rating-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={2000}
            rows={3}
            placeholder="Sdílej svou zkušenost s předmětem..."
            className="w-full rounded-xl border border-white/5 shadow-inner bg-muted/30 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground resize-none outline-none focus:ring-1 focus:ring-primary/40 focus:border-transparent focus:bg-background transition-all"
          />
          <p className="text-xs text-muted-foreground/50 text-right">
            {comment.length}/2000
          </p>
        </div>

        {statusMessage && (
          <p className={`text-sm ${statusTone === 'error' ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400'}`}>
            {statusMessage}
          </p>
        )}

        {success && !statusMessage && (
          <p className="text-sm text-emerald-600 dark:text-emerald-400">
            Hodnocení bylo uloženo.
          </p>
        )}

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="submit"
            disabled={isSubmitting || isDeleting || overall === 0}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium text-sm accent-gradient text-white hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed sm:w-auto sm:px-6"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {isSubmitting ? 'Ukládám...' : hasExistingRating ? 'Uložit změny' : 'Uložit hodnocení'}
          </button>
          {hasExistingRating && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isSubmitting || isDeleting}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-destructive/20 px-4 py-2.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50 sm:w-auto"
            >
              {isDeleting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isDeleting ? 'Mažu...' : 'Smazat recenzi'}
            </button>
          )}
        </div>
      </form>

      <WelcomeDisplayNameModal
        open={showDisplayNameModal}
        onOpenChange={setShowDisplayNameModal}
        initialDisplayName={initialDisplayName}
        initialFaculty={initialFaculty}
        onCompleted={() => {
          setHasPublicProfileIdentity(true)
        }}
      />
    </>
  )
}
