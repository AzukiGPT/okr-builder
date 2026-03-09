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

export default async function handler(req) {
  const corsRes = handleCors(req)
  if (corsRes) return corsRes

  const user = await getUser(req)
  if (!user) return json({ error: "Unauthorized" }, 401, req)

  if (req.method === "GET") {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("id, email, full_name, company, plan, role, is_approved, created_at")
      .eq("id", user.id)
      .single()

    if (error) return json({ error: error.message }, 500, req)
    return json({ data }, 200, req)
  }

  if (req.method === "PATCH") {
    const body = await req.json()
    const updates = { updated_at: new Date().toISOString() }
    if (body.full_name !== undefined) updates.full_name = body.full_name
    if (body.company !== undefined) updates.company = body.company

    const { data, error } = await supabaseAdmin
      .from("profiles")
      .update(updates)
      .eq("id", user.id)
      .select("id, email, full_name, company, plan, role, is_approved")
      .single()

    if (error) return json({ error: error.message }, 500, req)
    return json({ data }, 200, req)
  }

  return json({ error: "Method not allowed" }, 405, req)
}
