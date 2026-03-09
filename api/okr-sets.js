import { supabaseAdmin } from "./_lib/supabase-admin.js"
import { getUser } from "./_lib/auth.js"
import { corsHeaders, handleCors } from "./_lib/cors.js"

export const config = { runtime: "edge" }

function json(data, status = 200, req) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(req) },
  })
}

async function handleGet(req, user) {
  const { data, error } = await supabaseAdmin
    .from("okr_sets")
    .select("id, name, ctx, selected, funnel, custom_targets, created_at, updated_at")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("updated_at", { ascending: false })

  if (error) return json({ error: error.message }, 500, req)
  return json({ data }, 200, req)
}

async function handlePost(req, user) {
  const body = await req.json()
  const { name, ctx, selected, funnel, custom_targets } = body

  const { data, error } = await supabaseAdmin
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

  if (error) return json({ error: error.message }, 500, req)
  return json({ data }, 201, req)
}

async function handlePut(req, user) {
  const url = new URL(req.url)
  const id = url.searchParams.get("id")
  if (!id) return json({ error: "Missing id parameter" }, 400, req)

  const body = await req.json()
  const { name, ctx, selected, funnel, custom_targets } = body

  const updates = { updated_at: new Date().toISOString() }
  if (name !== undefined) updates.name = name
  if (ctx !== undefined) updates.ctx = ctx
  if (selected !== undefined) updates.selected = selected
  if (funnel !== undefined) updates.funnel = funnel
  if (custom_targets !== undefined) updates.custom_targets = custom_targets

  const { data, error } = await supabaseAdmin
    .from("okr_sets")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id, name, updated_at")
    .single()

  if (error) return json({ error: error.message }, 500, req)
  if (!data) return json({ error: "Not found" }, 404, req)
  return json({ data }, 200, req)
}

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
