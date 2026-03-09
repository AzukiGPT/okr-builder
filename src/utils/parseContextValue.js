/**
 * Parse freeform text into a number.
 * "€800k" → 800000, "20%" → 20, "2.5M" → 2500000, "1,200,000" → 1200000
 * Returns null if parsing fails.
 */
export function parseContextValue(str) {
  if (str == null || str === "") return null

  const cleaned = String(str)
    .replace(/[€$£\s,]/g, "")
    .replace(/%$/, "")
    .trim()

  const match = cleaned.match(/^([0-9]+(?:\.[0-9]+)?)\s*([kKmMbB]?)$/)
  if (!match) return null

  const base = parseFloat(match[1])
  if (Number.isNaN(base)) return null

  const multipliers = { k: 1_000, m: 1_000_000, b: 1_000_000_000 }
  return base * (multipliers[match[2].toLowerCase()] || 1)
}
