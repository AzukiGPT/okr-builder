// src/utils/exportActionsPDF.js
import jsPDF from "jspdf"
import { ACTION_STATUSES, ACTION_PRIORITIES, ACTION_CHANNELS } from "../data/actions-config"

const MARGIN = 20
const A4_WIDTH = 210
const A4_HEIGHT = 297
const CONTENT_WIDTH = A4_WIDTH - 2 * MARGIN

/**
 * jsPDF's built-in Helvetica doesn't have ≥ ≤ → × ≈ glyphs.
 * Replace them with ASCII equivalents so the PDF renders correctly.
 */
function sanitize(str) {
  return String(str ?? "")
    .replace(/\u2265/g, ">=")
    .replace(/\u2264/g, "<=")
    .replace(/\u2192/g, ">")
    .replace(/\u2014/g, "-")
    .replace(/\u00d7/g, "x")
    .replace(/\u2248/g, "~")
    .replace(/\u2019/g, "'")
    .replace(/\u2018/g, "'")
    .replace(/\u201c/g, '"')
    .replace(/\u201d/g, '"')
}

function createDoc() {
  return new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" })
}

function checkPage(doc, y, needed) {
  if (y + needed > A4_HEIGHT - MARGIN) {
    doc.addPage()
    return MARGIN
  }
  return y
}

// Column layout for landscape A4 (297mm wide, 257mm content)
const LANDSCAPE_WIDTH = 297
const LANDSCAPE_CONTENT = LANDSCAPE_WIDTH - 2 * MARGIN
const COL = {
  title: MARGIN,
  titleWidth: 60,
  channel: MARGIN + 62,
  channelWidth: 24,
  status: MARGIN + 88,
  statusWidth: 24,
  priority: MARGIN + 114,
  priorityWidth: 20,
  start: MARGIN + 136,
  startWidth: 22,
  end: MARGIN + 160,
  endWidth: 22,
  krs: MARGIN + 184,
  krsWidth: 73,
}

function formatDate(dateStr) {
  if (!dateStr) return "-"
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })
  } catch {
    return "-"
  }
}

function drawHeader(doc, setName) {
  let y = MARGIN

  doc.setFont("helvetica", "bold")
  doc.setFontSize(20)
  doc.setTextColor("#1A1A2E")
  doc.text(sanitize(setName || "Action Plan"), MARGIN, y + 7)
  y += 14

  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")
  doc.setTextColor("#888888")
  doc.text(`Generated on ${new Date().toLocaleDateString()}`, MARGIN, y)
  y += 10

  return y
}

