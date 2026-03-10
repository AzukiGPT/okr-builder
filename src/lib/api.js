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

  listActions: (setId) => apiFetch(`/actions?set_id=${setId}`),
  getAction: (setId, id) => apiFetch(`/actions?set_id=${setId}&id=${id}`),
  createAction: (payload) => apiFetch("/actions", { method: "POST", body: JSON.stringify(payload) }),
  updateAction: (id, payload) => apiFetch(`/actions?id=${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteAction: (id) => apiFetch(`/actions?id=${id}`, { method: "DELETE" }),

  listPhases: (setId) => apiFetch(`/action-phases?set_id=${setId}`),
  createPhase: (payload) => apiFetch("/action-phases", { method: "POST", body: JSON.stringify(payload) }),
  updatePhase: (id, payload) => apiFetch(`/action-phases?id=${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deletePhase: (id) => apiFetch(`/action-phases?id=${id}`, { method: "DELETE" }),

  listDependencies: (setId) => apiFetch(`/action-dependencies?set_id=${setId}`),
  createDependency: (payload) => apiFetch("/action-dependencies", { method: "POST", body: JSON.stringify(payload) }),
  deleteDependency: (id) => apiFetch(`/action-dependencies?id=${id}`, { method: "DELETE" }),

  listKRStatuses: (setId) => apiFetch(`/kr-status?set_id=${setId}`),
  updateKRStatus: (setId, payload) => apiFetch(`/kr-status?set_id=${setId}`, { method: "PATCH", body: JSON.stringify(payload) }),

  listTemplates: (objectiveIds, krIds) => {
    if (krIds?.length) {
      return apiFetch(`/action-templates?kr_ids=${krIds.join(",")}`)
    }
    const params = objectiveIds?.length ? `?objective_ids=${objectiveIds.join(",")}` : ""
    return apiFetch(`/action-templates${params}`)
  },

  getProfile: () => apiFetch("/me"),
  updateProfile: (payload) => apiFetch("/me", { method: "PATCH", body: JSON.stringify(payload) }),
  adminListUsers: (filter = "pending") => apiFetch(`/admin/users?filter=${filter}`),
  adminUpdateUser: (id, payload) => apiFetch(`/admin/users?id=${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
}
