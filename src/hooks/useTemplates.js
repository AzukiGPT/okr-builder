import { useState, useEffect, useRef } from "react"
import { api } from "../lib/api"
import { OBJECTIVES } from "../data/objectives"

function extractKrIds(selected) {
  const krIds = []
  for (const team of ["sales", "marketing", "csm"]) {
    const objectiveIds = selected?.[team] || []
    const teamObjectives = OBJECTIVES[team] || []
    for (const objId of objectiveIds) {
      const obj = teamObjectives.find((o) => o.id === objId)
      if (obj?.krs) {
        for (const kr of obj.krs) {
          krIds.push(kr.id)
        }
      }
    }
  }
  return krIds
}

export function useTemplates(selected) {
  const [templates, setTemplates] = useState([])
  const [templatesLoading, setTemplatesLoading] = useState(false)
  const prevIdsRef = useRef("")

  useEffect(() => {
    if (!selected) return

    const krIds = extractKrIds(selected)
    const objectiveIds = [
      ...(selected.sales || []),
      ...(selected.marketing || []),
      ...(selected.csm || []),
    ]

    if (objectiveIds.length === 0) {
      setTemplates([])
      return
    }

    // Skip refetch if KR IDs unchanged
    const idsKey = krIds.sort().join(",")
    if (idsKey === prevIdsRef.current) return
    prevIdsRef.current = idsKey

    let cancelled = false
    setTemplatesLoading(true)

    api.listTemplates(objectiveIds, krIds).then(({ data }) => {
      if (!cancelled) setTemplates(data || [])
    }).catch(() => {
      if (!cancelled) setTemplates([])
    }).finally(() => {
      if (!cancelled) setTemplatesLoading(false)
    })

    return () => { cancelled = true }
  }, [selected])

  return { templates, templatesLoading }
}
