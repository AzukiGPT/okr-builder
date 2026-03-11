import { describe, it, expect } from 'vitest'
import { parseContextValue } from '../parseContextValue'

describe('parseContextValue', () => {
  it('parses simple integers', () => {
    expect(parseContextValue('100')).toBe(100)
  })

  it('parses decimals', () => {
    expect(parseContextValue('2.5')).toBe(2.5)
  })

  it('parses k suffix (thousands)', () => {
    expect(parseContextValue('800k')).toBe(800_000)
    expect(parseContextValue('800K')).toBe(800_000)
  })

  it('parses M suffix (millions)', () => {
    expect(parseContextValue('2.5M')).toBe(2_500_000)
    expect(parseContextValue('1m')).toBe(1_000_000)
  })

  it('parses B suffix (billions)', () => {
    expect(parseContextValue('1B')).toBe(1_000_000_000)
  })

  it('strips currency symbols', () => {
    expect(parseContextValue('€800k')).toBe(800_000)
    expect(parseContextValue('$100')).toBe(100)
    expect(parseContextValue('£50')).toBe(50)
  })

  it('strips percent sign', () => {
    expect(parseContextValue('20%')).toBe(20)
  })

  it('strips commas', () => {
    expect(parseContextValue('1,200,000')).toBe(1_200_000)
  })

  it('strips whitespace', () => {
    expect(parseContextValue('  100  ')).toBe(100)
  })

  it('returns null for empty/null', () => {
    expect(parseContextValue(null)).toBeNull()
    expect(parseContextValue(undefined)).toBeNull()
    expect(parseContextValue('')).toBeNull()
  })

  it('returns null for unparseable strings', () => {
    expect(parseContextValue('abc')).toBeNull()
    expect(parseContextValue('hello world')).toBeNull()
  })
})
