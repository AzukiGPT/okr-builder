# Export & Share Action Plan — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow users to export their action plan (Step 4) as PDF, Excel, Notion-ready Markdown, or a shareable compressed URL.

**Architecture:** 4 independent utility modules (`exportActionsPDF.js`, `exportActionsExcel.js`, `exportActionsNotion.js`, `shareActionsURL.js`) + 1 toolbar component (`ExportActionsToolbar`). Each follows the exact same patterns as the existing OKR exports. No shared abstraction — each format is different enough (visual layout vs cells vs Markdown vs compression).

**Tech Stack:** jsPDF (PDF), ExcelJS (Excel), lz-string (URL compression), navigator.clipboard (Notion Markdown). All already installed.

---

## Task 1: PDF Export — `src/utils/exportActionsPDF.js`

**Files:**
- Create: `src/utils/exportActionsPDF.js`

**Step 1: Create the PDF export utility**

This follows the exact same jsPDF patterns as `src/utils/exportPDF.js` — same sanitize, createDoc, checkPage helpers, A4 portrait layout.

```javascript
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
  const pct = total > 0 ? Math.round((done / total) * 100) : 0

  const totalBudget = actions.reduce((sum, a) => sum + (Number(a.budget_estimated) || 0), 0)

  doc.setFontSize(11)
  doc.setFont("helvetica", "bold")
  doc.setTextColor("#8B5CF6")
  doc.text("Summary", MARGIN, y)
  y += 7

  const stats = [
    { label: "Total actions", val: String(total) },
    { label: "Completed", val: `${done} (${pct}%)` },
    { label: "Estimated budget", val: totalBudget > 0 ? `${totalBudget.toLocaleString()} EUR` : "-" },
  ]

  doc.setFontSize(10)
  stats.forEach((s) => {
    doc.setFont("helvetica", "normal")
    doc.setTextColor("#888888")
    doc.text(s.label, MARGIN, y)
    doc.setFont("helvetica", "bold")
    doc.setTextColor("#1A1A2E")
    doc.text(s.val, MARGIN + 45, y)
    y += 6
  })

  return y + 4
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

  const statusCfg = ACTION_STATUSES[action.status]
  doc.setTextColor(statusCfg?.colorHex || "#888888")
  doc.setFont("helvetica", "bold")
  doc.text(sanitize(statusCfg?.label || action.status || "-"), COL.status, y)

  const prioCfg = ACTION_PRIORITIES[action.priority]
  doc.setTextColor(prioCfg?.colorHex || "#888888")
  doc.text(sanitize(prioCfg?.label || action.priority || "-"), COL.priority, y)

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
```

**Step 2: Verify file exists and has no syntax errors**

Run: `cd "/Users/tomhalimi/Desktop/OKR Builder" && node -e "try { require('./src/utils/exportActionsPDF.js') } catch(e) { console.log('Module check skipped (ESM):', e.message?.slice(0,50)) }"`

Expected: Either loads or shows ESM import error (which is fine — real check is at build time in Task 6).

**Step 3: Commit**

```bash
git add src/utils/exportActionsPDF.js
git commit -m "feat: add PDF export for action plan (jsPDF, landscape A4, grouped by phase)"
```

---

## Task 2: Excel Export — `src/utils/exportActionsExcel.js`

**Files:**
- Create: `src/utils/exportActionsExcel.js`

**Step 1: Create the Excel export utility**

Follows the same ExcelJS patterns as `src/utils/exportExcel.js` — same solidFill, font, setCell, thinBorder helpers, same download via writeBuffer→Blob→createObjectURL.

```javascript
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
    setCell(ws, r, 1, cfg.label, { font: { size: 10 }, border: thinBorder() })
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
```

**Step 2: Commit**

```bash
git add src/utils/exportActionsExcel.js
git commit -m "feat: add Excel export for action plan (ExcelJS, 2 sheets: Actions + Summary)"
```

---

## Task 3: Notion Markdown Export — `src/utils/exportActionsNotion.js`

**Files:**
- Create: `src/utils/exportActionsNotion.js`

**Step 1: Create the Notion Markdown export utility**

Follows the exact pattern of `src/utils/exportNotion.js` — same `generateMarkdown` + `fallbackCopy` + `async copyToClipboard` structure.

```javascript
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
```

**Step 2: Commit**

```bash
git add src/utils/exportActionsNotion.js
git commit -m "feat: add Notion Markdown export for action plan (clipboard copy with fallback)"
```

---

## Task 4: Shareable URL — `src/utils/shareActionsURL.js`

**Files:**
- Create: `src/utils/shareActionsURL.js`

**Step 1: Create the shareable URL utility**

Follows the same LZString pattern as `src/hooks/useShareableURL.js`. Uses `?actions=<compressed>` query parameter.

