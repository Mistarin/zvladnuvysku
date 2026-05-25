'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/types/database'

type RatingInsert = Database['public']['Tables']['subject_ratings']['Insert']

interface RatingInput {
  subjectId: string
  overall: number
  difficulty?: number
  usefulness?: number
  workload?: number
  comment?: string
}

interface UseRatingReturn {
  submit: (input: RatingInput) => Promise<void>
  isSubmitting: boolean
  error: string | null
  success: boolean
}

export function useRating(): UseRatingReturn {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const submit = useCallback(async (input: RatingInput) => {
    setIsSubmitting(true)
    setError(null)
    setSuccess(false)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setError('Pro hodnocení se musíš přihlásit.')
        return
      }

      const payload: RatingInsert = {
        subject_id: input.subjectId,
        user_id: user.id,
        overall: input.overall,
        difficulty: input.difficulty ?? null,
        usefulness: input.usefulness ?? null,
        workload: input.workload ?? null,
        comment: input.comment?.trim() || null,
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: dbError } = await (supabase as any)
        .from('subject_ratings')
        .upsert(payload, { onConflict: 'subject_id,user_id' })

      if (dbError) throw dbError
      setSuccess(true)
    } catch (err) {
      console.error('Chyba při hodnocení:', err)
      setError('Nepodařilo se uložit hodnocení. Zkus to znovu.')
    } finally {
      setIsSubmitting(false)
    }
  }, [])

  return { submit, isSubmitting, error, success }
}
