import { useEffect, useRef, useState, useCallback } from "react"
import { api } from "../lib/api"

export function useCloudSync(state, dispatch) {
  const [activeSetId, setActiveSetId] = useState(null)
  const [saveStatus, setSaveStatus] = useState("idle")
  const [sets, setSets] = useState([])
  const timerRef = useRef(null)
  const lastSavedRef = useRef(null)

  const loadSets = useCallback(async () => {
    try {
      const { data } = await api.listSets()
      setSets(data)
      return data
    } catch {
      setSets([])
      return []
    }
  }, [])

  const loadSet = useCallback((set) => {
    setActiveSetId(set.id)
    dispatch({
      type: "LOAD",
      payload: {
        ctx: set.ctx,
        selected: set.selected,
        funnel: set.funnel,
        customTargets: set.custom_targets,
        step: 0,
      },
    })
    lastSavedRef.current = JSON.stringify({
      ctx: set.ctx,
      selected: set.selected,
      funnel: set.funnel,
      custom_targets: set.custom_targets,
    })
  }, [dispatch])

  const deleteSet = useCallback(async (id) => {
    await api.deleteSet(id)
    setSets((prev) => prev.filter((s) => s.id !== id))
  }, [])

  const renameSet = useCallback(async (id, name) => {
    await api.updateSet(id, { name })
    setSets((prev) => prev.map((s) => s.id === id ? { ...s, name } : s))
  }, [])

  const createSet = useCallback(async (name) => {
    const payload = {
      name: name || state.ctx.company || "Mon OKR Set",
      ctx: state.ctx,
      selected: state.selected,
      funnel: state.funnel,
      custom_targets: state.customTargets,
    }
    const { data } = await api.createSet(payload)
    setActiveSetId(data.id)
    lastSavedRef.current = JSON.stringify({
      ctx: state.ctx,
      selected: state.selected,
      funnel: state.funnel,
      custom_targets: state.customTargets,
    })
    setSaveStatus("saved")
    await loadSets()
    return data
  }, [state, loadSets])

  useEffect(() => {
    if (!activeSetId) return

    const currentPayload = JSON.stringify({
      ctx: state.ctx,
      selected: state.selected,
      funnel: state.funnel,
      custom_targets: state.customTargets,
    })

    if (currentPayload === lastSavedRef.current) return

    if (timerRef.current) clearTimeout(timerRef.current)

    timerRef.current = setTimeout(async () => {
      setSaveStatus("saving")
      try {
        await api.updateSet(activeSetId, {
          name: state.ctx.company || "Mon OKR Set",
          ctx: state.ctx,
          selected: state.selected,
          funnel: state.funnel,
          custom_targets: state.customTargets,
        })
        lastSavedRef.current = currentPayload
        setSaveStatus("saved")
      } catch {
        setSaveStatus("error")
      }
    }, 1500)

    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [activeSetId, state.ctx, state.selected, state.funnel, state.customTargets])

  return {
    activeSetId,
    saveStatus,
    sets,
    loadSets,
    loadSet,
    createSet,
    deleteSet,
    renameSet,
    setActiveSetId,
  }
}
