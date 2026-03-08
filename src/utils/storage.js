const STORAGE_KEY = "okr-builder-state"

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // localStorage full or unavailable — silent fail
  }
}

export function clearState() {
  localStorage.removeItem(STORAGE_KEY)
}