function drawSummaryStats(doc, y, actions) {
  const total = actions.length
  const done = actions.filter((a) => a.status === "done").length
  const inProgress = actions.filter((a) => a.status === "in_progress").length
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  const totalBudget = actions.reduce((sum, a) => sum + (Number(a.budget_estimated) || 0), 0)

  // Summary card background
  const cardH = 26
  doc.setFillColor("#F8F7FF")
  doc.roundedRect(MARGIN, y, LANDSCAPE_CONTENT, cardH, 2, 2, "F")
  doc.setDrawColor("#E9E5FF")
  doc.roundedRect(MARGIN, y, LANDSCAPE_CONTENT, cardH, 2, 2, "S")

  const innerY = y + 6

  // Progress bar
  const barX = MARGIN + 4
  const barWidth = 80
  const barHeight = 4
  doc.setFillColor("#E5E7EB")
  doc.roundedRect(barX, innerY, barWidth, barHeight, 2, 2, "F")
  if (pct > 0) {
    const fillColor = pct >= 80 ? "#22C55E" : pct >= 40 ? "#F59E0B" : "#3B82F6"
    doc.setFillColor(fillColor)
    doc.roundedRect(barX, innerY, Math.max(barWidth * (pct / 100), 4), barHeight, 2, 2, "F")
  }
  doc.setFontSize(10)
  doc.setFont("helvetica", "bold")
  doc.setTextColor("#1A1A2E")
  doc.text(`${pct}%`, barX + barWidth + 4, innerY + 3.5)

  // Status dots
  const badges = [
    { label: `${done} done`, color: "#22C55E" },
    { label: `${inProgress} in progress`, color: "#3B82F6" },
    { label: `${total - done - inProgress} remaining`, color: "#6B7280" },
  ]
  let bx = barX
  const dotY = innerY + barHeight + 5
  doc.setFontSize(7)
  badges.forEach(({ label, color }) => {
    doc.setFillColor(color)
    doc.circle(bx + 1.2, dotY - 0.5, 1.2, "F")
    doc.setFont("helvetica", "normal")
    doc.setTextColor("#4A4A4A")
    doc.text(label, bx + 4, dotY)
    bx += doc.getTextWidth(label) + 10
  })

  // Right: total + budget
  const rightX = LANDSCAPE_WIDTH - MARGIN - 50
  doc.setFontSize(22)
  doc.setFont("helvetica", "bold")
  doc.setTextColor("#8B5CF6")
  doc.text(String(total), rightX, innerY + 5)
  doc.setFontSize(8)
  doc.setFont("helvetica", "normal")
  doc.setTextColor("#888888")
  doc.text("actions", rightX + doc.getTextWidth(String(total)) + 2, innerY + 5, { baseline: "alphabetic" })

  if (totalBudget > 0) {
    doc.setFontSize(8)
    doc.setTextColor("#888888")
    doc.text(`Budget: ${totalBudget.toLocaleString()} EUR`, rightX, innerY + 12)
  }

  return y + cardH + 6
}

function drawTableHeader(doc, y) {
  doc.setFontSize(7.5)
  doc.setFont("helvetica", "bold")
  doc.setTextColor("#888888")
  doc.text("Title", COL.title, y)
  doc.text("Channel", COL.channel, y)
  doc.text("Status", COL.status, y)
  doc.text("Priority", COL.priority, y)
  doc.text("Start", COL.start, y)
  doc.text("End", COL.end, y)
  doc.text("Linked KRs", COL.krs, y)

  y += 1.5
  doc.setDrawColor("#DDDDDD")
  doc.line(MARGIN, y, MARGIN + LANDSCAPE_CONTENT, y)
  return y + 3
}

function resolveKRLabels(action, krStatuses) {
  if (!action.kr_ids?.length || !krStatuses) return "-"
  const labels = action.kr_ids
    .map((uuid) => {
      const entry = Object.entries(krStatuses).find(([, v]) => v.uuid === uuid)
      return entry ? entry[0] : null
    })
    .filter(Boolean)
  return labels.length > 0 ? labels.join(", ") : "-"
}

