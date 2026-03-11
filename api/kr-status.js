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

async function checkSetAccess(userId, setId, minRole = "viewer") {
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

    if (!legacySet) return { allowed: false }
    return { allowed: true, role: "owner" }
  }

  const hierarchy = { owner: 3, editor: 2, viewer: 1 }
  return {
    allowed: (hierarchy[member.role] || 0) >= (hierarchy[minRole] || 0),
    role: member.role,
  }
}

// ─── GET — all KR statuses for a set ────────────────────────
async function handleGet(req, user) {
  const url = new URL(req.url)
  const setId = url.searchParams.get("set_id")
  if (!setId) return json({ error: "Missing set_id" }, 400, req)

  const access = await checkSetAccess(user.id, setId)
  if (!access.allowed) return json({ error: "Forbidden" }, 403, req)

  const { data, error } = await supabaseAdmin
    .from("set_key_results")
    .select("id, kr_id, status, progress, custom_target, current_value, target_value, set_objective_id, set_objectives!inner(set_id, team)")
    .eq("set_objectives.set_id", setId)

  if (error) return json({ error: error.message }, 500, req)

  const result = (data || []).map((kr) => ({
    uuid: kr.id,
    kr_id: kr.kr_id,
    status: kr.status,
    progress: kr.progress,
    custom_target: kr.custom_target,
    current_value: kr.current_value ?? 0,
    target_value: kr.target_value ?? 0,
    team: kr.set_objectives?.team,
  }))

  return json({ data: result }, 200, req)
}

// ─── PATCH — update a single KR status/progress ─────────────
async function handlePatch(req, user) {
  const url = new URL(req.url)
  const setId = url.searchParams.get("set_id")
  if (!setId) return json({ error: "Missing set_id" }, 400, req)

  const access = await checkSetAccess(user.id, setId, "editor")
  if (!access.allowed) return json({ error: "Forbidden" }, 403, req)

  const body = await req.json()
  const { kr_id, status, progress, current_value, target_value } = body

  if (!kr_id) return json({ error: "Missing kr_id" }, 400, req)

  // Resolve kr_id text to the correct row via join
  const { data: krRow } = await supabaseAdmin
    .from("set_key_results")
    .select("id, current_value, target_value, set_objectives!inner(set_id)")
    .eq("kr_id", kr_id)
    .eq("set_objectives.set_id", setId)
    .maybeSingle()

  if (!krRow) return json({ error: "KR not found" }, 404, req)

  const updates = { updated_at: new Date().toISOString() }
  if (status !== undefined) updates.status = status

  // Update current/target values if provided
  const newCurrent = current_value !== undefined ? Number(current_value) || 0 : krRow.current_value ?? 0
  const newTarget = target_value !== undefined ? Number(target_value) || 0 : krRow.target_value ?? 0

  if (current_value !== undefined) updates.current_value = newCurrent
  if (target_value !== undefined) updates.target_value = newTarget

  // Auto-calculate progress from current/target if either was updated
  if (current_value !== undefined || target_value !== undefined) {
    updates.progress = newTarget > 0 ? Math.max(0, Math.min(100, Math.round((newCurrent / newTarget) * 100))) : 0
  } else if (progress !== undefined) {
    updates.progress = Math.max(0, Math.min(100, Number(progress)))
  }

  const { data: updated, error } = await supabaseAdmin
    .from("set_key_results")
    .update(updates)
    .eq("id", krRow.id)
    .select("id, kr_id, status, progress, current_value, target_value")
    .single()

  if (error) return json({ error: error.message }, 500, req)
  return json({ data: updated }, 200, req)
}

// ─── Router ──────────────────────────────────────────────────
export default async function handler(req) {
  const corsRes = handleCors(req)
  if (corsRes) return corsRes

  const user = await getUser(req)
  if (!user) return json({ error: "Unauthorized" }, 401, req)

  switch (req.method) {
    case "GET": return handleGet(req, user)
    case "PATCH": return handlePatch(req, user)
    default: return json({ error: "Method not allowed" }, 405, req)
  }
}
