// src/utils/exportActionsExcel.js
import ExcelJS from "exceljs"
import { ACTION_STATUSES, ACTION_PRIORITIES, ACTION_CHANNELS } from "../data/actions-config"

const FONT_NAME = "Arial"
const PURPLE = "8B5CF6"
const GREY_BG = "F2F2F2"
const BODY_TEXT = "1A1A2E"
const WHITE = "FFFFFF"

function solidFill(hex) {
  return { type: "pattern", pattern: "solid", fgColor: { argb: `FF${hex}` } }
}

function font(opts = {}) {
  return {
    name: FONT_NAME,
    size: opts.size || 10,
    bold: !!opts.bold,
    italic: !!opts.italic,
    color: { argb: `FF${opts.color || BODY_TEXT}` },
  }
}

function setCell(ws, row, col, value, opts = {}) {
  const cell = ws.getCell(row, col)
  cell.value = value
  if (opts.font) cell.font = font(opts.font)
  if (opts.fill) cell.fill = solidFill(opts.fill)
  if (opts.numFmt) cell.numFmt = opts.numFmt
  if (opts.align) cell.alignment = opts.align
  if (opts.border) cell.border = opts.border
  return cell
}

function thinBorder() {
  const side = { style: "thin", color: { argb: "FFE0E0E0" } }
  return { top: side, bottom: side, left: side, right: side }
}

function applyRowBorder(ws, row, colStart, colEnd) {
  for (let c = colStart; c <= colEnd; c++) {
    ws.getCell(row, c).border = thinBorder()
  }
}

function resolveKRLabels(action, krStatuses) {
  if (!action.kr_ids?.length || !krStatuses) return ""
  return action.kr_ids
    .map((uuid) => {
      const entry = Object.entries(krStatuses).find(([, v]) => v.uuid === uuid)
      return entry ? entry[0] : null
    })
    .filter(Boolean)
    .join(", ")
}

function resolvePhaseName(action, phases) {
  if (!action.phase_id || !phases) return ""
  const phase = phases.find((p) => p.id === action.phase_id)
  return phase?.name || ""
}

function formatDate(dateStr) {
  if (!dateStr) return ""
  try {
    return new Date(dateStr).toLocaleDateString("fr-FR")
  } catch {
    return ""
  }
}

// ── Sheet 1: Actions ──────────────────────────────────────────────────
function buildActionsSheet(workbook, actions, phases, krStatuses, setName) {
  const ws = workbook.addWorksheet("Actions")

  // Title row
  ws.mergeCells(1, 1, 1, 14)
  const titleCell = ws.getCell(1, 1)
  titleCell.value = `${setName || "Action Plan"} — Actions`
  titleCell.font = font({ size: 16, bold: true, color: PURPLE })
  titleCell.alignment = { vertical: "middle" }
  ws.getRow(1).height = 30

  // Header row
  const headers = [
    "Title", "Description", "Channel", "Type", "Status", "Priority",
    "Assignee", "Start Date", "End Date", "Budget Est.", "Budget Actual",
    "Currency", "Phase", "Linked KRs",
  ]

  const headerRow = 3
  headers.forEach((h, i) => {
    setCell(ws, headerRow, i + 1, h, {
      font: { size: 10, bold: true, color: WHITE },
      fill: PURPLE,
      border: thinBorder(),
      align: { vertical: "middle", horizontal: "center", wrapText: true },
    })
  })
  ws.getRow(headerRow).height = 24

  // Data rows
  let r = headerRow + 1
  actions.forEach((action) => {
    const channelLabel = ACTION_CHANNELS[action.channel]?.label || action.channel || ""
    const statusLabel = ACTION_STATUSES[action.status]?.label || action.status || ""
    const priorityLabel = ACTION_PRIORITIES[action.priority]?.label || action.priority || ""
    const phaseName = resolvePhaseName(action, phases)
    const krsText = resolveKRLabels(action, krStatuses)

    const values = [
      action.title || "",
      action.description || "",
      channelLabel,
      action.action_type || "",
      statusLabel,
      priorityLabel,
      action.assignee || "",
      formatDate(action.start_date),
      formatDate(action.end_date),
      action.budget_estimated != null ? Number(action.budget_estimated) : "",
      action.budget_actual != null ? Number(action.budget_actual) : "",
      action.currency || "EUR",
      phaseName,
      krsText,
    ]

    values.forEach((val, i) => {
      const isNum = i === 9 || i === 10
      setCell(ws, r, i + 1, val, {
        font: { size: 10 },
        border: thinBorder(),
        align: { vertical: "middle", wrapText: i <= 1 },
        numFmt: isNum && typeof val === "number" ? "#,##0" : undefined,
      })
    })

    // Color-code status cell (col 5)
    const statusHex = ACTION_STATUSES[action.status]?.colorHex?.replace("#", "")
    if (statusHex) {
      ws.getCell(r, 5).font = font({ size: 10, bold: true, color: statusHex })
    }

    // Color-code priority cell (col 6)
    const prioHex = ACTION_PRIORITIES[action.priority]?.colorHex?.replace("#", "")
    if (prioHex) {
      ws.getCell(r, 6).font = font({ size: 10, bold: true, color: prioHex })
    }

    // Color-code channel cell (col 3)
    const channelHex = ACTION_CHANNELS[action.channel]?.colorHex?.replace("#", "")
    if (channelHex) {
      ws.getCell(r, 3).font = font({ size: 10, color: channelHex })
    }

    // Alternate row coloring
    if (r % 2 === 0) {
      for (let c = 1; c <= 14; c++) {
        ws.getCell(r, c).fill = solidFill(GREY_BG)
      }
    }

    r++
  })

  // Column widths
  const widths = [30, 40, 14, 14, 14, 12, 16, 14, 14, 14, 14, 10, 22, 30]
  widths.forEach((w, i) => {
    ws.getColumn(i + 1).width = w
  })

  // Auto-filter on header row
  ws.autoFilter = { from: { row: headerRow, column: 1 }, to: { row: headerRow, column: 14 } }

  // Freeze header
  ws.views = [{ state: "frozen", ySplit: headerRow }]

  return ws
}

