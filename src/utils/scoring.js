export function scoreObj(obj, stageCode, btlnkCode, ctxBonus = {}) {
  const stageMatch = obj.stages.includes(stageCode)
  const btlnkMatch = obj.btlnk.includes("all") || obj.btlnk.includes(btlnkCode)
  let score = (stageMatch ? 2 : 0) + (btlnkMatch ? 2 : 0)

  if (ctxBonus.churnBonus && obj.btlnk.includes("churn")) {
    score += ctxBonus.churnBonus
  }
  if (ctxBonus.founderLedIds?.includes(obj.id)) {
    score += 1
  }

  return score
}

export function getRecommendationLabel(score) {
  if (score >= 4) return "recommended"
  if (score >= 2) return "relevant"
  return "none"
}
