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
    // Fallback: legacy user_id ownership
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

// ─── GET ─────────────────────────────────────────────────────
async function handleGet(req, user) {
  const url = new URL(req.url)
  const setId = url.searchParams.get("set_id")
  if (!setId) return json({ error: "Missing set_id parameter" }, 400, req)

  const access = await checkSetAccess(user.id, setId, "viewer")
  if (!access.allowed) return json({ error: "Forbidden" }, 403, req)

  const { data: phases, error } = await supabaseAdmin
    .from("action_phases")
    .select("*")
    .eq("set_id", setId)
    .order("position", { ascending: true })

  if (error) return json({ error: error.message }, 500, req)

  return json({ data: phases || [] }, 200, req)
}

// ─── POST ────────────────────────────────────────────────────
async function handlePost(req, user) {
  const body = await req.json()
  const { set_id, name, position, color_hex } = body

  if (!set_id) return json({ error: "Missing set_id" }, 400, req)
  if (!name) return json({ error: "Missing name" }, 400, req)

  const access = await checkSetAccess(user.id, set_id)
  if (!access.allowed) return json({ error: "Forbidden" }, 403, req)

  const { data: phase, error } = await supabaseAdmin
    .from("action_phases")
    .insert({
      set_id,
      name,
      position: position ?? 0,
      color_hex: color_hex || null,
    })
    .select("*")
    .single()

  if (error) return json({ error: error.message }, 500, req)

  return json({ data: phase }, 201, req)
}

// ─── PUT ─────────────────────────────────────────────────────
async function handlePut(req, user) {
  const url = new URL(req.url)
  const id = url.searchParams.get("id")
  if (!id) return json({ error: "Missing id parameter" }, 400, req)

  // Get the phase to check set_id
  const { data: existing } = await supabaseAdmin
    .from("action_phases")
    .select("set_id")
    .eq("id", id)
    .single()

  if (!existing) return json({ error: "Not found" }, 404, req)

  const access = await checkSetAccess(user.id, existing.set_id)
  if (!access.allowed) return json({ error: "Forbidden" }, 403, req)

  const body = await req.json()
  const { name, position, color_hex } = body

  const updates = { updated_at: new Date().toISOString() }
  if (name !== undefined) updates.name = name
  if (position !== undefined) updates.position = position
  if (color_hex !== undefined) updates.color_hex = color_hex

  const { data: phase, error } = await supabaseAdmin
    .from("action_phases")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single()

  if (error) return json({ error: error.message }, 500, req)

  return json({ data: phase }, 200, req)
}

// ─── DELETE ──────────────────────────────────────────────────
async function handleDelete(req, user) {
  const url = new URL(req.url)
  const id = url.searchParams.get("id")
  if (!id) return json({ error: "Missing id parameter" }, 400, req)

  const { data: existing } = await supabaseAdmin
    .from("action_phases")
    .select("set_id")
    .eq("id", id)
    .single()

  if (!existing) return json({ error: "Not found" }, 404, req)

  const access = await checkSetAccess(user.id, existing.set_id)
  if (!access.allowed) return json({ error: "Forbidden" }, 403, req)

  const { error } = await supabaseAdmin
    .from("action_phases")
    .delete()
    .eq("id", id)

  if (error) return json({ error: error.message }, 500, req)
  return json({ success: true }, 200, req)
}

// ─── Router ──────────────────────────────────────────────────
export default async function handler(req) {
  const corsRes = handleCors(req)
  if (corsRes) return corsRes

  const user = await getUser(req)
  if (!user) return json({ error: "Unauthorized" }, 401, req)

  switch (req.method) {
    case "GET": return handleGet(req, user)
    case "POST": return handlePost(req, user)
    case "PUT": return handlePut(req, user)
    case "DELETE": return handleDelete(req, user)
    default: return json({ error: "Method not allowed" }, 405, req)
  }
}
