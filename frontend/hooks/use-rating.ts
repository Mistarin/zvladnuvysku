'use client'

import { useState, useCallback } from 'react'
import { saveSubjectRating } from '@/app/actions/contributions'

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
      const result = await saveSubjectRating(input)
      if (!result.success) {
        setError(result.error)
        return
      }
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
