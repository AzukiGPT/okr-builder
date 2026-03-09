import jsPDF from "jspdf"
import { OBJECTIVES } from "../data/objectives"
import { TEAM_CONFIG } from "../data/config"

const TEAMS = ["sales", "marketing", "csm"]
const MARGIN = 20
const A4_WIDTH = 210
const A4_HEIGHT = 297
const CONTENT_WIDTH = A4_WIDTH - 2 * MARGIN

// Column positions (absolute X from left)
const COL = {
  num: MARGIN,
  kr: MARGIN + 8,
  krWidth: 92,
  target: MARGIN + 104,
  targetWidth: 36,
  type: MARGIN + 144,
  typeWidth: 26,
}

/**
 * jsPDF's built-in Helvetica doesn't have ≥ ≤ → × ≈ glyphs.
 * Replace them with ASCII equivalents so the PDF renders correctly.
 */
function sanitize(str) {
  return String(str)
    .replace(/\u2265/g, ">=")  // ≥
    .replace(/\u2264/g, "<=")  // ≤
    .replace(/\u2192/g, ">")   // →
    .replace(/\u2014/g, "-")   // —
    .replace(/\u00d7/g, "x")   // ×
    .replace(/\u2248/g, "~")   // ≈
    .replace(/\u2019/g, "'")   // '
    .replace(/\u2018/g, "'")   // '
    .replace(/\u201c/g, '"')   // "
    .replace(/\u201d/g, '"')   // "
}

function createDoc() {
  return new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
}

function checkPage(doc, y, needed) {
  if (y + needed > A4_HEIGHT - MARGIN) {
    doc.addPage()
    return MARGIN
  }
  return y
}

function drawTitlePage(doc, ctx, calc) {
  let y = MARGIN

  doc.setFont("helvetica", "bold")
  doc.setFontSize(24)
  doc.setTextColor("#1A1A2E")
  doc.text(sanitize(ctx.company || "OKR System"), MARGIN, y + 8)
  y += 16

  doc.setFontSize(14)
  doc.setFont("helvetica", "normal")
  doc.text("OKR System", MARGIN, y)
  y += 8

  doc.setFontSize(10)
  doc.setTextColor("#888888")
  doc.text(`Generated on ${new Date().toLocaleDateString()}`, MARGIN, y)
  y += 20

  doc.setFontSize(11)
  doc.setFont("helvetica", "bold")
  doc.setTextColor("#8B5CF6")
  doc.text("Summary", MARGIN, y)
  y += 8

  const stats = [
    { label: "Revenue target", val: sanitize(calc.funnelTargets.revenue) },
    { label: "Deals needed", val: String(calc.deals) },
    { label: "Demos needed", val: String(calc.demos) },
    { label: "MQL target", val: String(calc.mqls) },
  ]

  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  stats.forEach((s) => {
    doc.setTextColor("#888888")
    doc.text(s.label, MARGIN, y)
    doc.setTextColor("#1A1A2E")
    doc.setFont("helvetica", "bold")
    doc.text(s.val, MARGIN + 50, y)
    doc.setFont("helvetica", "normal")
    y += 6
  })

  return y
}

function drawTableHeader(doc, y) {
  doc.setFontSize(8)
  doc.setFont("helvetica", "bold")
  doc.setTextColor("#888888")
  doc.text("#", COL.num, y)
  doc.text("Key Result", COL.kr, y)
  doc.text("Target", COL.target, y)
  doc.text("Type", COL.type, y)
  y += 1.5
  doc.setDrawColor("#DDDDDD")
  doc.line(MARGIN, y, MARGIN + CONTENT_WIDTH, y)
  return y + 3
}

function drawKRRow(doc, kr, index, target, teamColor, y) {
  const krText = sanitize(kr.text)
  const targetText = sanitize(target)

  // Wrap KR text within its column width
  doc.setFontSize(8.5)
  doc.setFont("helvetica", "normal")
  const krLines = doc.splitTextToSize(krText, COL.krWidth)
  const targetLines = doc.splitTextToSize(targetText, COL.targetWidth)
  const rowLines = Math.max(krLines.length, targetLines.length)
  const lineHeight = 3.5
  const rowHeight = rowLines * lineHeight + 3

  // Check page break
  y = checkPage(doc, y, rowHeight)

  // Row number
  doc.setTextColor("#888888")
  doc.setFontSize(8.5)
  doc.text(String(index + 1), COL.num, y)

  // KR text
  doc.setTextColor("#1A1A2E")
  doc.setFont("helvetica", "normal")
  krLines.forEach((line, i) => {
    doc.text(line, COL.kr, y + i * lineHeight)
  })

  // Target
  doc.setFont("helvetica", "bold")
  doc.setTextColor(teamColor)
  targetLines.forEach((line, i) => {
    doc.text(line, COL.target, y + i * lineHeight)
  })

  // Type badge
  const isLeading = kr.type === "Leading"
  doc.setFont("helvetica", "normal")
  doc.setTextColor(isLeading ? "#16A34A" : "#2563EB")
  doc.text(kr.type, COL.type, y)

  // Subtle separator
  const bottomY = y + (rowLines - 1) * lineHeight + 2.5
  doc.setDrawColor("#F0F0F0")
  doc.line(COL.kr, bottomY, MARGIN + CONTENT_WIDTH, bottomY)

  return bottomY + 2
}