// ── Sheet 2: Summary ──────────────────────────────────────────────────
function buildSummarySheet(workbook, actions, phases, setName) {
  const ws = workbook.addWorksheet("Summary")

  // Title
  ws.mergeCells(1, 1, 1, 4)
  const titleCell = ws.getCell(1, 1)
  titleCell.value = `${setName || "Action Plan"} — Summary`
  titleCell.font = font({ size: 16, bold: true, color: PURPLE })
  ws.getRow(1).height = 30

  let r = 3

  // Section: By Status
  setCell(ws, r, 1, "By Status", { font: { size: 12, bold: true, color: PURPLE } })
  r++
  setCell(ws, r, 1, "Status", { font: { size: 10, bold: true, color: WHITE }, fill: PURPLE, border: thinBorder() })
  setCell(ws, r, 2, "Count", { font: { size: 10, bold: true, color: WHITE }, fill: PURPLE, border: thinBorder() })
  r++

  Object.entries(ACTION_STATUSES).forEach(([key, cfg]) => {
    const count = actions.filter((a) => a.status === key).length
    const hex = cfg.colorHex?.replace("#", "")
    setCell(ws, r, 1, cfg.label, { font: { size: 10, bold: true, color: hex }, border: thinBorder() })
    setCell(ws, r, 2, count, { font: { size: 10, bold: true }, border: thinBorder() })
    r++
  })

  r += 2

  // Section: By Channel
  setCell(ws, r, 1, "By Channel", { font: { size: 12, bold: true, color: PURPLE } })
  r++
  setCell(ws, r, 1, "Channel", { font: { size: 10, bold: true, color: WHITE }, fill: PURPLE, border: thinBorder() })
  setCell(ws, r, 2, "Count", { font: { size: 10, bold: true, color: WHITE }, fill: PURPLE, border: thinBorder() })
  r++

  Object.entries(ACTION_CHANNELS).forEach(([key, cfg]) => {
    const count = actions.filter((a) => a.channel === key).length
    if (count === 0) return
    setCell(ws, r, 1, cfg.label, { font: { size: 10 }, border: thinBorder() })
    setCell(ws, r, 2, count, { font: { size: 10, bold: true }, border: thinBorder() })
    r++
  })

  r += 2

  // Section: By Phase
  setCell(ws, r, 1, "By Phase", { font: { size: 12, bold: true, color: PURPLE } })
  r++
  setCell(ws, r, 1, "Phase", { font: { size: 10, bold: true, color: WHITE }, fill: PURPLE, border: thinBorder() })
  setCell(ws, r, 2, "Count", { font: { size: 10, bold: true, color: WHITE }, fill: PURPLE, border: thinBorder() })
  r++

  const sortedPhases = [...(phases || [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
  sortedPhases.forEach((phase) => {
    const count = actions.filter((a) => a.phase_id === phase.id).length
    if (count === 0) return
    setCell(ws, r, 1, phase.name, { font: { size: 10 }, border: thinBorder() })
    setCell(ws, r, 2, count, { font: { size: 10, bold: true }, border: thinBorder() })
    r++
  })

  r += 2

  // Section: Budget
  setCell(ws, r, 1, "Budget", { font: { size: 12, bold: true, color: PURPLE } })
  r++
  const totalEstimated = actions.reduce((sum, a) => sum + (Number(a.budget_estimated) || 0), 0)
  const totalActual = actions.reduce((sum, a) => sum + (Number(a.budget_actual) || 0), 0)

  setCell(ws, r, 1, "Total Estimated", { font: { size: 10 }, border: thinBorder() })
  setCell(ws, r, 2, totalEstimated, { font: { size: 10, bold: true }, border: thinBorder(), numFmt: "#,##0" })
  r++
  setCell(ws, r, 1, "Total Actual", { font: { size: 10 }, border: thinBorder() })
  setCell(ws, r, 2, totalActual, { font: { size: 10, bold: true }, border: thinBorder(), numFmt: "#,##0" })

  // Column widths
  ws.getColumn(1).width = 24
  ws.getColumn(2).width = 16

  return ws
}

// ── Main export function ──────────────────────────────────────────────
export async function generateActionsExcel({ actions, phases, krStatuses, setName }) {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = "OKR Builder"
  workbook.created = new Date()

  buildActionsSheet(workbook, actions, phases, krStatuses, setName)
  buildSummarySheet(workbook, actions, phases, setName)

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${(setName || "ActionPlan").replace(/[^a-zA-Z0-9_-]/g, "_")}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}
