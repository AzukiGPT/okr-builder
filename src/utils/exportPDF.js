import jsPDF from "jspdf"
import { OBJECTIVES } from "../data/objectives"
import { TEAM_CONFIG } from "../data/config"

const TEAMS = ["sales", "marketing", "csm"]
const MARGIN = 20
const A4_WIDTH = 210
const A4_HEIGHT = 297
const CONTENT_WIDTH = A4_WIDTH - 2 * MARGIN

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
  doc.text(ctx.company || "OKR System", MARGIN, y + 8)
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
    { label: "Revenue target", val: calc.funnelTargets.revenue },
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

function drawTeamSection(doc, team, selected, calc, customTargets) {
  const tc = TEAM_CONFIG[team]
  const selObjs = OBJECTIVES[team].filter((o) => selected[team].includes(o.id))
  if (selObjs.length === 0) return

  doc.addPage()
  let y = MARGIN

  doc.setFillColor(tc.colorHex)
  doc.rect(MARGIN, y, CONTENT_WIDTH, 10, "F")
  doc.setFont("helvetica", "bold")
  doc.setFontSize(14)
  doc.setTextColor("#FFFFFF")
  doc.text(tc.label, MARGIN + 4, y + 7)
  y += 16

  selObjs.forEach((obj) => {
    y = checkPage(doc, y, 30)

    doc.setFont("helvetica", "bold")
    doc.setFontSize(11)
    doc.setTextColor(tc.colorHex)
    doc.text(obj.id, MARGIN, y)
    doc.setTextColor("#1A1A2E")
    const titleLines = doc.splitTextToSize(`\u2014 ${obj.title}`, CONTENT_WIDTH - 15)
    doc.text(titleLines, MARGIN + 12, y)
    y += titleLines.length * 5 + 4

    doc.setFontSize(8)
    doc.setTextColor("#888888")
    doc.text("#", MARGIN, y)
    doc.text("Key Result", MARGIN + 8, y)
    doc.text("Target", MARGIN + CONTENT_WIDTH - 55, y)
    doc.text("Type", MARGIN + CONTENT_WIDTH - 15, y)
    y += 2
    doc.setDrawColor("#E8E8E8")
    doc.line(MARGIN, y, MARGIN + CONTENT_WIDTH, y)
    y += 4

    obj.krs.forEach((kr, ki) => {
      y = checkPage(doc, y, 10)
      const target =
        customTargets[kr.id] ??
        (kr.funnel ? calc.funnelTargets[kr.funnel] : "\u2192 set")

      doc.setFontSize(9)
      doc.setFont("helvetica", "normal")
      doc.setTextColor("#1A1A2E")
      doc.text(String(ki + 1), MARGIN, y)
      const krLines = doc.splitTextToSize(kr.text, CONTENT_WIDTH - 75)
      doc.text(krLines, MARGIN + 8, y)
      doc.setTextColor(tc.colorHex)
      doc.text(target, MARGIN + CONTENT_WIDTH - 55, y)
      doc.setTextColor(kr.type === "Leading" ? "#22C55E" : "#3B82F6")
      doc.text(kr.type, MARGIN + CONTENT_WIDTH - 15, y)
      y += krLines.length * 4 + 3
    })

    y += 6
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

  const funnelRows = [
    {
      label: "Deals to close",
      annual: calc.deals,
      weekly: calc.weekly.deals,
      cadence: `${calc.daily.deals}/day`,
    },
    {
      label: "Proposals to send",
      annual: calc.proposals,
      weekly: calc.weekly.proposals,
      cadence: `${calc.daily.proposals}/day`,
    },
    {
      label: "Demos to run",
      annual: calc.demos,
      weekly: calc.weekly.demos,
      cadence: `${calc.daily.demos}/day`,
    },
    {
      label: "Qualification meetings",
      annual: calc.meetings,
      weekly: calc.weekly.meetings,
      cadence: `${calc.daily.meetings}/day`,
    },
    {
      label: "Outbound calls",
      annual: calc.calls,
      weekly: calc.weekly.calls,
      cadence: `${calc.daily.calls}/day`,
    },
    {
      label: "MQLs",
      annual: calc.mqls,
      weekly: "-",
      cadence: `${calc.monthly.mqls}/month`,
    },
  ]

  doc.setFontSize(9)
  doc.setTextColor("#888888")
  doc.text("Metric", MARGIN, y)
  doc.text("Annual", MARGIN + 70, y)
  doc.text("Weekly", MARGIN + 100, y)
  doc.text("Cadence", MARGIN + 130, y)
  y += 2
  doc.setDrawColor("#E8E8E8")
  doc.line(MARGIN, y, MARGIN + CONTENT_WIDTH, y)
  y += 5

  funnelRows.forEach((row) => {
    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    doc.setTextColor("#1A1A2E")
    doc.text(row.label, MARGIN, y)
    doc.setFont("helvetica", "bold")
    doc.text(String(row.annual), MARGIN + 70, y)
    doc.setFont("helvetica", "normal")
    doc.text(String(row.weekly), MARGIN + 100, y)
    doc.text(row.cadence, MARGIN + 130, y)
    y += 7
  })
}

export function generatePDF({ ctx, selected, calc, customTargets }) {
  const doc = createDoc()

  drawTitlePage(doc, ctx, calc)

  TEAMS.forEach((team) => {
    drawTeamSection(doc, team, selected, calc, customTargets)
  })

  drawFunnelPage(doc, calc)

  doc.save(`${ctx.company || "OKR"}-System.pdf`)
}
