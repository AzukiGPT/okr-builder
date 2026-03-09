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

/** Check user has at least editor access to a set */
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

  const actionId = url.searchParams.get("id")

  // Single action with KR links
  if (actionId) {
    const { data: action, error } = await supabaseAdmin
      .from("actions")
      .select("*, action_kr_links(set_kr_id)")
      .eq("id", actionId)
      .eq("set_id", setId)
      .single()

    if (error) return json({ error: error.message }, 500, req)
    if (!action) return json({ error: "Not found" }, 404, req)

    return json({
      data: {
        ...action,
        kr_ids: (action.action_kr_links || []).map((l) => l.set_kr_id),
        action_kr_links: undefined,
      },
    }, 200, req)
  }

  // List all actions for this set
  const { data: actions, error } = await supabaseAdmin
    .from("actions")
    .select("*, action_kr_links(set_kr_id)")
    .eq("set_id", setId)
    .order("created_at", { ascending: false })

  if (error) return json({ error: error.message }, 500, req)

  const enriched = (actions || []).map((a) => ({
    ...a,
    kr_ids: (a.action_kr_links || []).map((l) => l.set_kr_id),
    action_kr_links: undefined,
  }))

  return json({ data: enriched }, 200, req)
}

// ─── POST ────────────────────────────────────────────────────
async function handlePost(req, user) {
  const body = await req.json()
  const { set_id, title, description, channel, action_type, assignee_id,
    priority, start_date, end_date, budget_estimated, currency,
    source, template_id, kr_ids } = body

  if (!set_id) return json({ error: "Missing set_id" }, 400, req)
  if (!title) return json({ error: "Missing title" }, 400, req)

  const access = await checkSetAccess(user.id, set_id)
  if (!access.allowed) return json({ error: "Forbidden" }, 403, req)

  const { data: action, error } = await supabaseAdmin
    .from("actions")
    .insert({
      set_id,
      title,
      description: description || null,
      channel: channel || null,
      action_type: action_type || null,
      assignee_id: assignee_id || null,
      status: "todo",
      priority: priority || "medium",
      start_date: start_date || null,
      end_date: end_date || null,
      budget_estimated: budget_estimated || null,
      currency: currency || "EUR",
      source: source || "manual",
      template_id: template_id || null,
      created_by: user.id,
    })
    .select("*")
    .single()

  if (error) return json({ error: error.message }, 500, req)

  // Link to KRs if provided
  if (Array.isArray(kr_ids) && kr_ids.length > 0) {
    const links = kr_ids.map((krId) => ({
      action_id: action.id,
      set_kr_id: krId,
    }))
    await supabaseAdmin.from("action_kr_links").insert(links)
  }

  return json({ data: { ...action, kr_ids: kr_ids || [] } }, 201, req)
}

// ─── PUT ─────────────────────────────────────────────────────
async function handlePut(req, user) {
  const url = new URL(req.url)
  const id = url.searchParams.get("id")
  if (!id) return json({ error: "Missing id parameter" }, 400, req)

  // Get the action to check set_id
  const { data: existing } = await supabaseAdmin
    .from("actions")
    .select("set_id")
    .eq("id", id)
    .single()

  if (!existing) return json({ error: "Not found" }, 404, req)

  const access = await checkSetAccess(user.id, existing.set_id)
  if (!access.allowed) return json({ error: "Forbidden" }, 403, req)

  const body = await req.json()
  const { title, description, channel, action_type, assignee_id, status,
    priority, start_date, end_date, budget_estimated, budget_actual,
    currency, kr_ids } = body

  const updates = { updated_at: new Date().toISOString() }
  if (title !== undefined) updates.title = title
  if (description !== undefined) updates.description = description
  if (channel !== undefined) updates.channel = channel
  if (action_type !== undefined) updates.action_type = action_type
  if (assignee_id !== undefined) updates.assignee_id = assignee_id
  if (status !== undefined) updates.status = status
  if (priority !== undefined) updates.priority = priority
  if (start_date !== undefined) updates.start_date = start_date
  if (end_date !== undefined) updates.end_date = end_date
  if (budget_estimated !== undefined) updates.budget_estimated = budget_estimated
  if (budget_actual !== undefined) updates.budget_actual = budget_actual
  if (currency !== undefined) updates.currency = currency

  const { data: action, error } = await supabaseAdmin
    .from("actions")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single()

  if (error) return json({ error: error.message }, 500, req)

  // Update KR links if provided
  if (Array.isArray(kr_ids)) {
    await supabaseAdmin.from("action_kr_links").delete().eq("action_id", id)

    if (kr_ids.length > 0) {
      const links = kr_ids.map((krId) => ({
        action_id: id,
        set_kr_id: krId,
      }))
      await supabaseAdmin.from("action_kr_links").insert(links)
    }
  }

  return json({ data: { ...action, kr_ids: kr_ids || [] } }, 200, req)
}

// ─── DELETE ──────────────────────────────────────────────────
async function handleDelete(req, user) {
  const url = new URL(req.url)
  const id = url.searchParams.get("id")
  if (!id) return json({ error: "Missing id parameter" }, 400, req)

  const { data: existing } = await supabaseAdmin
    .from("actions")
    .select("set_id")
    .eq("id", id)
    .single()

  if (!existing) return json({ error: "Not found" }, 404, req)

  const access = await checkSetAccess(user.id, existing.set_id)
  if (!access.allowed) return json({ error: "Forbidden" }, 403, req)

  // CASCADE deletes action_kr_links
  const { error } = await supabaseAdmin
    .from("actions")
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
