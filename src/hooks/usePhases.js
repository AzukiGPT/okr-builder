import { useState, useCallback, useEffect, useRef } from "react"
import { api } from "../lib/api"
import { DEFAULT_PHASES } from "../data/actions-config"

export function usePhases(activeSetId) {
  const [phases, setPhases] = useState([])
  const [phasesLoading, setPhasesLoading] = useState(false)
  const initializedRef = useRef(false)

  const loadPhases = useCallback(async () => {
    if (!activeSetId) {
      setPhases([])
      return []
    }
    setPhasesLoading(true)
    try {
      const { data } = await api.listPhases(activeSetId)
      setPhases(data || [])
      return data || []
    } catch {
      setPhases([])
      return []
    } finally {
      setPhasesLoading(false)
    }
  }, [activeSetId])

  const ensureDefaultPhases = useCallback(async () => {
    if (!activeSetId || initializedRef.current) return
    initializedRef.current = true

    const existing = await loadPhases()
    if (existing.length > 0) return

    const created = []
    for (const phase of DEFAULT_PHASES) {
      try {
        const { data } = await api.createPhase({
          set_id: activeSetId,
          name: phase.name,
          position: phase.position,
          color_hex: phase.colorHex,
        })
        created.push(data)
      } catch {
        // Continue creating remaining phases
      }
    }
    if (created.length > 0) {
      setPhases(created)
    }
  }, [activeSetId, loadPhases])

  useEffect(() => {
    initializedRef.current = false
  }, [activeSetId])

  const createPhase = useCallback(async (payload) => {
    const { data } = await api.createPhase({ ...payload, set_id: activeSetId })
    setPhases((prev) => [...prev, data].sort((a, b) => a.position - b.position))
    return data
  }, [activeSetId])

  const updatePhase = useCallback(async (id, payload) => {
    const { data } = await api.updatePhase(id, payload)
    setPhases((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...data } : p)).sort((a, b) => a.position - b.position)
    )
    return data
  }, [])

  const deletePhase = useCallback(async (id) => {
    await api.deletePhase(id)
    setPhases((prev) => prev.filter((p) => p.id !== id))
  }, [])

  return {
    phases,
    phasesLoading,
    loadPhases,
    ensureDefaultPhases,
    createPhase,
    updatePhase,
    deletePhase,
  }
}
