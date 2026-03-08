export function scoreObj(obj, stageCode, btlnkCode) {
  const stageMatch = obj.stages.includes(stageCode)
  const btlnkMatch = obj.btlnk.includes("all") || obj.btlnk.includes(btlnkCode)
  return (stageMatch ? 2 : 0) + (btlnkMatch ? 2 : 0)
}

export function getRecommendationLabel(score) {
  if (score === 4) return "recommended"
  if (score === 2) return "relevant"
  return "none"
}
