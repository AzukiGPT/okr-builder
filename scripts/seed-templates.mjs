import { createClient } from "@supabase/supabase-js"
import { readFileSync } from "fs"

const SUPABASE_URL = "https://pqruyqbsfoeylwrkuqsn.supabase.co"
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_KEY) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY env var")
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  db: { schema: "public" },
  global: { headers: { "x-schema-cache-bust": Date.now().toString() } },
})

// Read SQL and extract INSERT values
const sql = readFileSync("supabase/migrations/20260311_kr_action_templates.sql", "utf-8")

// Parse each INSERT row from the SQL
const rows = []
const regex = /\('([^']*)',\s*'([^']*)',\s*'([^']*)',\s*'([^']*)',\s*'\{([^}]*)\}',\s*'\{([^}]*)\}',\s*'([^']*)',\s*'([^']*)'\)/g

let match
while ((match = regex.exec(sql)) !== null) {
  rows.push({
    title: match[1].replace(/''/g, "'"),
    description: match[2].replace(/''/g, "'"),
    channel: match[3],
    action_type: match[4],
    relevant_objectives: match[5].split(",").map(s => s.replace(/"/g, "").trim()),
    relevant_kr_ids: match[6].split(",").map(s => s.replace(/"/g, "").trim()),
    effort: match[7],
    impact: match[8],
    is_active: true,
  })
}

console.log(`Parsed ${rows.length} templates from SQL`)

// Insert in batches of 50
const BATCH = 50
let inserted = 0

for (let i = 0; i < rows.length; i += BATCH) {
  const batch = rows.slice(i, i + BATCH)
  const { error } = await supabase.from("action_templates").insert(batch)
  if (error) {
    console.error(`Batch ${i / BATCH + 1} error:`, error.message)
    process.exit(1)
  }
  inserted += batch.length
  console.log(`Inserted ${inserted}/${rows.length}`)
}

console.log(`✅ Done — ${inserted} templates seeded`)

// Verify coverage
const { data } = await supabase.from("action_templates").select("relevant_kr_ids")
const krCounts = {}
for (const row of data) {
  for (const kr of row.relevant_kr_ids || []) {
    krCounts[kr] = (krCounts[kr] || 0) + 1
  }
}

const krIds = Object.keys(krCounts).sort()
console.log(`\n📊 Coverage: ${krIds.length} unique KRs referenced`)
const low = Object.entries(krCounts).filter(([, c]) => c < 10).sort((a, b) => a[1] - b[1])
if (low.length > 0) {
  console.log(`⚠️  KRs with < 10 suggestions:`)
  for (const [kr, count] of low.slice(0, 20)) {
    console.log(`   ${kr}: ${count}`)
  }
}
