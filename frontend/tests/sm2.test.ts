import { describe, expect, it } from 'vitest'
import { calculateNextReview } from '@/lib/sm2'

function daysUntil(dueDate: string) {
  const diffMs = new Date(dueDate).getTime() - Date.now()
  return Math.round(diffMs / (24 * 60 * 60 * 1000))
}

describe('calculateNextReview', () => {
  it('resets progress after a failed recall', () => {
    const result = calculateNextReview(1, 3.2, 21, 6)
    expect(result.nextRepetitions).toBe(0)
    expect(result.nextInterval).toBe(1)
    expect(result.nextEaseFactor).toBe(3.2)
    expect(result.nextStatus).toBe('learning')
  })

  it('treats quality 2 as a failure and 3 as success boundary', () => {
    expect(calculateNextReview(2, 2.5, 10, 5).nextRepetitions).toBe(0)
    const ok = calculateNextReview(3, 2.5, 10, 5)
    expect(ok.nextRepetitions).toBe(6)
  })

  it('uses fixed intervals for the first two successes', () => {
    expect(calculateNextReview(4, 2.5, 0, 0).nextInterval).toBe(1)
    expect(calculateNextReview(4, 2.5, 1, 1).nextInterval).toBe(6)
  })

  it('grows the interval by the ease factor afterwards', () => {
    const result = calculateNextReview(5, 2.9, 12, 7)
    expect(result.nextInterval).toBe(Math.round(12 * 2.9))
  })

  it('never drops the ease factor below 1.3', () => {
    const result = calculateNextReview(3, 1.25, 8, 8)
    expect(result.nextEaseFactor).toBeGreaterThanOrEqual(1.3)
  })

  it('marks long-running success as review status', () => {
    expect(calculateNextReview(5, 2.5, 10, 5).nextStatus).toBe('review')
    expect(calculateNextReview(5, 2.5, 1, 1).nextStatus).toBe('learning')
  })

  it('schedules the due date one interval day ahead', () => {
    const result = calculateNextReview(4, 2.5, 0, 0)
    expect(daysUntil(result.dueDate)).toBe(result.nextInterval)
  })
})
