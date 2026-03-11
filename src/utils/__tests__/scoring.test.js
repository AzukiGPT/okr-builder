import { describe, it, expect } from 'vitest'
import { scoreObj, getRecommendationLabel } from '../scoring'

describe('scoreObj', () => {
  it('scores 2 for stage match only', () => {
    expect(scoreObj({ id: 'X', stages: ['early'], btlnk: ['other'] }, 'early', 'pipeline')).toBe(2)
  })

  it('scores 2 for bottleneck match only', () => {
    expect(scoreObj({ id: 'X', stages: ['late'], btlnk: ['pipeline'] }, 'early', 'pipeline')).toBe(2)
  })

  it('scores 0 when nothing matches', () => {
    expect(scoreObj({ id: 'X', stages: ['late'], btlnk: ['other'] }, 'early', 'pipeline')).toBe(0)
  })

  it('scores 4 when both stage and bottleneck match', () => {
    const obj = { id: 'S1', stages: ['early'], btlnk: ['pipeline'] }
    expect(scoreObj(obj, 'early', 'pipeline')).toBe(4)
  })

  it('scores 2 for btlnk "all" regardless of specific bottleneck', () => {
    expect(scoreObj({ id: 'X', stages: ['late'], btlnk: ['all'] }, 'early', 'pipeline')).toBe(2)
  })

  it('adds churn bonus when btlnk includes churn', () => {
    const obj = { id: 'S1', stages: ['early'], btlnk: ['pipeline', 'churn'] }
    expect(scoreObj(obj, 'early', 'pipeline', { churnBonus: 1 })).toBe(5)
  })

  it('does not add churn bonus when btlnk lacks churn', () => {
    const obj = { id: 'S1', stages: ['early'], btlnk: ['pipeline'] }
    expect(scoreObj(obj, 'early', 'pipeline', { churnBonus: 1 })).toBe(4)
  })

  it('adds founder-led bonus when id matches', () => {
    const obj = { id: 'S1', stages: ['early'], btlnk: ['pipeline'] }
    expect(scoreObj(obj, 'early', 'pipeline', { founderLedIds: ['S1'] })).toBe(5)
  })

  it('stacks both bonuses', () => {
    const obj = { id: 'S1', stages: ['early'], btlnk: ['pipeline', 'churn'] }
    expect(scoreObj(obj, 'early', 'pipeline', { churnBonus: 1, founderLedIds: ['S1'] })).toBe(6)
  })
})

describe('getRecommendationLabel', () => {
  it('returns "recommended" for score >= 4', () => {
    expect(getRecommendationLabel(4)).toBe('recommended')
    expect(getRecommendationLabel(6)).toBe('recommended')
  })

  it('returns "relevant" for score 2-3', () => {
    expect(getRecommendationLabel(2)).toBe('relevant')
    expect(getRecommendationLabel(3)).toBe('relevant')
  })

  it('returns "none" for score < 2', () => {
    expect(getRecommendationLabel(0)).toBe('none')
    expect(getRecommendationLabel(1)).toBe('none')
  })
})
