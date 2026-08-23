'use client'

import { useState } from 'react'
import Link from 'next/link'
import { getTeacherPath } from '@/lib/teacher-slug'

type SubjectCommentItem = {
  id: string
  overall: number
  comment: string
  is_anonymous: boolean
  subject: { slug: string; short_tag: string; name: string } | null
}

type TeacherReviewItem = {
  id: string
  rating: number | null
  review: string
  is_anonymous: boolean
  teacher: { slug: string; name: string } | null
}

type Props = {
  subjectComments: SubjectCommentItem[]
  teacherReviews: TeacherReviewItem[]
  isOwnProfile: boolean
}

export function PublicProfileActivityTabs({ subjectComments, teacherReviews, isOwnProfile }: Props) {
  const [activeTab, setActiveTab] = useState<'subject-comments' | 'teacher-reviews'>('subject-comments')

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap gap-2 rounded-lg border border-border bg-card p-2">
        <TabButton
          active={activeTab === 'subject-comments'}
          label={`Komentáře k předmětům (${subjectComments.length})`}
          onClick={() => setActiveTab('subject-comments')}
        />
        <TabButton
          active={activeTab === 'teacher-reviews'}
          label={`Hodnocení učitelů (${teacherReviews.length})`}
          onClick={() => setActiveTab('teacher-reviews')}
        />
      </div>

      {activeTab === 'subject-comments' ? (
        <div className="divide-y divide-border rounded-lg border border-border bg-card">
          {subjectComments.length > 0 ? (
            subjectComments.map((comment) => (
              <div key={comment.id} className="space-y-2 px-4 py-4 sm:px-5">
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
                    <span className="text-sm font-semibold text-primary">{comment.overall}/5</span>
                  </div>
                </div>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/80">{comment.comment}</p>
              </div>
            ))
          ) : (
            <EmptyState text="Zatím žádné schválené komentáře k předmětům." />
          )}
        </div>
      ) : (
        <div className="divide-y divide-border rounded-lg border border-border bg-card">
          {teacherReviews.length > 0 ? (
            teacherReviews.map((review) => (
              <div key={review.id} className="space-y-2 px-4 py-4 sm:px-5">
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
                    {review.rating ? <span className="text-sm font-semibold text-primary">{review.rating}/5</span> : null}
                  </div>
                </div>
                {review.review ? <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/80">{review.review}</p> : null}
              </div>
            ))
          ) : (
            <EmptyState text="Zatím žádná schválená hodnocení učitelů." />
          )}
        </div>
      )}
    </section>
  )
}

function TabButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? 'rounded-lg bg-muted px-4 py-2 text-sm font-medium text-foreground'
          : 'rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground'
      }
    >
      {label}
    </button>
  )
}

function EmptyState({ text }: { text: string }) {
  return <div className="px-4 py-8 text-center text-sm text-muted-foreground sm:px-5">{text}</div>
}
