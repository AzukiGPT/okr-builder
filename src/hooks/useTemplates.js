import { useState, useEffect, useRef } from "react"
import { api } from "../lib/api"

export function useTemplates(selected) {
  const [templates, setTemplates] = useState([])
  const [templatesLoading, setTemplatesLoading] = useState(false)
  const prevIdsRef = useRef("")

  useEffect(() => {
    if (!selected) return

    const allIds = [
      ...(selected.sales || []),
      ...(selected.marketing || []),
      ...(selected.csm || []),
    ]

    if (allIds.length === 0) {
      setTemplates([])
      return
    }

    // Skip refetch if objectives unchanged
    const idsKey = allIds.sort().join(",")
    if (idsKey === prevIdsRef.current) return
    prevIdsRef.current = idsKey

    let cancelled = false
    setTemplatesLoading(true)

    api.listTemplates(allIds).then(({ data }) => {
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
