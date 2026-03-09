import { useState, useCallback, useEffect } from "react"
import { api } from "../lib/api"

export function useActions(activeSetId) {
  const [actions, setActions] = useState([])
  const [actionsLoading, setActionsLoading] = useState(false)

  const loadActions = useCallback(async () => {
    if (!activeSetId) {
      setActions([])
      return
    }
    setActionsLoading(true)
    try {
      const { data } = await api.listActions(activeSetId)
      setActions(data || [])
    } catch {
      setActions([])
    } finally {
      setActionsLoading(false)
    }
  }, [activeSetId])

  useEffect(() => {
    loadActions()
  }, [loadActions])

  const createAction = useCallback(async (payload) => {
    const { data } = await api.createAction({ ...payload, set_id: activeSetId })
    setActions((prev) => [data, ...prev])
    return data
  }, [activeSetId])

  const updateAction = useCallback(async (id, payload) => {
    const { data } = await api.updateAction(id, payload)
    setActions((prev) => prev.map((a) => a.id === id ? { ...a, ...data } : a))
    return data
  }, [])

  const deleteAction = useCallback(async (id) => {
    await api.deleteAction(id)
    setActions((prev) => prev.filter((a) => a.id !== id))
  }, [])

  const batchCreateActions = useCallback(async (payloads) => {
    const results = []
    for (const payload of payloads) {
      const { data } = await api.createAction({ ...payload, set_id: activeSetId })
      results.push(data)
    }
    setActions((prev) => [...results, ...prev])
    return results
  }, [activeSetId])

  return { actions, actionsLoading, createAction, batchCreateActions, updateAction, deleteAction, loadActions }
}
