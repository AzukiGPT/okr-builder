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

/**
 * Strategy: keep backward-compatible JSON response format,
 * but use set_members for access control (multi-user)
 * and sync writes to normalized tables (set_objectives, set_key_results).
 */

// ─── GET ─────────────────────────────────────────────────────
async function handleGet(req, user) {
  const { data: memberships, error: memErr } = await supabaseAdmin
    .from("set_members")
    .select("set_id, role")
    .eq("user_id", user.id)

  if (memErr) return json({ error: memErr.message }, 500, req)

  // Also include sets owned directly (legacy, no set_members row yet)
  const { data: ownedSets } = await supabaseAdmin
    .from("okr_sets")
    .select("id")
    .eq("user_id", user.id)
    .eq("is_active", true)

  const memberSetIds = memberships.map((m) => m.set_id)
  const ownedSetIds = (ownedSets || []).map((s) => s.id)
  const allSetIds = [...new Set([...memberSetIds, ...ownedSetIds])]

  if (allSetIds.length === 0) return json({ data: [] }, 200, req)

  const { data: sets, error: setsErr } = await supabaseAdmin
    .from("okr_sets")
    .select("id, name, ctx, selected, funnel, custom_targets, created_at, updated_at")
    .in("id", allSetIds)
    .eq("is_active", true)
    .order("updated_at", { ascending: false })

  if (setsErr) return json({ error: setsErr.message }, 500, req)

  const enriched = (sets || []).map((set) => {
    const membership = memberships.find((m) => m.set_id === set.id)
    return { ...set, role: membership?.role || "owner" }
  })

  return json({ data: enriched }, 200, req)
}

// ─── POST ────────────────────────────────────────────────────
async function handlePost(req, user) {
  const body = await req.json()
  const { name, ctx, selected, funnel, custom_targets } = body

  const { data: set, error: setErr } = await supabaseAdmin
    .from("okr_sets")
    .insert({
      user_id: user.id,
      name: name || "Mon OKR Set",
      ctx: ctx || {},
      selected: selected || {},
      funnel: funnel || {},
      custom_targets: custom_targets || {},
    })
    .select("id, name, created_at, updated_at")
    .single()

  if (setErr) return json({ error: setErr.message }, 500, req)

  // Create owner membership
  await supabaseAdmin.from("set_members").insert({
    set_id: set.id,
    user_id: user.id,
    role: "owner",
  })

  // Sync to normalized tables
  if (selected) {
    await syncObjectivesToNormalized(set.id, selected, custom_targets || {})
  }

  return json({ data: set }, 201, req)
}

// ─── PUT ─────────────────────────────────────────────────────
async function handlePut(req, user) {
  const url = new URL(req.url)
  const id = url.searchParams.get("id")
  if (!id) return json({ error: "Missing id parameter" }, 400, req)

  // Check access via set_members OR legacy user_id
  const { data: member } = await supabaseAdmin
    .from("set_members")
    .select("role")
    .eq("set_id", id)
    .eq("user_id", user.id)
    .maybeSingle()

  if (!member) {
    // Fallback: check legacy user_id ownership
    const { data: legacySet } = await supabaseAdmin
      .from("okr_sets")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle()

    if (!legacySet) return json({ error: "Forbidden" }, 403, req)
  } else if (member.role === "viewer") {
    return json({ error: "Viewers cannot edit" }, 403, req)
  }

  const body = await req.json()
  const { name, ctx, selected, funnel, custom_targets } = body

  const updates = { updated_at: new Date().toISOString() }
  if (name !== undefined) updates.name = name
  if (ctx !== undefined) updates.ctx = ctx
  if (selected !== undefined) updates.selected = selected
  if (funnel !== undefined) updates.funnel = funnel
  if (custom_targets !== undefined) updates.custom_targets = custom_targets

  const { data: set, error: setErr } = await supabaseAdmin
    .from("okr_sets")
    .update(updates)
    .eq("id", id)
    .select("id, name, updated_at")
    .single()

  if (setErr) return json({ error: setErr.message }, 500, req)
  if (!set) return json({ error: "Not found" }, 404, req)

  // Sync normalized tables
  if (selected !== undefined) {
    await syncObjectivesToNormalized(id, selected, custom_targets || {})
  } else if (custom_targets !== undefined) {
    await syncCustomTargetsOnly(id, custom_targets)
  }

  return json({ data: set }, 200, req)
}

// ─── DELETE ──────────────────────────────────────────────────
async function handleDelete(req, user) {
  const url = new URL(req.url)
  const id = url.searchParams.get("id")
  if (!id) return json({ error: "Missing id parameter" }, 400, req)

  const { error } = await supabaseAdmin
    .from("okr_sets")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id)

  if (error) return json({ error: error.message }, 500, req)
  return json({ success: true }, 200, req)
}

// ─── Sync helpers ────────────────────────────────────────────

async function syncObjectivesToNormalized(setId, selected, customTargets) {
  // Clear existing (CASCADE deletes KRs)
  await supabaseAdmin.from("set_objectives").delete().eq("set_id", setId)

  for (const team of ["sales", "marketing", "csm"]) {
    const objIds = selected[team] || []

    for (let pos = 0; pos < objIds.length; pos++) {
      const objId = objIds[pos]

      const { data: obj } = await supabaseAdmin
        .from("set_objectives")
        .insert({ set_id: setId, objective_id: objId, team, position: pos })
        .select("id")
        .single()

      if (!obj) continue

      // Create KR rows (objId.1 through objId.10 covers all objectives)
      const krInserts = []
      for (let i = 1; i <= 10; i++) {
        const krId = `${objId}.${i}`
        krInserts.push({
          set_objective_id: obj.id,
          kr_id: krId,
          custom_target: customTargets[krId] || null,
        })
      }

      await supabaseAdmin.from("set_key_results").insert(krInserts)
    }
  }
}

async function syncCustomTargetsOnly(setId, customTargets) {
  const { data: objectives } = await supabaseAdmin
    .from("set_objectives")
    .select("id, objective_id")
    .eq("set_id", setId)

  if (!objectives) return

  for (const obj of objectives) {
    const { data: krs } = await supabaseAdmin
      .from("set_key_results")
      .select("id, kr_id")
      .eq("set_objective_id", obj.id)

    if (!krs) continue

    for (const kr of krs) {
      const target = customTargets[kr.kr_id]
      if (target !== undefined) {
        await supabaseAdmin
          .from("set_key_results")
          .update({ custom_target: target, updated_at: new Date().toISOString() })
          .eq("id", kr.id)
      }
    }
  }
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