function drawTeamSection(doc, team, selected, calc, customTargets) {
  const tc = TEAM_CONFIG[team]
  const selObjs = OBJECTIVES[team].filter((o) => selected[team].includes(o.id))
  if (selObjs.length === 0) return

  doc.addPage()
  let y = MARGIN

  // Team banner
  doc.setFillColor(tc.colorHex)
  doc.roundedRect(MARGIN, y, CONTENT_WIDTH, 10, 1.5, 1.5, "F")
  doc.setFont("helvetica", "bold")
  doc.setFontSize(13)
  doc.setTextColor("#FFFFFF")
  doc.text(tc.label, MARGIN + 5, y + 7)
  y += 16

  selObjs.forEach((obj) => {
    // Objective title — check we have room for title + header + 1 row minimum
    y = checkPage(doc, y, 28)

    doc.setFont("helvetica", "bold")
    doc.setFontSize(10.5)
    doc.setTextColor(tc.colorHex)
    doc.text(obj.id, MARGIN, y)

    doc.setTextColor("#1A1A2E")
    const titleLines = doc.splitTextToSize(
      sanitize(`- ${obj.title}`),
      CONTENT_WIDTH - 15
    )
    doc.text(titleLines, MARGIN + 12, y)
    y += titleLines.length * 4.5 + 4

    // Table header
    y = drawTableHeader(doc, y)

    // KR rows
    obj.krs.forEach((kr, ki) => {
      const target =
        customTargets[kr.id] ??
        (kr.funnel ? calc.funnelTargets[kr.funnel] : "not set")

      y = drawKRRow(doc, kr, ki, target, tc.colorHex, y)
    })

    y += 5
  })
}

function drawFunnelPage(doc, calc) {
  doc.addPage()
  let y = MARGIN

  doc.setFont("helvetica", "bold")
  doc.setFontSize(14)
  doc.setTextColor("#8B5CF6")
  doc.text("Funnel Math", MARGIN, y + 7)
  y += 16

  // Column positions for funnel table
  const fCol = {
    metric: MARGIN,
    metricWidth: 60,
    annual: MARGIN + 65,
    weekly: MARGIN + 95,
    cadence: MARGIN + 125,
  }

  // Header
  doc.setFontSize(9)
  doc.setFont("helvetica", "bold")
  doc.setTextColor("#888888")
  doc.text("Metric", fCol.metric, y)
  doc.text("Annual", fCol.annual, y)
  doc.text("Weekly", fCol.weekly, y)
  doc.text("Cadence", fCol.cadence, y)
  y += 2
  doc.setDrawColor("#DDDDDD")
  doc.line(MARGIN, y, MARGIN + CONTENT_WIDTH, y)
  y += 5

  const funnelRows = [
    { label: "Deals to close", annual: calc.deals, weekly: calc.weekly.deals, cadence: `${calc.daily.deals}/day` },
    { label: "Proposals to send", annual: calc.proposals, weekly: calc.weekly.proposals, cadence: `${calc.daily.proposals}/day` },
    { label: "Demos to run", annual: calc.demos, weekly: calc.weekly.demos, cadence: `${calc.daily.demos}/day` },
    { label: "Qualification meetings", annual: calc.meetings, weekly: calc.weekly.meetings, cadence: `${calc.daily.meetings}/day` },
    { label: "Outbound calls", annual: calc.calls, weekly: calc.weekly.calls, cadence: `${calc.daily.calls}/day` },
    { label: "MQLs", annual: calc.mqls, weekly: "-", cadence: `${calc.monthly.mqls}/month` },
  ]

  funnelRows.forEach((row) => {
    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    doc.setTextColor("#1A1A2E")
    doc.text(row.label, fCol.metric, y)
    doc.setFont("helvetica", "bold")
    doc.text(String(row.annual), fCol.annual, y)
    doc.setFont("helvetica", "normal")
    doc.text(String(row.weekly), fCol.weekly, y)
    doc.text(row.cadence, fCol.cadence, y)

    // Row separator
    y += 2
    doc.setDrawColor("#F5F5F5")
    doc.line(MARGIN, y, MARGIN + CONTENT_WIDTH, y)
    y += 5
  })
}

export function generatePDF({ ctx, selected, calc, customTargets }) {
  const doc = createDoc()

  drawTitlePage(doc, ctx, calc)

  TEAMS.forEach((team) => {
    drawTeamSection(doc, team, selected, calc, customTargets)
  })

  drawFunnelPage(doc, calc)

  doc.save(`${sanitize(ctx.company || "OKR")}-System.pdf`)
}
