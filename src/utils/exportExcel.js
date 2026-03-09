import ExcelJS from "exceljs"
import { OBJECTIVES } from "../data/objectives"
import { TEAM_CONFIG } from "../data/config"

const TEAMS = ["sales", "marketing", "csm"]

const TEAM_COLORS = {
  sales: { hex: "3B82F6", label: "Sales" },
  marketing: { hex: "EF4444", label: "Marketing" },
  csm: { hex: "22C55E", label: "Customer Success" },
}

const FUNNEL_ROWS = [
  { row: 1, label: "Revenue target", key: "target" },
  { row: 2, label: "ACV", key: "acv" },
  { row: 3, label: "Win rate %", key: "winRate" },
  { row: 4, label: "Demo→Proposal %", key: "demoToProp" },
  { row: 5, label: "Meeting→Demo %", key: "meetToDemo" },
  { row: 6, label: "Call→Meeting %", key: "callToMeet" },
  { row: 7, label: "Marketing share %", key: "mktShare" },
  { row: 8, label: "Lead→MQL %", key: "l2mql" },
]

const FORMULA_ROWS = [
  { row: 10, label: "Deals needed", formula: "=B1/B2" },
  { row: 11, label: "Proposals", formula: "=B10/(B3/100)" },
  { row: 12, label: "Demos", formula: "=B11/(B4/100)" },
  { row: 13, label: "Meetings", formula: "=B12/(B5/100)" },
  { row: 14, label: "Calls", formula: "=B13/(B6/100)" },
  { row: 15, label: "Mkt Demos", formula: "=B12*(B7/100)" },
  { row: 16, label: "MQLs", formula: "=B15/(B8/100)" },
  { row: 18, label: "Weekly deals", formula: "=B10/46" },
  { row: 19, label: "Weekly demos", formula: "=B12/46" },
  { row: 20, label: "Monthly MQLs", formula: "=B16/12" },
]

// Maps KR funnel key → { cell, prefix, suffix }
const FUNNEL_KR_MAP = {
  revenue: { cell: "B1", prefix: "€", suffix: "k", divide: 1000 },
  deals: { cell: "B10", prefix: "", suffix: " deals" },
  winrate: { cell: "B3", prefix: "≥ ", suffix: "%" },
  demos_annual: { cell: "B12", prefix: "", suffix: " demos/year" },
  meetings_monthly: { cell: null, formula: "='Funnel Math'!B13/12", prefix: "", suffix: " meetings/month" },
  mql_share: { cell: "B7", prefix: "≥ ", suffix: "%" },
  mqls: { cell: "B16", prefix: "", suffix: " MQLs/year" },
}

function applyHeaderStyle(row, fillColor) {
  row.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 }
  row.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: `FF${fillColor}` },
  }
  row.alignment = { vertical: "middle" }
}

function buildFunnelSheet(workbook, funnel) {
  const ws = workbook.addWorksheet("Funnel Math", {
    properties: { tabColor: { argb: "FF8B5CF6" } },
  })

  ws.columns = [
    { header: "Metric", key: "label", width: 22 },
    { header: "Value", key: "value", width: 18 },
  ]

  const headerRow = ws.getRow(1)
  headerRow.values = ["Metric", "Value"]
  applyHeaderStyle(headerRow, "8B5CF6")

  FUNNEL_ROWS.forEach(({ row, label, key }) => {
    const r = ws.getRow(row + 1)
    r.getCell(1).value = label
    r.getCell(2).value = funnel[key]
    r.getCell(1).font = { size: 10 }
    r.getCell(2).font = { bold: true, size: 10 }
    r.getCell(2).numFmt = key === "target" ? "#,##0" : "0"
  })

  const blankRow = ws.getRow(10)
  blankRow.getCell(1).value = ""

  FORMULA_ROWS.forEach(({ row, label, formula }) => {
    const r = ws.getRow(row + 1)
    const adjustedFormula = formula.replace(/B(\d+)/g, (_, n) => `B${Number(n) + 1}`)
    r.getCell(1).value = label
    r.getCell(1).font = { bold: true, size: 10, color: { argb: "FF8B5CF6" } }
    r.getCell(2).value = { formula: adjustedFormula }
    r.getCell(2).font = { bold: true, size: 10 }
    r.getCell(2).numFmt = "#,##0"
  })

  return ws
}

function resolveTarget(kr, customTargets, calc) {
  if (customTargets[kr.id] != null && customTargets[kr.id] !== "") {
    return { value: customTargets[kr.id], isFormula: false }
  }

  if (kr.funnel) {
    const mapping = FUNNEL_KR_MAP[kr.funnel]
    if (mapping) {
      if (mapping.cell) {
        const excelRow = FUNNEL_ROWS.find((f) => `B${f.row}` === mapping.cell)
          || FORMULA_ROWS.find((f) => `B${f.row}` === mapping.cell)
        if (excelRow) {
          const sheetRow = excelRow.row + 1
          return {
            value: { formula: `='Funnel Math'!B${sheetRow}` },
            isFormula: true,
            prefix: mapping.prefix,
            suffix: mapping.suffix,
          }
        }
      }
      if (mapping.formula) {
        const adjustedFormula = mapping.formula.replace(
          /!'B(\d+)/g,
          (_, n) => `!'B${Number(n) + 1}`
        )
        return {
          value: { formula: adjustedFormula },
          isFormula: true,
          prefix: mapping.prefix,
          suffix: mapping.suffix,
        }
      }
    }
    return { value: calc.funnelTargets[kr.funnel] || "→ set target", isFormula: false }
  }

  return { value: "→ set target", isFormula: false }
}

