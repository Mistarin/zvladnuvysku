'use client'
import { useState } from 'react'
import { TeacherRatingForm } from './teacher-rating-form'

export function TeacherRateToggle({
  teacherId,
  isLoggedIn,
  hasPublicProfileIdentity,
  initialDisplayName,
  initialFaculty,
  initialLegalAcceptedAt,
  initialLegalAcceptedVersion,
}: {
  teacherId: string
  isLoggedIn: boolean
  hasPublicProfileIdentity: boolean
  initialDisplayName: string
  initialFaculty: string | null
  initialLegalAcceptedAt?: string | null
  initialLegalAcceptedVersion?: string | null
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="text-xs font-medium text-primary/80 hover:text-primary transition-colors"
      >
        {open ? 'Zavřít hodnocení ↑' : 'Přidat hodnocení ↓'}
      </button>
      {open && (
        <div className="pt-4 pb-2 border-t border-white/5 mt-3">
          <TeacherRatingForm
            teacherId={teacherId}
            isLoggedIn={isLoggedIn}
            hasPublicProfileIdentity={hasPublicProfileIdentity}
            initialDisplayName={initialDisplayName}
            initialFaculty={initialFaculty}
            initialLegalAcceptedAt={initialLegalAcceptedAt}
            initialLegalAcceptedVersion={initialLegalAcceptedVersion}
          />
        </div>
      )}
    </div>
  )
}
