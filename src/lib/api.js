import { supabase } from "./supabase"

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error("Not authenticated")
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${session.access_token}`,
  }
}

async function apiFetch(path, options = {}) {
  const headers = await getAuthHeaders()
  const res = await fetch(`/api${path}`, { ...options, headers })
  const body = await res.json()
  if (!res.ok) throw new Error(body.error || `API error ${res.status}`)
  return body
}

export const api = {
  listSets: () => apiFetch("/okr-sets"),
  createSet: (payload) => apiFetch("/okr-sets", { method: "POST", body: JSON.stringify(payload) }),
  updateSet: (id, payload) => apiFetch(`/okr-sets?id=${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteSet: (id) => apiFetch(`/okr-sets?id=${id}`, { method: "DELETE" }),
  getProfile: () => apiFetch("/me"),
  updateProfile: (payload) => apiFetch("/me", { method: "PATCH", body: JSON.stringify(payload) }),
}