function buildOKRSheet(workbook, selected, customTargets, calc) {
  const ws = workbook.addWorksheet("OKRs", {
    properties: { tabColor: { argb: "FF3B82F6" } },
  })

  ws.columns = [
    { header: "Team", key: "team", width: 16 },
    { header: "Obj ID", key: "objId", width: 8 },
    { header: "Objective", key: "objective", width: 40 },
    { header: "KR ID", key: "krId", width: 8 },
    { header: "Key Result", key: "keyResult", width: 50 },
    { header: "Target", key: "target", width: 24 },
    { header: "Type", key: "type", width: 10 },
  ]

  const headerRow = ws.getRow(1)
  applyHeaderStyle(headerRow, "1E293B")

  let rowIndex = 2

  TEAMS.forEach((team) => {
    if (selected[team].length === 0) return

    const cfg = TEAM_COLORS[team]
    const objectives = OBJECTIVES[team]
    const selectedObjs = objectives.filter((obj) => selected[team].includes(obj.id))

    selectedObjs.forEach((obj) => {
      obj.krs.forEach((kr, ki) => {
        const row = ws.getRow(rowIndex)
        const resolved = resolveTarget(kr, customTargets, calc)

        row.getCell(1).value = cfg.label
        row.getCell(2).value = obj.id
        row.getCell(3).value = obj.title
        row.getCell(4).value = kr.id
        row.getCell(5).value = kr.text
        row.getCell(6).value = resolved.isFormula ? resolved.value : resolved.value
        row.getCell(7).value = kr.type

        if (ki === 0) {
          row.getCell(1).font = { bold: true, color: { argb: `FF${cfg.hex}` }, size: 10 }
          row.getCell(2).font = { bold: true, color: { argb: `FF${cfg.hex}` }, size: 10 }
          row.getCell(3).font = { bold: true, size: 10 }
        } else {
          row.getCell(1).font = { size: 10, color: { argb: "FF888888" } }
          row.getCell(2).font = { size: 10, color: { argb: "FF888888" } }
          row.getCell(3).font = { size: 10, color: { argb: "FF888888" } }
        }

        row.getCell(4).font = { size: 10, color: { argb: `FF${cfg.hex}` } }
        row.getCell(5).font = { size: 10 }
        row.getCell(6).font = { bold: true, size: 10, color: { argb: `FF${cfg.hex}` } }
        row.getCell(7).font = {
          size: 10,
          color: { argb: kr.type === "Leading" ? "FF22C55E" : "FF3B82F6" },
        }

        rowIndex++
      })
    })
  })

  return ws
}

function buildSummarySheet(workbook, ctx, selected, funnel) {
  const ws = workbook.addWorksheet("Summary", {
    properties: { tabColor: { argb: "FF22C55E" } },
  })

  ws.columns = [
    { header: "Label", key: "label", width: 22 },
    { header: "Value", key: "value", width: 30 },
  ]

  const headerRow = ws.getRow(1)
  applyHeaderStyle(headerRow, "1E293B")

  const totalSelected = TEAMS.reduce((sum, t) => sum + selected[t].length, 0)

  const rows = [
    { label: "Company", value: ctx.company || "—" },
    { label: "Stage", value: ctx.stage || "—" },
    { label: "Bottleneck", value: ctx.bottleneck || "—" },
    { label: "Current ARR", value: ctx.arr || "—" },
    { label: "Win rate", value: ctx.winRate || "—" },
    { label: "Annual churn", value: ctx.churn || "—" },
    { label: "Founder-led sales?", value: ctx.founderLed || "—" },
    { label: "", value: "" },
    { label: "Revenue target", value: { formula: "='Funnel Math'!B2" } },
    { label: "Deals needed", value: { formula: "='Funnel Math'!B11" } },
    { label: "Demos needed", value: { formula: "='Funnel Math'!B13" } },
    { label: "MQL target", value: { formula: "='Funnel Math'!B17" } },
    { label: "", value: "" },
    { label: "Objectives selected", value: totalSelected },
    { label: "Sales objectives", value: selected.sales.length },
    { label: "Marketing objectives", value: selected.marketing.length },
    { label: "CSM objectives", value: selected.csm.length },
  ]

  rows.forEach((item, i) => {
    const row = ws.getRow(i + 2)
    row.getCell(1).value = item.label
    row.getCell(1).font = { size: 10, color: { argb: "FF888888" } }
    row.getCell(2).value = item.value
    row.getCell(2).font = { bold: true, size: 10 }
    if (typeof item.value === "object" && item.value.formula) {
      row.getCell(2).numFmt = "#,##0"
    }
  })

  return ws
}

export async function generateExcel({ ctx, selected, funnel, calc, customTargets }) {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = "OKR Builder"
  workbook.created = new Date()

  buildFunnelSheet(workbook, funnel)
  buildOKRSheet(workbook, selected, customTargets, calc)
  buildSummarySheet(workbook, ctx, selected, funnel)

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${ctx.company || "OKR"}-System.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}
