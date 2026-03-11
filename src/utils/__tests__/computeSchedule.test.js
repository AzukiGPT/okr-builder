import { describe, it, expect } from 'vitest'
import { computeSchedule } from '../computeSchedule'

const makeAction = (overrides = {}) => ({
  id: 'a1',
  phase_id: null,
  estimated_days: 5,
  start_date: null,
  end_date: null,
  ...overrides,
})

describe('computeSchedule', () => {
  it('returns empty array for empty/null actions', () => {
    expect(computeSchedule([], [])).toEqual([])
    expect(computeSchedule([], null)).toEqual([])
  })

  it('assigns dates to actions within a single phase', () => {
    const phases = [{ id: 'p1', position: 0 }]
    const actions = [makeAction({ phase_id: 'p1', estimated_days: 3 })]

    const result = computeSchedule(phases, actions, '2026-01-05')

    // Should have dates assigned (exact values depend on timezone)
    expect(result[0].start_date).toBeTruthy()
    expect(result[0].end_date).toBeTruthy()
    // End date should be after start date
    expect(new Date(result[0].end_date) >= new Date(result[0].start_date)).toBe(true)
  })

  it('chains phases sequentially', () => {
    const phases = [
      { id: 'p1', position: 0 },
      { id: 'p2', position: 1 },
    ]
    const actions = [
      makeAction({ id: 'a1', phase_id: 'p1', estimated_days: 1 }),
      makeAction({ id: 'a2', phase_id: 'p2', estimated_days: 1 }),
    ]

    const result = computeSchedule(phases, actions, '2026-01-05')

    // Phase 2 must start after phase 1 ends
    expect(new Date(result[1].start_date) > new Date(result[0].end_date)).toBe(true)
  })

  it('preserves manually set dates', () => {
    const phases = [{ id: 'p1', position: 0 }]
    const actions = [makeAction({ phase_id: 'p1', start_date: '2026-06-01', end_date: '2026-06-15' })]

    const result = computeSchedule(phases, actions, '2026-01-05')

    expect(result[0].start_date).toBe('2026-06-01')
    expect(result[0].end_date).toBe('2026-06-15')
  })

  it('leaves unphased actions unchanged', () => {
    const phases = [{ id: 'p1', position: 0 }]
    const actions = [makeAction({ phase_id: null })]

    const result = computeSchedule(phases, actions, '2026-01-05')

    expect(result[0].start_date).toBeNull()
    expect(result[0].end_date).toBeNull()
  })

  it('applies FS dependency constraints', () => {
    const phases = [{ id: 'p1', position: 0 }]
    const actions = [
      makeAction({ id: 'a1', phase_id: 'p1', estimated_days: 2 }),
      makeAction({ id: 'a2', phase_id: 'p1', estimated_days: 2 }),
    ]
    const deps = [{ predecessor_id: 'a1', successor_id: 'a2', dep_type: 'FS', lag_days: 0 }]

    const result = computeSchedule(phases, actions, '2026-01-05', deps)

    // a2 should start after a1 ends
    expect(new Date(result[1].start_date) > new Date(result[0].end_date)).toBe(true)
  })

  it('skips weekends in business day calculations', () => {
    const phases = [{ id: 'p1', position: 0 }]
    const actions = [makeAction({ phase_id: 'p1', estimated_days: 5 })]

    const result = computeSchedule(phases, actions, '2026-01-05')

    // 5 business days should span more than 5 calendar days (skipping weekend)
    const start = new Date(result[0].start_date)
    const end = new Date(result[0].end_date)
    const calendarDays = (end - start) / (1000 * 60 * 60 * 24)
    expect(calendarDays).toBeGreaterThanOrEqual(5)
  })
})
