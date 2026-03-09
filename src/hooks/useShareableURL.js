import { useEffect, useState, useCallback } from "react"
import LZString from "lz-string"

export function encodeState(state) {
  const payload = {
    ctx: state.ctx,
    selected: state.selected,
    funnel: state.funnel,
    customTargets: state.customTargets,
  }
  return LZString.compressToEncodedURIComponent(JSON.stringify(payload))
}

export function decodeState(encoded) {
  try {
    const json = LZString.decompressFromEncodedURIComponent(encoded)
    if (!json) return null
    return JSON.parse(json)
  } catch {
    return null
  }
}

export function useShareableURL(state, dispatch) {
  const [shared, setShared] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const encoded = params.get("s")
    if (encoded) {
      const decoded = decodeState(encoded)
      if (decoded) {
        dispatch({ type: "LOAD", payload: { ...decoded, step: 3 } })
        window.history.replaceState({}, "", window.location.pathname)
      }
    }
  }, [dispatch])

  const share = useCallback(() => {
    const encoded = encodeState(state)
    const url = `${window.location.origin}${window.location.pathname}?s=${encoded}`
    navigator.clipboard.writeText(url).then(() => {
      setShared(true)
      setTimeout(() => setShared(false), 2000)
    })
  }, [state])

  return { share, shared }
}
