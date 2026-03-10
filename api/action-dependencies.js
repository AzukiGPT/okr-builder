import { supabaseAdmin } from "./_lib/supabase-admin.js"
import { getUser } from "./_lib/auth.js"
import { corsHeaders, handleCors } from "./_lib/cors.js"

export const config = { runtime: "edge" }

function json(data, statusCode = 200, req) {
  return new Response(JSON.stringify(data), {
    status: statusCode,
    headers: { "Content-Type": "application/json", ...corsHeaders(req) },
  })
}

/** Check user has at least the required access to a set */
async function checkSetAccess(userId, setId, minRole = "editor") {
  const { data: member } = await supabaseAdmin
    .from("set_members")
    .select("role")
    .eq("set_id", setId)
    .eq("user_id", userId)
    .maybeSingle()

  if (!member) {
    const { data: legacySet } = await supabaseAdmin
      .from("okr_sets")
      .select("id")
      .eq("id", setId)
      .eq("user_id", userId)
      .maybeSingle()

    if (!legacySet) return { allowed: false, role: null }
    return { allowed: true, role: "owner" }
  }

  const roleHierarchy = { owner: 3, editor: 2, viewer: 1 }
  const userLevel = roleHierarchy[member.role] || 0
  const requiredLevel = roleHierarchy[minRole] || 0

  return { allowed: userLevel >= requiredLevel, role: member.role }
}

/**
 * BFS cycle detection: would adding predecessor_id -> successor_id create a cycle?
 * Walks forward from successor_id through existing edges to see if we reach predecessor_id.
 */
async function wouldCreateCycle(predecessorId, successorId) {
  const { data: allDeps } = await supabaseAdmin
    .from("action_dependencies")
    .select("predecessor_id, successor_id")

  if (!allDeps || allDeps.length === 0) return false

  const adjacency = new Map()
  for (const dep of allDeps) {
    const list = adjacency.get(dep.predecessor_id) || []
    list.push(dep.successor_id)
    adjacency.set(dep.predecessor_id, list)
  }

  const visited = new Set()
  const queue = [successorId]

  while (queue.length > 0) {
    const current = queue.shift()
    if (current === predecessorId) return true
    if (visited.has(current)) continue
    visited.add(current)

    const neighbors = adjacency.get(current) || []
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        queue.push(neighbor)
      }
    }
  }

  return false
}

// --- GET ---------------------------------------------------------------
async function handleGet(req, user) {
  const url = new URL(req.url)
  const setId = url.searchParams.get("set_id")
  if (!setId) return json({ error: "Missing set_id parameter" }, 400, req)

  const access = await checkSetAccess(user.id, setId, "viewer")
  if (!access.allowed) return json({ error: "Forbidden" }, 403, req)

  // Get all action IDs in this set, then fetch their dependencies
  const { data: setActions, error: actionsErr } = await supabaseAdmin
    .from("actions")
    .select("id")
    .eq("set_id", setId)

  if (actionsErr) return json({ error: actionsErr.message }, 500, req)

  const actionIds = (setActions || []).map((a) => a.id)
  if (actionIds.length === 0) return json({ data: [] }, 200, req)

  const { data: deps, error: depsErr } = await supabaseAdmin
    .from("action_dependencies")
    .select("*")
    .or(`predecessor_id.in.(${actionIds.join(",")}),successor_id.in.(${actionIds.join(",")})`)

  if (depsErr) return json({ error: depsErr.message }, 500, req)

  return json({ data: deps || [] }, 200, req)
}

// --- POST --------------------------------------------------------------
async function handlePost(req, user) {
  const body = await req.json()
  const { predecessor_id, successor_id, dep_type, lag_days } = body

  if (!predecessor_id) return json({ error: "Missing predecessor_id" }, 400, req)
  if (!successor_id) return json({ error: "Missing successor_id" }, 400, req)
  if (predecessor_id === successor_id) {
    return json({ error: "An action cannot depend on itself" }, 400, req)
  }

  // Validate both actions exist and belong to the same set
  const { data: predAction } = await supabaseAdmin
    .from("actions")
    .select("id, set_id")
    .eq("id", predecessor_id)
    .single()

  if (!predAction) return json({ error: "Predecessor action not found" }, 404, req)

  const { data: succAction } = await supabaseAdmin
    .from("actions")
    .select("id, set_id")
    .eq("id", successor_id)
    .single()

  if (!succAction) return json({ error: "Successor action not found" }, 404, req)

  if (predAction.set_id !== succAction.set_id) {
    return json({ error: "Actions must belong to the same set" }, 400, req)
  }

  const access = await checkSetAccess(user.id, predAction.set_id)
  if (!access.allowed) return json({ error: "Forbidden" }, 403, req)

  // Check for duplicate
  const { data: existing } = await supabaseAdmin
    .from("action_dependencies")
    .select("id")
    .eq("predecessor_id", predecessor_id)
    .eq("successor_id", successor_id)
    .maybeSingle()

  if (existing) {
    return json({ error: "Dependency already exists" }, 409, req)
  }

  // Cycle detection via BFS
  const cyclic = await wouldCreateCycle(predecessor_id, successor_id)
  if (cyclic) {
    return json({ error: "Adding this dependency would create a cycle" }, 409, req)
  }

  const validTypes = ["FS", "SS", "FF", "SF"]
  const depType = validTypes.includes(dep_type) ? dep_type : "FS"

  const { data: dep, error } = await supabaseAdmin
    .from("action_dependencies")
    .insert({
      predecessor_id,
      successor_id,
      dep_type: depType,
      lag_days: lag_days || 0,
    })
    .select("*")
    .single()

  if (error) return json({ error: error.message }, 500, req)

  return json({ data: dep }, 201, req)
}

// --- DELETE -------------------------------------------------------------
async function handleDelete(req, user) {
  const url = new URL(req.url)
  const id = url.searchParams.get("id")
  if (!id) return json({ error: "Missing id parameter" }, 400, req)

  // Get the dependency to find the set
  const { data: dep } = await supabaseAdmin
    .from("action_dependencies")
    .select("id, predecessor_id")
    .eq("id", id)
    .single()

  if (!dep) return json({ error: "Not found" }, 404, req)

  // Look up set_id via the predecessor action
  const { data: action } = await supabaseAdmin
    .from("actions")
    .select("set_id")
    .eq("id", dep.predecessor_id)
    .single()

  if (!action) return json({ error: "Not found" }, 404, req)

  const access = await checkSetAccess(user.id, action.set_id)
  if (!access.allowed) return json({ error: "Forbidden" }, 403, req)

  const { error } = await supabaseAdmin
    .from("action_dependencies")
    .delete()
    .eq("id", id)

  if (error) return json({ error: error.message }, 500, req)
  return json({ success: true }, 200, req)
}

// --- Router ------------------------------------------------------------
export default async function handler(req) {
  const corsRes = handleCors(req)
  if (corsRes) return corsRes

  const user = await getUser(req)
  if (!user) return json({ error: "Unauthorized" }, 401, req)

  switch (req.method) {
    case "GET": return handleGet(req, user)
    case "POST": return handlePost(req, user)
    case "DELETE": return handleDelete(req, user)
    default: return json({ error: "Method not allowed" }, 405, req)
  }
}