function drawActionRow(doc, action, krStatuses, y) {
  const lineHeight = 3.5

  const titleLines = doc.splitTextToSize(sanitize(action.title), COL.titleWidth)
  const krsText = resolveKRLabels(action, krStatuses)
  const krsLines = doc.splitTextToSize(sanitize(krsText), COL.krsWidth)
  const rowLines = Math.max(titleLines.length, krsLines.length)
  const rowHeight = rowLines * lineHeight + 3

  y = checkPage(doc, y, rowHeight)

  doc.setFontSize(8)
  doc.setFont("helvetica", "normal")
  doc.setTextColor("#1A1A2E")
  titleLines.forEach((line, i) => {
    doc.text(line, COL.title, y + i * lineHeight)
  })

  const channelLabel = ACTION_CHANNELS[action.channel]?.label || action.channel || "-"
  doc.setTextColor("#4A4A4A")
  doc.text(sanitize(channelLabel), COL.channel, y)

  // Status with color dot
  const statusCfg = ACTION_STATUSES[action.status]
  const statusColor = statusCfg?.colorHex || "#888888"
  doc.setFillColor(statusColor)
  doc.circle(COL.status + 1, y - 0.8, 1, "F")
  doc.setTextColor(statusColor)
  doc.setFont("helvetica", "bold")
  doc.text(sanitize(statusCfg?.label || action.status || "-"), COL.status + 3.5, y)

  // Priority with color dot
  const prioCfg = ACTION_PRIORITIES[action.priority]
  const prioColor = prioCfg?.colorHex || "#888888"
  doc.setFillColor(prioColor)
  doc.circle(COL.priority + 1, y - 0.8, 1, "F")
  doc.setTextColor(prioColor)
  doc.text(sanitize(prioCfg?.label || action.priority || "-"), COL.priority + 3.5, y)

  doc.setFont("helvetica", "normal")
  doc.setTextColor("#4A4A4A")
  doc.text(formatDate(action.start_date), COL.start, y)
  doc.text(formatDate(action.end_date), COL.end, y)

  doc.setTextColor("#1A1A2E")
  krsLines.forEach((line, i) => {
    doc.text(line, COL.krs, y + i * lineHeight)
  })

  const bottomY = y + (rowLines - 1) * lineHeight + 2.5
  doc.setDrawColor("#F0F0F0")
  doc.line(MARGIN, bottomY, MARGIN + LANDSCAPE_CONTENT, bottomY)

  return bottomY + 2
}

function drawPhaseSection(doc, phase, phaseActions, krStatuses, y) {
  y = checkPage(doc, y, 20)

  // Phase banner
  const color = phase?.colorHex || "#8B5CF6"
  doc.setFillColor(color)
  doc.roundedRect(MARGIN, y, LANDSCAPE_CONTENT, 8, 1.5, 1.5, "F")
  doc.setFont("helvetica", "bold")
  doc.setFontSize(10)
  doc.setTextColor("#FFFFFF")
  doc.text(sanitize(phase?.name || "Unassigned"), MARGIN + 4, y + 5.5)

  // Action count badge on right
  const countText = `${phaseActions.length} action${phaseActions.length !== 1 ? "s" : ""}`
  doc.setFontSize(7.5)
  doc.setFont("helvetica", "normal")
  const countWidth = doc.getTextWidth(countText) + 6
  doc.setFillColor("#FFFFFF40")
  doc.roundedRect(MARGIN + LANDSCAPE_CONTENT - countWidth - 4, y + 1.5, countWidth, 5, 2, 2, "F")
  doc.text(countText, MARGIN + LANDSCAPE_CONTENT - countWidth - 1, y + 5)
  y += 12

  y = drawTableHeader(doc, y)

  phaseActions.forEach((action) => {
    y = drawActionRow(doc, action, krStatuses, y)
  })

  return y + 4
}

export function generateActionsPDF({ actions, phases, krStatuses, setName }) {
  const doc = createDoc()

  let y = drawHeader(doc, setName)
  y = drawSummaryStats(doc, y, actions)

  // Group actions by phase
  const phaseMap = new Map()
  const sortedPhases = [...(phases || [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))

  sortedPhases.forEach((p) => phaseMap.set(p.id, { phase: p, actions: [] }))
  phaseMap.set("__unassigned__", { phase: null, actions: [] })

  actions.forEach((action) => {
    const key = action.phase_id && phaseMap.has(action.phase_id) ? action.phase_id : "__unassigned__"
    phaseMap.get(key).actions.push(action)
  })

  for (const [, { phase, actions: phaseActions }] of phaseMap) {
    if (phaseActions.length === 0) continue
    y = drawPhaseSection(doc, phase, phaseActions, krStatuses, y)
  }

  // Footer: page numbers
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setFont("helvetica", "normal")
    doc.setTextColor("#BBBBBB")
    doc.text(`Page ${i} / ${pageCount}`, LANDSCAPE_WIDTH - MARGIN, A4_HEIGHT - 10, { align: "right" })
  }

  doc.save(`${sanitize(setName || "ActionPlan")}.pdf`)
}
