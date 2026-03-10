// src/utils/shareActionsURL.js
import LZString from "lz-string"

export function encodeActionsState({ actions, phases }) {
  const payload = { actions, phases }
  return LZString.compressToEncodedURIComponent(JSON.stringify(payload))
}

export function decodeActionsState(encoded) {
  try {
    const json = LZString.decompressFromEncodedURIComponent(encoded)
    if (!json) return null
    return JSON.parse(json)
  } catch {
    return null
  }
}

function fallbackCopy(text) {
  const textarea = document.createElement("textarea")
  textarea.value = text
  textarea.style.position = "fixed"
  textarea.style.opacity = "0"
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand("copy")
  document.body.removeChild(textarea)
}

export async function shareActionsURL({ actions, phases }) {
  const encoded = encodeActionsState({ actions, phases })
  const url = `${window.location.origin}${window.location.pathname}?actions=${encoded}`
  try {
    await navigator.clipboard.writeText(url)
  } catch {
    fallbackCopy(url)
  }
}
