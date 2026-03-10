import { useState, useCallback, useEffect } from "react"
import { api } from "../lib/api"

export function useDependencies(activeSetId) {
  const [dependencies, setDependencies] = useState([])
  const [depsLoading, setDepsLoading] = useState(false)

  const loadDependencies = useCallback(async () => {
    if (!activeSetId) {
      setDependencies([])
      return
    }
    setDepsLoading(true)
    try {
      const { data } = await api.listDependencies(activeSetId)
      setDependencies(data || [])
    } catch {
      setDependencies([])
    } finally {
      setDepsLoading(false)
    }
  }, [activeSetId])

  useEffect(() => {
    loadDependencies()
  }, [loadDependencies])

  const createDependency = useCallback(async (payload) => {
    const { data } = await api.createDependency(payload)
    setDependencies((prev) => [...prev, data])
    return data
  }, [])

  const deleteDependency = useCallback(async (id) => {
    await api.deleteDependency(id)
    setDependencies((prev) => prev.filter((d) => d.id !== id))
  }, [])

  return { dependencies, depsLoading, loadDependencies, createDependency, deleteDependency }
}
