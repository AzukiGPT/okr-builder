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
    .select("id, kr_id, status, progress, custom_target, set_objective_id, set_objectives!inner(set_id, team)")
    .eq("set_objectives.set_id", setId)

  if (error) return json({ error: error.message }, 500, req)

  const result = (data || []).map((kr) => ({
    uuid: kr.id,
    kr_id: kr.kr_id,
    status: kr.status,
    progress: kr.progress,
    custom_target: kr.custom_target,
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
  const { kr_id, status, progress } = body

  if (!kr_id) return json({ error: "Missing kr_id" }, 400, req)

  // Resolve kr_id text to the correct row via join
  const { data: krRow } = await supabaseAdmin
    .from("set_key_results")
    .select("id, set_objectives!inner(set_id)")
    .eq("kr_id", kr_id)
    .eq("set_objectives.set_id", setId)
    .maybeSingle()

  if (!krRow) return json({ error: "KR not found" }, 404, req)

  const updates = { updated_at: new Date().toISOString() }
  if (status !== undefined) updates.status = status
  if (progress !== undefined) updates.progress = Math.max(0, Math.min(100, Number(progress)))

  const { data: updated, error } = await supabaseAdmin
    .from("set_key_results")
    .update(updates)
    .eq("id", krRow.id)
    .select("id, kr_id, status, progress")
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