```javascript
// src/utils/shareActionsURL.js
import LZString from "lz-string"

export function encodeActionsState({ actions, phases }) {
  const payload = { actions, phases }
  return LZString.compressToEncodedURIComponent(JSON.stringify(payload))
}

export function decodeActionsState(encoded) {
  try {
    const json = LZString.decompressFromEncodedURIComponent(encoded)
    if (!json) return null
    return JSON.parse(json)
  } catch {
    return null
  }
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

export async function shareActionsURL({ actions, phases }) {
  const encoded = encodeActionsState({ actions, phases })
  const url = `${window.location.origin}${window.location.pathname}?actions=${encoded}`
  try {
    await navigator.clipboard.writeText(url)
  } catch {
    fallbackCopy(url)
  }
}
```

**Step 2: Commit**

```bash
git add src/utils/shareActionsURL.js
git commit -m "feat: add shareable URL for action plan (lz-string compressed)"
```

---

## Task 5: ExportActionsToolbar Component — `src/components/ui/export-actions-toolbar.jsx`

**Files:**
- Create: `src/components/ui/export-actions-toolbar.jsx`

**Step 1: Create the toolbar component**

4 buttons (PDF, Excel, Notion, Link) with loading/copied states. Disabled when 0 actions.

```jsx
// src/components/ui/export-actions-toolbar.jsx
import { useState, useCallback } from "react"
import { FileText, FileSpreadsheet, Copy, Link2, Check, Loader2 } from "lucide-react"

const BUTTONS = [
  { key: "pdf", label: "PDF", Icon: FileText, colorClass: "text-violet-600", bgClass: "bg-violet-50 hover:bg-violet-100" },
  { key: "excel", label: "Excel", Icon: FileSpreadsheet, colorClass: "text-emerald-600", bgClass: "bg-emerald-50 hover:bg-emerald-100" },
  { key: "notion", label: "Notion", Icon: Copy, colorClass: "text-gray-600", bgClass: "bg-gray-50 hover:bg-gray-100", hasCopied: true },
  { key: "link", label: "Link", Icon: Link2, colorClass: "text-blue-600", bgClass: "bg-blue-50 hover:bg-blue-100", hasCopied: true },
]

export default function ExportActionsToolbar({
  disabled,
  onExportPDF,
  onExportExcel,
  onCopyNotion,
  onShareLink,
}) {
  const [loading, setLoading] = useState(null)
  const [copied, setCopied] = useState(null)

  const handlers = { pdf: onExportPDF, excel: onExportExcel, notion: onCopyNotion, link: onShareLink }

  const handleClick = useCallback(async (key) => {
    const handler = handlers[key]
    if (!handler) return
    setLoading(key)
    try {
      await handler()
      const btn = BUTTONS.find((b) => b.key === key)
      if (btn?.hasCopied) {
        setCopied(key)
        setTimeout(() => setCopied(null), 2000)
      }
    } catch (err) {
      console.error(`Export ${key} failed:`, err)
    } finally {
      setLoading(null)
    }
  }, [onExportPDF, onExportExcel, onCopyNotion, onShareLink])

  return (
    <div className="flex items-center gap-1.5">
      {BUTTONS.map(({ key, label, Icon, colorClass, bgClass, hasCopied }) => {
        const isLoading = loading === key
        const isCopied = copied === key
        const ActiveIcon = isCopied ? Check : isLoading ? Loader2 : Icon

        return (
          <button
            key={key}
            type="button"
            disabled={disabled || isLoading}
            onClick={() => handleClick(key)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${bgClass}`}
            title={hasCopied && isCopied ? "Copied!" : `Export as ${label}`}
          >
            <ActiveIcon className={`w-3.5 h-3.5 ${isCopied ? "text-emerald-600" : colorClass} ${isLoading ? "animate-spin" : ""}`} />
            <span className={isCopied ? "text-emerald-600" : ""}>
              {isCopied ? "Copied!" : label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/ui/export-actions-toolbar.jsx
git commit -m "feat: add ExportActionsToolbar component (PDF, Excel, Notion, Link buttons)"
```

---

## Task 6: Wire Everything Together — ActionsStep + App.jsx

**Files:**
- Modify: `src/components/steps/ActionsStep.jsx`
- Modify: `src/App.jsx`

**Step 1: Add ExportActionsToolbar to ActionsStep**

In `src/components/steps/ActionsStep.jsx`:

1. Add import for ExportActionsToolbar
2. Add new props: `onExportPDF`, `onExportExcel`, `onCopyNotion`, `onShareLink`, `notionCopied`, `linkShared`
3. Place the toolbar in the header, right-aligned next to the existing `ActionsViewToolbar`

```jsx
// At the top, add import:
import ExportActionsToolbar from "../ui/export-actions-toolbar"

// Add new props to destructuring:
export default function ActionsStep({
  selected,
  actions,
  actionsLoading,
  krStatuses,
  activeSetId,
  templates,
  phases,
  ensureDefaultPhases,
  dependencies,
  onCreateDependency,
  onDeleteDependency,
  onCreateAction,
  onBatchCreateActions,
  onUpdateAction,
  onDeleteAction,
  onBack,
  onBackToSets,
  onExportPDF,
  onExportExcel,
  onCopyNotion,
  onShareLink,
}) {
```

After the progress summary section (line ~183), before the `{/* Toolbar */}` comment, add the export toolbar:

```jsx
      {/* Export + View Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <ActionsViewToolbar
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          groupBy={groupBy}
          onGroupByChange={setGroupBy}
          onAddAction={handleAddAction}
        />
        <ExportActionsToolbar
          disabled={totalActions === 0}
          onExportPDF={onExportPDF}
          onExportExcel={onExportExcel}
          onCopyNotion={onCopyNotion}
          onShareLink={onShareLink}
        />
      </div>
```

Remove the old standalone `<ActionsViewToolbar>` render (lines 186-192).

**Step 2: Wire export callbacks in App.jsx**

In `src/App.jsx`:

1. Add imports for the 4 new utilities:

```javascript
import { generateActionsPDF } from "./utils/exportActionsPDF"
import { generateActionsExcel } from "./utils/exportActionsExcel"
import { copyActionsMarkdown } from "./utils/exportActionsNotion"
import { shareActionsURL } from "./utils/shareActionsURL"
```

2. Derive the set name (needed for filenames/titles):

After `const { dependencies, createDependency, deleteDependency } = useDependencies(activeSetId)` (line 41), add:

```javascript
const activeSetName = sets.find((s) => s.id === activeSetId)?.name || "Action Plan"
```

3. Pass export props to `<ActionsStep>` (inside the `state.step === 4` block, around line 181-199):

```jsx
      {state.step === 4 && (
        <ActionsStep
          selected={state.selected}
          actions={actions}
          actionsLoading={actionsLoading}
          krStatuses={krStatuses}
          activeSetId={activeSetId}
          templates={templates}
          phases={phases}
          ensureDefaultPhases={ensureDefaultPhases}
          onCreateAction={createAction}
          onBatchCreateActions={batchCreateActions}
          onUpdateAction={updateAction}
          dependencies={dependencies}
          onCreateDependency={createDependency}
          onDeleteDependency={deleteDependency}
          onDeleteAction={deleteAction}
          onBack={() => setStep(3)}
          onBackToSets={handleBackToSets}
          onExportPDF={() => generateActionsPDF({
            actions,
            phases,
            krStatuses,
            setName: activeSetName,
          })}
          onExportExcel={() => generateActionsExcel({
            actions,
            phases,
            krStatuses,
            setName: activeSetName,
          })}
          onCopyNotion={() => copyActionsMarkdown({
            actions,
            phases,
            krStatuses,
            setName: activeSetName,
          })}
          onShareLink={() => shareActionsURL({ actions, phases })}
        />
      )}
```

**Step 3: Commit**

```bash
git add src/components/steps/ActionsStep.jsx src/App.jsx
git commit -m "feat: wire export/share toolbar into ActionsStep and App.jsx"
```

---

## Task 7: Build, Deploy & Verify

**Files:**
- No new files

**Step 1: Run the build**

Run: `cd "/Users/tomhalimi/Desktop/OKR Builder" && npm run build`

Expected: Build succeeds with 0 errors.

**Step 2: Fix any build errors**

If build fails, fix the specific issues and re-run.

**Step 3: Deploy**

Run: `cd "/Users/tomhalimi/Desktop/OKR Builder" && npx vercel --prod`

Expected: Deployment succeeds and returns a URL.

**Step 4: Manual verification checklist**

1. Open the deployed app, navigate to Step 4 (Actions)
2. Verify export toolbar appears (4 buttons: PDF, Excel, Notion, Link)
3. Verify buttons are disabled when 0 actions
4. Click PDF — downloads a `.pdf` file with actions grouped by phase
5. Click Excel — downloads an `.xlsx` file with 2 sheets (Actions + Summary)
6. Click Notion — copies Markdown to clipboard, button shows "Copied!" for 2s
7. Click Link — copies compressed URL to clipboard, button shows "Copied!" for 2s
8. Verify the compressed URL loads correctly when pasted in browser (future: hydrate read-only mode)

**Step 5: Final commit (if any fixes)**

```bash
git add -A
git commit -m "fix: post-build fixes for export actions feature"
```

---

## Summary

| Task | File | What |
|------|------|------|
| 1 | `src/utils/exportActionsPDF.js` | PDF export (jsPDF, landscape A4, phase groups) |
| 2 | `src/utils/exportActionsExcel.js` | Excel export (ExcelJS, 2 sheets) |
| 3 | `src/utils/exportActionsNotion.js` | Notion Markdown clipboard copy |
| 4 | `src/utils/shareActionsURL.js` | Compressed URL sharing (lz-string) |
| 5 | `src/components/ui/export-actions-toolbar.jsx` | Toolbar UI (4 buttons, loading/copied states) |
| 6 | `ActionsStep.jsx` + `App.jsx` | Wire everything together |
| 7 | — | Build, deploy, verify |

**Total: 5 new files, 2 modified files**
