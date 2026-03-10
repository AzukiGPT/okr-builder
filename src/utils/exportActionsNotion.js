// src/utils/exportActionsNotion.js
import { ACTION_STATUSES, ACTION_PRIORITIES, ACTION_CHANNELS } from "../data/actions-config"

function resolveKRLabels(action, krStatuses) {
  if (!action.kr_ids?.length || !krStatuses) return "-"
  return action.kr_ids
    .map((uuid) => {
      const entry = Object.entries(krStatuses).find(([, v]) => v.uuid === uuid)
      return entry ? entry[0] : null
    })
    .filter(Boolean)
    .join(", ") || "-"
}

function formatDate(dateStr) {
  if (!dateStr) return "-"
  try {
    return new Date(dateStr).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })
  } catch {
    return "-"
  }
}

export function generateActionsMarkdown({ actions, phases, krStatuses, setName }) {
  const total = actions.length
  const done = actions.filter((a) => a.status === "done").length
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  const totalBudget = actions.reduce((sum, a) => sum + (Number(a.budget_estimated) || 0), 0)

  const lines = [
    `# ${setName || "Action Plan"}`,
    "",
    `**${total} actions** | ${done} completed (${pct}%)${totalBudget > 0 ? ` | Budget: ${totalBudget.toLocaleString()} EUR` : ""}`,
    "",
    "---",
    "",
  ]

  // Group by phase
  const sortedPhases = [...(phases || [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
  const phaseMap = new Map()
  sortedPhases.forEach((p) => phaseMap.set(p.id, { phase: p, actions: [] }))
  phaseMap.set("__unassigned__", { phase: null, actions: [] })

  actions.forEach((action) => {
    const key = action.phase_id && phaseMap.has(action.phase_id) ? action.phase_id : "__unassigned__"
    phaseMap.get(key).actions.push(action)
  })

  for (const [, { phase, actions: phaseActions }] of phaseMap) {
    if (phaseActions.length === 0) continue

    const phaseName = phase?.name || "Unassigned"
    lines.push(`## ${phaseName}`)
    lines.push("")
    lines.push("| Title | Channel | Status | Priority | Start | End | KRs |")
    lines.push("|-------|---------|--------|----------|-------|-----|-----|")

    phaseActions.forEach((action) => {
      const channel = ACTION_CHANNELS[action.channel]?.label || action.channel || "-"
      const status = ACTION_STATUSES[action.status]?.label || action.status || "-"
      const priority = ACTION_PRIORITIES[action.priority]?.label || action.priority || "-"
      const start = formatDate(action.start_date)
      const end = formatDate(action.end_date)
      const krs = resolveKRLabels(action, krStatuses)

      lines.push(`| ${action.title || "-"} | ${channel} | ${status} | ${priority} | ${start} | ${end} | ${krs} |`)
    })

    lines.push("")
  }

  return lines.join("\n")
}

function fallbackCopy(text) {
  const textarea = document.createElement("textarea")
  textarea.value = text
  textarea.style.position = "fixed"
  textarea.style.opacity = "0"
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand("copy")
  document.body.removeChild(textarea)
}

export async function copyActionsMarkdown({ actions, phases, krStatuses, setName }) {
  const markdown = generateActionsMarkdown({ actions, phases, krStatuses, setName })
  try {
    await navigator.clipboard.writeText(markdown)
  } catch {
    fallbackCopy(markdown)
  }
}
