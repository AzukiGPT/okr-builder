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

const STATUS_EMOJI = { todo: "\u2B1C", in_progress: "\uD83D\uDD35", done: "\u2705", cancelled: "\u274C" }
const PRIO_EMOJI = { low: "\u2B07\uFE0F", medium: "\u27A1\uFE0F", high: "\u26A0\uFE0F", critical: "\uD83D\uDD34" }

function buildProgressBar(pct) {
  const filled = Math.round(pct / 10)
  return "\u2588".repeat(filled) + "\u2591".repeat(10 - filled)
}

export function generateActionsMarkdown({ actions, phases, krStatuses, setName }) {
  const total = actions.length
  const done = actions.filter((a) => a.status === "done").length
  const inProgress = actions.filter((a) => a.status === "in_progress").length
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  const totalBudget = actions.reduce((sum, a) => sum + (Number(a.budget_estimated) || 0), 0)

  const lines = [
    `# ${setName || "Action Plan"}`,
    "",
    `> ${buildProgressBar(pct)} **${pct}%** complete`,
    ">",
    `> \u2705 ${done} done \u00B7 \uD83D\uDD35 ${inProgress} in progress \u00B7 \u2B1C ${total - done - inProgress} remaining${totalBudget > 0 ? ` \u00B7 \uD83D\uDCB0 ${totalBudget.toLocaleString()} EUR` : ""}`,
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
    const phaseDone = phaseActions.filter((a) => a.status === "done").length
    const phasePct = Math.round((phaseDone / phaseActions.length) * 100)
    lines.push(`## ${phaseName}`)
    lines.push(`*${phaseActions.length} actions \u00B7 ${phasePct}% complete*`)
    lines.push("")
    lines.push("| | Title | Channel | Status | Priority | Dates | KRs |")
    lines.push("|---|-------|---------|--------|----------|-------|-----|")

    phaseActions.forEach((action) => {
      const emoji = STATUS_EMOJI[action.status] || "\u2B1C"
      const channel = ACTION_CHANNELS[action.channel]?.label || action.channel || "-"
      const status = ACTION_STATUSES[action.status]?.label || action.status || "-"
      const prioEmoji = PRIO_EMOJI[action.priority] || ""
      const priority = ACTION_PRIORITIES[action.priority]?.label || action.priority || "-"
      const dates = [formatDate(action.start_date), formatDate(action.end_date)].filter((d) => d !== "-").join(" \u2192 ") || "-"
      const krs = resolveKRLabels(action, krStatuses)

      lines.push(`| ${emoji} | ${action.title || "-"} | ${channel} | ${status} | ${prioEmoji} ${priority} | ${dates} | ${krs} |`)
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
