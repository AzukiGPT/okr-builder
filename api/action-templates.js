import { supabaseAdmin } from "./_lib/supabase-admin.js"
import { corsHeaders, handleCors } from "./_lib/cors.js"

export const config = { runtime: "edge" }

function json(data, statusCode = 200, req) {
  return new Response(JSON.stringify(data), {
    status: statusCode,
    headers: { "Content-Type": "application/json", ...corsHeaders(req) },
  })
}

export default async function handler(req) {
  const corsRes = handleCors(req)
  if (corsRes) return corsRes

  if (req.method !== "GET") {
    return json({ error: "Method not allowed" }, 405, req)
  }

  const url = new URL(req.url)
  const objectiveIdsParam = url.searchParams.get("objective_ids")

  let query = supabaseAdmin
    .from("action_templates")
    .select("*")
    .eq("is_active", true)
    .order("title")

  // Filter by relevant_objectives overlap if provided
  if (objectiveIdsParam) {
    const objectiveIds = objectiveIdsParam.split(",").map((id) => id.trim())
    query = query.overlaps("relevant_objectives", objectiveIds)
  }

  const { data, error } = await query

  if (error) return json({ error: error.message }, 500, req)
  return json({ data: data || [] }, 200, req)
}
