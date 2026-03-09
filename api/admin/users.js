import { supabaseAdmin } from "../_lib/supabase-admin.js"
import { getUser } from "../_lib/auth.js"
import { corsHeaders, handleCors } from "../_lib/cors.js"

export const config = { runtime: "edge" }

function json(data, status = 200, req) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(req) },
  })
}

async function requireAdmin(req) {
  const user = await getUser(req)
  if (!user) return { error: json({ error: "Unauthorized" }, 401, req) }

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (!profile || profile.role !== "admin") {
    return { error: json({ error: "Forbidden: admin only" }, 403, req) }
  }

  return { user }
}

async function handleGet(req) {
  const url = new URL(req.url)
  const filter = url.searchParams.get("filter") || "pending"

  let query = supabaseAdmin
    .from("profiles")
    .select("id, email, full_name, company, role, is_approved, created_at")
    .order("created_at", { ascending: false })

  if (filter === "pending") {
    query = query.eq("is_approved", false)
  }

  const { data, error } = await query
  if (error) return json({ error: error.message }, 500, req)
  return json({ data }, 200, req)
}

async function handlePatch(req) {
  const url = new URL(req.url)
  const id = url.searchParams.get("id")
  if (!id) return json({ error: "Missing id parameter" }, 400, req)

  const body = await req.json()
  const updates = { updated_at: new Date().toISOString() }

  if (body.is_approved !== undefined) updates.is_approved = body.is_approved
  if (body.role !== undefined) updates.role = body.role

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .update(updates)
    .eq("id", id)
    .select("id, email, is_approved, role")
    .single()

  if (error) return json({ error: error.message }, 500, req)
  if (!data) return json({ error: "User not found" }, 404, req)
  return json({ data }, 200, req)
}

export default async function handler(req) {
  const corsRes = handleCors(req)
  if (corsRes) return corsRes

  const { error } = await requireAdmin(req)
  if (error) return error

  switch (req.method) {
    case "GET": return handleGet(req)
    case "PATCH": return handlePatch(req)
    default: return json({ error: "Method not allowed" }, 405, req)
  }
}
