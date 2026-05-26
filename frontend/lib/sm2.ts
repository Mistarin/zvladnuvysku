export interface SM2Result {
  nextInterval: number
  nextEaseFactor: number
  nextRepetitions: number
  nextStatus: 'new' | 'learning' | 'review'
  dueDate: string
}

/**
 * SM-2 Spaced Repetition Algorithm
 *
 * quality: 0=blackout, 1=incorrect, 2=incorrect but remembered,
 *          3=correct hard, 4=correct, 5=perfect
 */
export function calculateNextReview(
  quality: 0 | 1 | 2 | 3 | 4 | 5,
  easeFactor: number,
  interval: number,
  repetitions: number
): SM2Result {
  let nextInterval: number
  let nextEaseFactor: number
  let nextRepetitions: number
  let nextStatus: 'new' | 'learning' | 'review'

  if (quality < 3) {
    // Failed — reset repetitions and interval
    nextRepetitions = 0
    nextInterval = 1
    nextEaseFactor = easeFactor // ease unchanged on failure
    nextStatus = 'learning'
  } else {
    // Successful recall
    if (repetitions === 0) {
      nextInterval = 1
    } else if (repetitions === 1) {
      nextInterval = 6
    } else {
      nextInterval = Math.round(interval * easeFactor)
    }

    // Update ease factor
    const delta = 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)
    nextEaseFactor = Math.max(1.3, easeFactor + delta)

    nextRepetitions = repetitions + 1
    nextStatus = repetitions > 1 ? 'review' : 'learning'
  }

  // Calculate due date
  const due = new Date()
  due.setDate(due.getDate() + nextInterval)
  const dueDate = due.toISOString()

  return {
    nextInterval,
    nextEaseFactor,
    nextRepetitions,
    nextStatus,
    dueDate,
  }
}
