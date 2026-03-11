import { useState, useRef, useCallback, useEffect } from "react"
import { api } from "../lib/api"

export function useKRSync(activeSetId) {
  const [krStatuses, setKRStatuses] = useState({})
  const [krSyncStatus, setKRSyncStatus] = useState("idle")
  const timerRef = useRef(null)
  const pendingRef = useRef(null)

  // Fetch all KR statuses when set becomes active
  useEffect(() => {
    if (!activeSetId) {
      setKRStatuses({})
      return
    }

    let cancelled = false
    setKRSyncStatus("loading")

    api.listKRStatuses(activeSetId).then(({ data }) => {
      if (cancelled) return
      const map = {}
      for (const kr of data || []) {
        map[kr.kr_id] = {
          status: kr.status,
          progress: kr.progress,
          current_value: kr.current_value ?? 0,
          target_value: kr.target_value ?? 0,
          uuid: kr.uuid,
          team: kr.team,
        }
      }
      setKRStatuses(map)
      setKRSyncStatus("idle")
    }).catch(() => {
      if (!cancelled) setKRSyncStatus("error")
    })

    return () => { cancelled = true }
  }, [activeSetId])

  const scheduleSync = useCallback((krId, updates) => {
    if (!activeSetId) return

    // Store pending update
    pendingRef.current = { kr_id: krId, ...updates }

    if (timerRef.current) clearTimeout(timerRef.current)

    timerRef.current = setTimeout(async () => {
      const payload = pendingRef.current
      if (!payload) return

      setKRSyncStatus("saving")
      try {
        await api.updateKRStatus(activeSetId, payload)
        setKRSyncStatus("saved")
      } catch {
        setKRSyncStatus("error")
      }
      pendingRef.current = null
    }, 800)
  }, [activeSetId])

  const setKRStatus = useCallback((krId, status) => {
    setKRStatuses((prev) => ({
      ...prev,
      [krId]: { ...prev[krId], status },
    }))
    scheduleSync(krId, { status })
  }, [scheduleSync])

  const setKRProgress = useCallback((krId, progress) => {
    const clamped = Math.max(0, Math.min(100, Number(progress) || 0))
    setKRStatuses((prev) => ({
      ...prev,
      [krId]: { ...prev[krId], progress: clamped },
    }))
    scheduleSync(krId, { progress: clamped })
  }, [scheduleSync])

  const setKRValues = useCallback((krId, currentValue, targetValue) => {
    const current = Number(currentValue) || 0
    const target = Number(targetValue) || 0
    const progress = target > 0 ? Math.max(0, Math.min(100, Math.round((current / target) * 100))) : 0

    setKRStatuses((prev) => ({
      ...prev,
      [krId]: { ...prev[krId], current_value: current, target_value: target, progress },
    }))
    scheduleSync(krId, { current_value: current, target_value: target })
  }, [scheduleSync])

  // Cleanup timer on unmount
  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [])

  return { krStatuses, setKRStatus, setKRProgress, setKRValues, krSyncStatus }
}
