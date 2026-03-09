const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:4173",
]

export function corsHeaders(req) {
  const origin = req.headers.get("origin") || ""
  const isAllowed = ALLOWED_ORIGINS.includes(origin) || origin.endsWith(".vercel.app")

  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  }
}

export function handleCors(req) {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(req) })
  }
  return null
}
