import ExcelJS from "exceljs"
import { OBJECTIVES } from "../data/objectives"
import { TEAM_CONFIG, TEAMS } from "../data/config"

// ── Design tokens (from Mercator reference) ──────────────────────────
const PURPLE = "4A235A"
const PURPLE_LIGHT = "EDE0F5"
const GREY_BG = "F2F2F2"
const GREY_TEXT = "888888"
const BODY_TEXT = "1A1A2E"
const SECONDARY_TEXT = "4A4A4A"
const WARNING_BG = "FFF3CD"
const WARNING_TEXT = "856404"
const WHITE = "FFFFFF"

const TEAM_STYLES = {
  sales: {
    header: "1B4F8A",
    sub: "D6E4F7",
    alt1: "EBF4FF",
    alt2: "EBFAFF",
    label: "Sales",
    emoji: "\uD83D\uDCC8",
  },
  marketing: {
    header: "C0392B",
    sub: "FDECEA",
    alt1: "FEF5F5",
    alt2: "FFFFFF",
    label: "Marketing",
    emoji: "\uD83D\uDCE3",
  },
  csm: {
    header: "1A7A4A",
    sub: "D4EDDA",
    alt1: "E8F5E9",
    alt2: "FFFFFF",
    label: "Customer Success",
    emoji: "\uD83E\uDD1D",
  },
}

const STEP_COLORS = {
  diagnostic: "8B5CF6",
  selection: "3B82F6",
  funnel: "F59E0B",
  okr: "22C55E",
  coherence: "EF4444",
}

const FONT_NAME = "Arial"

// ── Style helpers ────────────────────────────────────────────────────
function solidFill(hex) {
  return { type: "pattern", pattern: "solid", fgColor: { argb: `FF${hex}` } }
}

function font(opts = {}) {
  return { name: FONT_NAME, size: opts.size || 10, bold: !!opts.bold, italic: !!opts.italic, color: { argb: `FF${opts.color || BODY_TEXT}` } }
}

function mergeAndStyle(ws, row, colStart, colEnd, text, fill, textFont) {
  ws.mergeCells(row, colStart, row, colEnd)
  const cell = ws.getCell(row, colStart)
  cell.value = text
  cell.fill = solidFill(fill)
  cell.font = font(textFont)
  cell.alignment = { vertical: "middle", horizontal: textFont.align || "left", wrapText: !!textFont.wrap }
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

// ── PITFALLS data (from reference _Config) ───────────────────────────
const PITFALLS = {
  S1: "Setting revenue target without funnel math. Numbers become arbitrary.",
  S2: "Hiring AEs before the founder has documented a repeatable process.",
  S3: "Optimizing velocity without ensuring qualification quality.",
  S4: "Focusing on win rate without qualifying properly first.",
  S5: "Diversifying pipeline too early before mastering one channel.",
  S6: "Entering a new market without a beachhead customer.",
  S7: "Moving upmarket without enterprise-ready product or process.",
  S8: "Building a partner program without clear mutual value.",
  S9: "Building SDR team without proven messaging and ICP.",
  S10: "Cutting CAC by reducing investment instead of improving efficiency.",
  S11: "Requiring forecast without giving reps the tools to forecast.",
  S12: "Pushing upsell before proving value to the customer.",
  S13: "Building ROI content without customer-validated data points.",
  S14: "Measuring productivity per head without considering deal complexity.",
  S15: "Treating lighthouse deals as normal sales cycles.",
  S16: "Focusing on late-stage losses without fixing early-stage qualification.",
  M1: "Measuring MQLs without aligning on the definition with Sales.",
  M2: "Publishing content without a keyword or distribution strategy.",
  M3: "Creating a category name nobody searches for.",
  M4: "Launching a report without a distribution plan.",
  M5: "Creating assets Sales never asked for.",
  M6: "Chasing traffic without conversion intent.",
  M7: "Translating campaigns without localizing the message.",
  M8: "Pitching PR without a newsworthy story angle.",
  M9: "Cutting spend across the board instead of cutting underperformers.",
  M10: "Launching without Sales enablement and training.",
  M11: "Building a funnel before defining what qualifies as an MQL.",
  M12: "Creating a community without a clear value proposition for members.",
  M13: "Running ABM without Sales alignment on target account list.",
  M14: "Asking for referrals before delivering measurable value.",
  M15: "Posting content without a personal voice or point of view.",
  M16: "Repositioning without testing messaging with real prospects.",
  M17: "Running webinars without a follow-up nurturing sequence.",
  M18: "Co-marketing without aligning on shared audience and goals.",
  C1: "Measuring NRR without breaking down churn vs. expansion drivers.",
  C2: "Setting churn targets without a health score to predict risk.",
  C3: "Measuring TTV without defining the activation event.",
  C4: "Tracking feature usage without tying it to customer outcomes.",
  C5: "Pushing upsell before proving the customer is healthy.",
  C6: "Automating onboarding before validating the manual process.",
  C7: "Asking for referrals before delivering measurable ROI.",
  C8: "Building a health score without input from actual churn reasons.",
  C9: "Surveying customers without acting on the feedback.",
  C10: "Running QBRs as status updates instead of strategic conversations.",
  C11: "Publishing case studies without customer approval or specifics.",
  C12: "Forecasting renewals without a process for early risk detection.",
  C13: "Building training content without validating knowledge gaps.",
  C14: "Scaling CSM with automation before proving the playbook manually.",
  C15: "Collecting feedback without a process to feed it to Product.",
  C16: "Building a reference program without asking customers first.",
}

// ── Default owners ───────────────────────────────────────────────────
const DEFAULT_OWNERS = {
  sales: "Head of Sales",
  marketing: "CMO / Head of Marketing",
  csm: "Head of CS",
}

// ── Funnel KR mapping (KR funnel key → Excel cell reference) ─────────
const FUNNEL_INPUT_ROWS = {
  target: null,
  acv: null,
  winRate: null,
  demoToProp: null,
  meetToDemo: null,
  callToMeet: null,
  mktShare: null,
  l2mql: null,
}

// Will be populated during Funnel sheet build
let FUNNEL_CELL_MAP = {}

// ── 1. Welcome sheet ─────────────────────────────────────────────────
function buildWelcomeSheet(workbook, ctx) {
  const ws = workbook.addWorksheet("\uD83C\uDFE0 Welcome", {
    properties: { tabColor: { argb: `FF${PURPLE}` } },
  })

  ws.getColumn(1).width = 1
  ws.getColumn(2).width = 80

  // Title row
  ws.getRow(2).height = 50
  mergeAndStyle(ws, 2, 2, 2, "OKR Builder", PURPLE, { size: 28, bold: true, color: WHITE })

  // Subtitle
  const companyName = ctx.company || "Your company"
  setCell(ws, 3, 2, `${companyName} \u2014 Revenue OKR System`, {
    font: { size: 12, color: SECONDARY_TEXT },
  })

  setCell(ws, 5, 2, "This workbook contains your complete OKR system. Work through each tab in order.", {
    font: { size: 10, color: SECONDARY_TEXT, italic: true },
  })

  // Steps
  const steps = [
    { num: "1", name: "Funnel Math", desc: "Model your revenue engine and derive activity targets", color: STEP_COLORS.funnel, tab: "3\uFE0F\u20E3 Funnel Math" },
    { num: "2", name: "OKR Builder", desc: "Review objectives and key results with suggested targets", color: STEP_COLORS.okr, tab: "4\uFE0F\u20E3 OKR Builder" },
    { num: "3", name: "Coherence Check", desc: "Validate every KR against 5 accountability rules", color: STEP_COLORS.coherence, tab: "5\uFE0F\u20E3 Coherence" },
  ]

  let r = 7
  steps.forEach((step) => {
    ws.getRow(r).height = 40
    setCell(ws, r, 2, `Step ${step.num}: ${step.name}`, {
      font: { size: 12, bold: true, color: step.color },
    })
    r++
    setCell(ws, r, 2, step.desc, {
      font: { size: 10, color: SECONDARY_TEXT },
    })
    r++
    setCell(ws, r, 2, `\u2192 Tab: ${step.tab}`, {
      font: { size: 9, color: GREY_TEXT, italic: true },
    })
    r += 2
  })

  // Context summary
  r += 1
  mergeAndStyle(ws, r, 2, 2, "Your context", PURPLE_LIGHT, { size: 11, bold: true, color: PURPLE })
  r++

  const ctxRows = [
    ["Stage", ctx.stage || "\u2014"],
    ["Bottleneck", ctx.bottleneck || "\u2014"],
    ["Current ARR", ctx.arr || "\u2014"],
    ["Win rate", ctx.winRate || "\u2014"],
    ["Annual churn", ctx.churn || "\u2014"],
    ["Founder-led sales", ctx.founderLed || "\u2014"],
  ]

  ctxRows.forEach(([label, value]) => {
    setCell(ws, r, 2, `${label}: ${value}`, {
      font: { size: 10, color: BODY_TEXT },
    })
    r++
  })

  // Tip
  r += 1
  setCell(ws, r, 2, "\uD83D\uDCA1 Tip: Start with Funnel Math to get suggested targets in your OKR Builder.", {
    font: { size: 10, color: WARNING_TEXT },
    fill: WARNING_BG,
  })

  ws.getColumn(2).alignment = { vertical: "middle", wrapText: true }
  return ws
}

// ── 2. Funnel Math sheet ─────────────────────────────────────────────
function buildFunnelSheet(workbook, funnel, calc) {
  const ws = workbook.addWorksheet("3\uFE0F\u20E3 Funnel Math", {
    properties: { tabColor: { argb: "FFF59E0B" } },
  })

  // Column widths: A=gutter, B=label, C=value, D=unit, E=help, F-I for sensitivity
  ws.getColumn(1).width = 1
  ws.getColumn(2).width = 36
  ws.getColumn(3).width = 16
  ws.getColumn(4).width = 10
  ws.getColumn(5).width = 36
  ws.getColumn(6).width = 14
  ws.getColumn(7).width = 14
  ws.getColumn(8).width = 14
  ws.getColumn(9).width = 14

  let r = 1

  // ── Section A: Revenue model inputs ──
  mergeAndStyle(ws, r, 2, 5, "A. Revenue Model Inputs", PURPLE, { size: 12, bold: true, color: WHITE })
  applyRowBorder(ws, r, 2, 5)
  r++

  // Sub-header
  const subLabels = ["Parameter", "Value", "Unit", "Guidance"]
  subLabels.forEach((lbl, i) => {
    setCell(ws, r, i + 2, lbl, {
      font: { size: 9, bold: true, color: PURPLE },
      fill: PURPLE_LIGHT,
    })
  })
  applyRowBorder(ws, r, 2, 5)
  r++

  const inputsStartRow = r
  const inputs = [
    { key: "target", label: "Annual new ARR target", unit: "\u20AC", help: "Total new revenue target for the year", fmt: "\u20AC#,##0" },
    { key: "acv", label: "Average contract value (ACV)", unit: "\u20AC", help: "Average deal size", fmt: "\u20AC#,##0" },
    { key: "winRate", label: "Win rate (proposals \u2192 deals)", unit: "%", help: "Typical B2B SaaS: 20-30%", fmt: "0%" },
    { key: "demoToProp", label: "Demo \u2192 proposal conversion", unit: "%", help: "What % of demos become proposals", fmt: "0%" },
    { key: "meetToDemo", label: "Meeting \u2192 demo conversion", unit: "%", help: "What % of meetings lead to demos", fmt: "0%" },
    { key: "callToMeet", label: "Call \u2192 meeting conversion", unit: "%", help: "Typical outbound: 5-15%", fmt: "0%" },
    { key: "mktShare", label: "Marketing pipeline share", unit: "%", help: "% of demos sourced by marketing", fmt: "0%" },
    { key: "l2mql", label: "Lead-to-MQL conversion rate", unit: "%", help: "% of raw leads that qualify as MQL", fmt: "0%" },
  ]

  inputs.forEach((inp, i) => {
    const isAlt = i % 2 === 0
    const bgColor = isAlt ? GREY_BG : WHITE
    const val = inp.unit === "%" ? funnel[inp.key] / 100 : funnel[inp.key]

    setCell(ws, r, 2, inp.label, { font: { size: 10, color: BODY_TEXT }, fill: bgColor })
    setCell(ws, r, 3, val, { font: { size: 10, bold: true, color: PURPLE }, fill: bgColor, numFmt: inp.fmt })
    setCell(ws, r, 4, inp.unit, { font: { size: 9, color: GREY_TEXT }, fill: bgColor })
    setCell(ws, r, 5, inp.help, { font: { size: 9, color: GREY_TEXT, italic: true }, fill: bgColor })
    applyRowBorder(ws, r, 2, 5)

    // Store cell references for cross-sheet formulas
    FUNNEL_CELL_MAP[inp.key] = `C${r}`
    FUNNEL_INPUT_ROWS[inp.key] = r

    r++
  })

  r += 2

  // ── Section B: Funnel volumes ──
  mergeAndStyle(ws, r, 2, 5, "B. Annual Funnel Volumes (calculated)", PURPLE, { size: 12, bold: true, color: WHITE })
  applyRowBorder(ws, r, 2, 5)
  r++

  const volSubLabels = ["Metric", "Annual", "Weekly", "Daily"]
  volSubLabels.forEach((lbl, i) => {
    setCell(ws, r, i + 2, lbl, {
      font: { size: 9, bold: true, color: PURPLE },
      fill: PURPLE_LIGHT,
    })
  })
  applyRowBorder(ws, r, 2, 5)
  r++

  const targetRow = FUNNEL_INPUT_ROWS.target
  const acvRow = FUNNEL_INPUT_ROWS.acv
  const wrRow = FUNNEL_INPUT_ROWS.winRate
  const dtpRow = FUNNEL_INPUT_ROWS.demoToProp
  const mtdRow = FUNNEL_INPUT_ROWS.meetToDemo
  const ctmRow = FUNNEL_INPUT_ROWS.callToMeet
  const mktRow = FUNNEL_INPUT_ROWS.mktShare
  const l2mRow = FUNNEL_INPUT_ROWS.l2mql

  const volumeRows = [
    { label: "\uD83C\uDFC6 Deals to close", formula: `IFERROR(C${targetRow}/C${acvRow},0)`, key: "deals" },
    { label: "\uD83D\uDCC4 Proposals to send", formula: `IFERROR(C${r}/C${wrRow},0)`, key: "proposals" },
    { label: "\uD83D\uDCBB Demos to run", formula: `IFERROR(C${r + 1}/C${dtpRow},0)`, key: "demos" },
    { label: "\uD83E\uDD1D Qualification meetings", formula: `IFERROR(C${r + 2}/C${mtdRow},0)`, key: "meetings" },
    { label: "\uD83D\uDCDE Outbound calls", formula: `IFERROR(C${r + 3}/C${ctmRow},0)`, key: "calls" },
  ]

  const volStartRow = r
  volumeRows.forEach((vol, i) => {
    const vRow = volStartRow + i
    const isAlt = i % 2 === 0
    const bgColor = isAlt ? "F3E8FF" : WHITE

    setCell(ws, vRow, 2, vol.label, { font: { size: 10, color: BODY_TEXT }, fill: bgColor })

    // Annual (formula)
    if (i === 0) {
      setCell(ws, vRow, 3, { formula: `IFERROR(C${targetRow}/C${acvRow},0)` }, {
        font: { size: 10, bold: true, color: PURPLE }, fill: bgColor, numFmt: "#,##0",
      })
    } else {
      const prevRow = volStartRow + i - 1
      const rateRow = [wrRow, dtpRow, mtdRow, ctmRow][i - 1]
      setCell(ws, vRow, 3, { formula: `IFERROR(C${prevRow}/C${rateRow},0)` }, {
        font: { size: 10, bold: true, color: PURPLE }, fill: bgColor, numFmt: "#,##0",
      })
    }

    // Weekly
    setCell(ws, vRow, 4, { formula: `IFERROR(C${vRow}/46,0)` }, {
      font: { size: 10, color: SECONDARY_TEXT }, fill: bgColor, numFmt: "#,##0.0",
    })
    // Daily
    setCell(ws, vRow, 5, { formula: `IFERROR(C${vRow}/230,0)` }, {
      font: { size: 10, color: SECONDARY_TEXT }, fill: bgColor, numFmt: "#,##0.0",
    })
    applyRowBorder(ws, vRow, 2, 5)

    // Store for cross-sheet references
    FUNNEL_CELL_MAP[`vol_${vol.key}`] = `C${vRow}`
  })

  r = volStartRow + volumeRows.length + 1

  // ── Section C: Marketing targets ──
  mergeAndStyle(ws, r, 2, 5, "C. Marketing MQL Targets (calculated)", PURPLE, { size: 12, bold: true, color: WHITE })
  applyRowBorder(ws, r, 2, 5)
  r++

  const mktSubLabels = ["Metric", "Annual", "Monthly", ""]
  mktSubLabels.forEach((lbl, i) => {
    setCell(ws, r, i + 2, lbl, {
      font: { size: 9, bold: true, color: PURPLE },
      fill: PURPLE_LIGHT,
    })
  })
  applyRowBorder(ws, r, 2, 5)
  r++

  const demosVolRow = volStartRow + 2 // demos row

  // Mkt demos
  setCell(ws, r, 2, "\uD83D\uDCE3 Marketing-sourced demos", { font: { size: 10, color: BODY_TEXT }, fill: GREY_BG })
  setCell(ws, r, 3, { formula: `IFERROR(C${demosVolRow}*C${mktRow},0)` }, {
    font: { size: 10, bold: true, color: "C0392B" }, fill: GREY_BG, numFmt: "#,##0",
  })
  setCell(ws, r, 4, { formula: `IFERROR(C${r}/12,0)` }, {
    font: { size: 10, color: SECONDARY_TEXT }, fill: GREY_BG, numFmt: "#,##0",
  })
  applyRowBorder(ws, r, 2, 5)
  const mktDemosRow = r
  r++

  // Annual MQLs
  setCell(ws, r, 2, "\uD83D\uDCCA Annual MQL target", { font: { size: 10, color: BODY_TEXT } })
  setCell(ws, r, 3, { formula: `IFERROR(C${mktDemosRow}/C${l2mRow},0)` }, {
    font: { size: 10, bold: true, color: "C0392B" }, numFmt: "#,##0",
  })
  setCell(ws, r, 4, { formula: `IFERROR(C${r}/12,0)` }, {
    font: { size: 10, color: SECONDARY_TEXT }, numFmt: "#,##0",
  })
  applyRowBorder(ws, r, 2, 5)
  const mqlRow = r
  FUNNEL_CELL_MAP.mqls = `C${mqlRow}`
  FUNNEL_CELL_MAP.mqlMonthly = `D${mqlRow}`
  r++

  // Raw leads
  setCell(ws, r, 2, "\uD83D\uDD0D Raw leads needed", { font: { size: 10, color: BODY_TEXT }, fill: GREY_BG })
  setCell(ws, r, 3, { formula: `IFERROR(C${mqlRow}/C${l2mRow},0)` }, {
    font: { size: 10, bold: true, color: "C0392B" }, fill: GREY_BG, numFmt: "#,##0",
  })
  setCell(ws, r, 4, { formula: `IFERROR(C${r}/12,0)` }, {
    font: { size: 10, color: SECONDARY_TEXT }, fill: GREY_BG, numFmt: "#,##0",
  })
  applyRowBorder(ws, r, 2, 5)
  r += 2

  // ── Section D: Sensitivity analysis ──
  mergeAndStyle(ws, r, 2, 9, "D. Sensitivity Analysis \u2014 Win Rate Scenarios", PURPLE, { size: 12, bold: true, color: WHITE })
  applyRowBorder(ws, r, 2, 9)
  r++

  const sensHeaders = ["Win Rate", "Deals", "Proposals", "Demos", "Meetings", "Calls", "vs. Base", ""]
  sensHeaders.forEach((lbl, i) => {
    setCell(ws, r, i + 2, lbl, {
      font: { size: 9, bold: true, color: PURPLE },
      fill: PURPLE_LIGHT,
    })
  })
  applyRowBorder(ws, r, 2, 9)
  r++

  const dealsRow = volStartRow // deals formula row
  const scenarios = [10, 15, 20, 25, 30, 35, 40, 45, 50]

  scenarios.forEach((wr, i) => {
    const isAlt = i % 2 === 0
    const bgColor = isAlt ? GREY_BG : WHITE
    const isBase = wr === funnel.winRate
    const rowFont = isBase ? { size: 10, bold: true, color: PURPLE } : { size: 10, color: BODY_TEXT }

    // Win Rate
    setCell(ws, r, 2, wr / 100, { font: rowFont, fill: isBase ? PURPLE_LIGHT : bgColor, numFmt: "0%" })
    // Deals (same as base)
    setCell(ws, r, 3, { formula: `IFERROR(C${targetRow}/C${acvRow},0)` }, { font: rowFont, fill: isBase ? PURPLE_LIGHT : bgColor, numFmt: "#,##0" })
    // Proposals
    setCell(ws, r, 4, { formula: `IFERROR(C${r}/(B${r}),0)` }, { font: rowFont, fill: isBase ? PURPLE_LIGHT : bgColor, numFmt: "#,##0" })
    // Demos
    setCell(ws, r, 5, { formula: `IFERROR(D${r}/C${dtpRow},0)` }, { font: rowFont, fill: isBase ? PURPLE_LIGHT : bgColor, numFmt: "#,##0" })
    // Meetings
    setCell(ws, r, 6, { formula: `IFERROR(E${r}/C${mtdRow},0)` }, { font: rowFont, fill: isBase ? PURPLE_LIGHT : bgColor, numFmt: "#,##0" })
    // Calls
    setCell(ws, r, 7, { formula: `IFERROR(F${r}/C${ctmRow},0)` }, { font: rowFont, fill: isBase ? PURPLE_LIGHT : bgColor, numFmt: "#,##0" })
    // vs. Base
    const baseDealsFormula = `C${dealsRow}`
    setCell(ws, r, 8, isBase ? "BASE" : { formula: `IFERROR((E${r}-C${demosVolRow})/C${demosVolRow},"")` }, {
      font: isBase ? { size: 10, bold: true, color: PURPLE } : { size: 10, color: SECONDARY_TEXT },
      fill: isBase ? PURPLE_LIGHT : bgColor,
      numFmt: isBase ? "@" : "+0%;-0%;-",
    })

    applyRowBorder(ws, r, 2, 9)
    r++
  })

  r++
  setCell(ws, r, 2, "\uD83D\uDCA1 Tip: Improving win rate by 5% has a compounding effect on every upstream metric.", {
    font: { size: 10, color: WARNING_TEXT },
    fill: WARNING_BG,
  })

  r += 3

  // ── Section E: Sales activity plan ──
  const SALES_COLOR = "1B4F8A"
  const SALES_LIGHT = "D6E4F7"
  const SALES_ALT = "EBF4FF"

  mergeAndStyle(ws, r, 2, 7, "E. Sales Activity Plan (weekly breakdown)", SALES_COLOR, { size: 12, bold: true, color: WHITE })
  applyRowBorder(ws, r, 2, 7)
  r++

  const salesActHeaders = ["Activity", "Annual", "Weekly", "Daily", "Owner", "Notes"]
  salesActHeaders.forEach((lbl, i) => {
    setCell(ws, r, i + 2, lbl, {
      font: { size: 9, bold: true, color: SALES_COLOR },
      fill: SALES_LIGHT,
    })
  })
  applyRowBorder(ws, r, 2, 7)
  r++

  const callsVolRow = volStartRow + 4
  const meetingsVolRow = volStartRow + 3

  const salesActivities = [
    { label: "\uD83D\uDCDE Cold calls", annualRef: `C${callsVolRow}`, help: "Direct outbound calls to prospects" },
    { label: "\uD83D\uDCE7 Cold emails sent", annualFormula: `IFERROR(C${callsVolRow}*3,0)`, help: "3 emails per cold call target" },
    { label: "\uD83D\uDD17 LinkedIn outreach messages", annualFormula: `IFERROR(C${callsVolRow}*0.5,0)`, help: "0.5 messages per call target" },
    { label: "\uD83E\uDD1D Qualification meetings", annualRef: `C${meetingsVolRow}`, help: "First meetings from all sources" },
    { label: "\uD83D\uDCBB Demos / presentations", annualRef: `C${demosVolRow}`, help: "Product demos to qualified prospects" },
    { label: "\uD83D\uDCC4 Proposals sent", annualRef: `C${volStartRow + 1}`, help: "Formal proposals to decision makers" },
    { label: "\uD83D\uDCCB Follow-up touchpoints", annualFormula: `IFERROR(C${volStartRow + 1}*5,0)`, help: "5 follow-ups per proposal" },
    { label: "\u2615 Networking events attended", annualVal: 24, help: "2 events/month (meetups, dinners)" },
    { label: "\uD83C\uDFC6 Reference calls arranged", annualFormula: `IFERROR(C${volStartRow}*0.3,0)`, help: "30% of deals need a reference call" },
  ]

  salesActivities.forEach((act, i) => {
    const isAlt = i % 2 === 0
    const bgColor = isAlt ? SALES_ALT : WHITE

    setCell(ws, r, 2, act.label, { font: { size: 10, color: BODY_TEXT }, fill: bgColor })

    // Annual
    if (act.annualRef) {
      setCell(ws, r, 3, { formula: `IFERROR(${act.annualRef},0)` }, { font: { size: 10, bold: true, color: SALES_COLOR }, fill: bgColor, numFmt: "#,##0" })
    } else if (act.annualFormula) {
      setCell(ws, r, 3, { formula: act.annualFormula }, { font: { size: 10, bold: true, color: SALES_COLOR }, fill: bgColor, numFmt: "#,##0" })
    } else {
      setCell(ws, r, 3, act.annualVal, { font: { size: 10, bold: true, color: SALES_COLOR }, fill: bgColor, numFmt: "#,##0" })
    }

    // Weekly
    setCell(ws, r, 4, { formula: `IFERROR(C${r}/46,0)` }, { font: { size: 10, color: SECONDARY_TEXT }, fill: bgColor, numFmt: "#,##0.0" })
    // Daily
    setCell(ws, r, 5, { formula: `IFERROR(C${r}/230,0)` }, { font: { size: 10, color: SECONDARY_TEXT }, fill: bgColor, numFmt: "#,##0.0" })
    // Owner
    setCell(ws, r, 6, i < 3 ? "SDR" : i < 7 ? "AE" : "Head of Sales", { font: { size: 9, color: GREY_TEXT, italic: true }, fill: bgColor })
    // Notes
    setCell(ws, r, 7, act.help, { font: { size: 9, color: GREY_TEXT, italic: true }, fill: bgColor })

    applyRowBorder(ws, r, 2, 7)
    r++
  })

  r++
  setCell(ws, r, 2, "\uD83D\uDCA1 Tip: Adjust multipliers (emails/call, follow-ups/proposal) to match your sales motion.", {
    font: { size: 10, color: WARNING_TEXT },
    fill: WARNING_BG,
  })

  r += 3

  // ── Section F: Marketing activity plan ──
  const MKT_COLOR = "C0392B"
  const MKT_LIGHT = "FDECEA"
  const MKT_ALT = "FEF5F5"

  mergeAndStyle(ws, r, 2, 7, "F. Marketing Activity Plan (annual targets)", MKT_COLOR, { size: 12, bold: true, color: WHITE })
  applyRowBorder(ws, r, 2, 7)
  r++

  const mktActHeaders = ["Channel / Activity", "Annual target", "Monthly", "Cost est.", "Owner", "Expected MQLs"]
  mktActHeaders.forEach((lbl, i) => {
    setCell(ws, r, i + 2, lbl, {
      font: { size: 9, bold: true, color: MKT_COLOR },
      fill: MKT_LIGHT,
    })
  })
  applyRowBorder(ws, r, 2, 7)
  r++

  const mktActivities = [
    { label: "\uD83D\uDCE7 Email campaigns", annual: 24, costEst: "\u20AC500/mo", owner: "Growth", mqlPct: 0.15, help: "2 nurture campaigns/month" },
    { label: "\uD83D\uDCCA Paid ads campaigns (Google/LinkedIn)", annual: 12, costEst: "\u20AC2-5k/mo", owner: "Growth", mqlPct: 0.25, help: "Always-on + seasonal" },
    { label: "\uD83C\uDF99\uFE0F Webinars", annual: 6, costEst: "\u20AC500/webinar", owner: "Content", mqlPct: 0.10, help: "1 every 2 months" },
    { label: "\uD83C\uDFAA Trade shows / events", annual: 4, costEst: "\u20AC5-15k/event", owner: "Events", mqlPct: 0.08, help: "Key industry events" },
    { label: "\uD83D\uDCDD Blog articles published", annual: 48, costEst: "\u20AC200/article", owner: "Content", mqlPct: 0.10, help: "1/week, SEO-optimized" },
    { label: "\uD83D\uDCD6 Downloadable assets (ebooks, guides)", annual: 4, costEst: "\u20AC2k/asset", owner: "Content", mqlPct: 0.08, help: "1 per quarter, gated" },
    { label: "\uD83D\uDCF1 Social media campaigns", annual: 48, costEst: "\u20AC300/mo", owner: "Social", mqlPct: 0.05, help: "Weekly posts + engagement" },
    { label: "\uD83E\uDD1D Partner co-marketing", annual: 4, costEst: "\u20AC1-3k/activation", owner: "Partnerships", mqlPct: 0.04, help: "1 per quarter" },
    { label: "\uD83C\uDFA5 Video content", annual: 12, costEst: "\u20AC500/video", owner: "Content", mqlPct: 0.05, help: "Product demos, testimonials" },
    { label: "\uD83D\uDD0D SEO / organic optimization", annual: 12, costEst: "\u20AC1k/mo", owner: "Growth", mqlPct: 0.10, help: "Monthly technical + content SEO" },
  ]

  const mktStartRow = r
  mktActivities.forEach((act, i) => {
    const isAlt = i % 2 === 0
    const bgColor = isAlt ? MKT_ALT : WHITE

    // Channel
    setCell(ws, r, 2, act.label, { font: { size: 10, color: BODY_TEXT }, fill: bgColor })
    // Annual target
    setCell(ws, r, 3, act.annual, { font: { size: 10, bold: true, color: MKT_COLOR }, fill: bgColor, numFmt: "#,##0" })
    // Monthly
    setCell(ws, r, 4, { formula: `IFERROR(C${r}/12,0)` }, { font: { size: 10, color: SECONDARY_TEXT }, fill: bgColor, numFmt: "#,##0.0" })
    // Cost est.
    setCell(ws, r, 5, act.costEst, { font: { size: 9, color: GREY_TEXT }, fill: bgColor })
    // Owner
    setCell(ws, r, 6, act.owner, { font: { size: 9, color: GREY_TEXT, italic: true }, fill: bgColor })
    // Expected MQLs (% of total MQL target)
    setCell(ws, r, 7, { formula: `IFERROR(C${mqlRow}*${act.mqlPct},0)` }, {
      font: { size: 10, bold: true, color: MKT_COLOR }, fill: bgColor, numFmt: "#,##0",
    })

    applyRowBorder(ws, r, 2, 7)
    r++
  })

  // Total row
  const mktEndRow = r - 1
  setCell(ws, r, 2, "TOTAL", { font: { size: 10, bold: true, color: MKT_COLOR }, fill: MKT_LIGHT })
  setCell(ws, r, 3, "", { fill: MKT_LIGHT })
  setCell(ws, r, 4, "", { fill: MKT_LIGHT })
  setCell(ws, r, 5, "", { fill: MKT_LIGHT })
  setCell(ws, r, 6, "", { fill: MKT_LIGHT })
  setCell(ws, r, 7, { formula: `IFERROR(SUM(G${mktStartRow}:G${mktEndRow}),0)` }, {
    font: { size: 10, bold: true, color: MKT_COLOR }, fill: MKT_LIGHT, numFmt: "#,##0",
  })
  applyRowBorder(ws, r, 2, 7)
  r++

  // Validation row
  r++
  setCell(ws, r, 2, "\uD83D\uDCA1 Validation: Total expected MQLs from channels should cover your annual MQL target.", {
    font: { size: 10, color: WARNING_TEXT },
    fill: WARNING_BG,
  })
  r++
  setCell(ws, r, 2, "MQL gap:", { font: { size: 10, bold: true, color: PURPLE } })
  setCell(ws, r, 3, { formula: `IFERROR(G${mktEndRow + 1}-C${mqlRow},0)` }, {
    font: { size: 10, bold: true, color: PURPLE }, numFmt: "+#,##0;-#,##0;-",
  })
  setCell(ws, r, 4, { formula: `IF(C${r}>=0,"\u2705 Covered","\u26A0\uFE0F Gap to fill")` }, {
    font: { size: 10, bold: true, color: "1A7A4A" },
  })

  // Store key references for OKR sheet
  FUNNEL_CELL_MAP.dealsRow = volStartRow
  FUNNEL_CELL_MAP.proposalsRow = volStartRow + 1
  FUNNEL_CELL_MAP.demosRow = volStartRow + 2
  FUNNEL_CELL_MAP.meetingsRow = volStartRow + 3
  FUNNEL_CELL_MAP.callsRow = volStartRow + 4
  FUNNEL_CELL_MAP.mqlsRow = mqlRow
  FUNNEL_CELL_MAP.targetRow = targetRow
  FUNNEL_CELL_MAP.wrRow = wrRow
  FUNNEL_CELL_MAP.mktShareRow = mktRow

  return ws
}

// ── 3. OKR Builder sheet ─────────────────────────────────────────────
function buildOKRSheet(workbook, selected, customTargets, calc, funnel) {
  const ws = workbook.addWorksheet("4\uFE0F\u20E3 OKR Builder", {
    properties: { tabColor: { argb: "FF22C55E" } },
  })

  const FUNNEL_SHEET = "'3\uFE0F\u20E3 Funnel Math'"

  // Columns: A=gutter, B=#, C=KR ID, D=Key Result, E=Suggested target, F=Type, G=Owner, H=Q1 Milestone
  ws.getColumn(1).width = 1
  ws.getColumn(2).width = 5
  ws.getColumn(3).width = 8
  ws.getColumn(4).width = 50
  ws.getColumn(5).width = 24
  ws.getColumn(6).width = 10
  ws.getColumn(7).width = 22
  ws.getColumn(8).width = 28

  let r = 1

  // Intro banner
  mergeAndStyle(ws, r, 2, 8, "OKR Builder \u2014 Objectives & Key Results", PURPLE, { size: 14, bold: true, color: WHITE })
  r++
  mergeAndStyle(ws, r, 2, 8, "Review each objective below. Suggested targets are linked to your Funnel Math. Fill in Owner and Q1 milestones.", PURPLE_LIGHT, { size: 10, color: PURPLE, italic: true, wrap: true })
  ws.getRow(r).height = 30
  r += 2

  TEAMS.forEach((team) => {
    if (selected[team].length === 0) return

    const style = TEAM_STYLES[team]
    const objectives = OBJECTIVES[team]
    const selectedObjs = objectives.filter((obj) => selected[team].includes(obj.id))

    // Team header
    mergeAndStyle(ws, r, 2, 8, `${style.emoji}  ${style.label.toUpperCase()}`, style.header, { size: 12, bold: true, color: WHITE })
    ws.getRow(r).height = 30
    r++

    selectedObjs.forEach((obj) => {
      // Objective title row
      mergeAndStyle(ws, r, 2, 8, `${obj.id}  ${obj.title}`, style.sub, { size: 11, bold: true, color: style.header })
      ws.getRow(r).height = 26
      r++

      // Pitfall warning (if exists)
      const pitfall = PITFALLS[obj.id]
      if (pitfall) {
        mergeAndStyle(ws, r, 2, 8, `\u26A0\uFE0F Pitfall: ${pitfall}`, WARNING_BG, { size: 9, color: WARNING_TEXT, italic: true, wrap: true })
        ws.getRow(r).height = 28
        r++
      }

      // KR sub-headers
      const krHeaders = ["#", "KR", "Key Result", "Suggested target", "Type", "Owner", "Q1 milestone"]
      krHeaders.forEach((lbl, i) => {
        setCell(ws, r, i + 2, lbl, {
          font: { size: 9, bold: true, color: style.header },
          fill: style.sub,
        })
      })
      applyRowBorder(ws, r, 2, 8)
      r++

      // KR rows
      obj.krs.forEach((kr, ki) => {
        const isAlt = ki % 2 === 0
        const bgColor = isAlt ? style.alt1 : style.alt2

        // #
        setCell(ws, r, 2, ki + 1, { font: { size: 9, color: GREY_TEXT }, fill: bgColor, align: { horizontal: "center", vertical: "middle" } })
        // KR ID
        setCell(ws, r, 3, kr.id, { font: { size: 9, bold: true, color: style.header }, fill: bgColor })
        // Key Result
        setCell(ws, r, 4, kr.text, { font: { size: 10, color: BODY_TEXT }, fill: bgColor, align: { wrapText: true, vertical: "middle" } })

        // Suggested target (with cross-sheet formula if applicable)
        const targetValue = resolveKRTarget(kr, customTargets, calc, FUNNEL_SHEET)
        setCell(ws, r, 5, targetValue.value, {
          font: { size: 10, bold: true, color: targetValue.isFormula ? style.header : SECONDARY_TEXT },
          fill: bgColor,
          numFmt: targetValue.numFmt || "@",
        })

        // Type
        const typeColor = kr.type === "Leading" ? "1A7A4A" : "1B4F8A"
        setCell(ws, r, 6, kr.type, { font: { size: 9, color: typeColor }, fill: bgColor, align: { horizontal: "center", vertical: "middle" } })

        // Owner (pre-filled with default)
        setCell(ws, r, 7, DEFAULT_OWNERS[team], { font: { size: 10, color: GREY_TEXT, italic: true }, fill: bgColor })

        // Q1 milestone
        setCell(ws, r, 8, "\u2190 fill after Funnel Math", { font: { size: 9, color: GREY_TEXT, italic: true }, fill: bgColor })

        applyRowBorder(ws, r, 2, 8)
        r++
      })

      r++ // spacing between objectives
    })

    r++ // spacing between teams
  })

  return ws
}

function resolveKRTarget(kr, customTargets, calc, funnelSheet) {
  // Custom target overrides everything
  if (customTargets[kr.id] != null && customTargets[kr.id] !== "") {
    return { value: customTargets[kr.id], isFormula: false }
  }

  if (!kr.funnel) {
    return { value: "\u2192 set target", isFormula: false }
  }

  // Map funnel keys to cross-sheet formulas
  const funnelFormulas = {
    revenue: { formula: `IFERROR("\u20AC"&TEXT(${funnelSheet}!C${FUNNEL_CELL_MAP.targetRow},"#,##0"),"\u2192 set in Funnel Math")`, numFmt: "@" },
    deals: { formula: `IFERROR(${funnelSheet}!C${FUNNEL_CELL_MAP.dealsRow},"\u2192 set in Funnel Math")`, numFmt: "#,##0" },
    winrate: { formula: `IFERROR(${funnelSheet}!C${FUNNEL_CELL_MAP.wrRow},"\u2192 set in Funnel Math")`, numFmt: "0%" },
    demos_annual: { formula: `IFERROR(${funnelSheet}!C${FUNNEL_CELL_MAP.demosRow},"\u2192 set in Funnel Math")`, numFmt: "#,##0" },
    meetings_monthly: { formula: `IFERROR(${funnelSheet}!C${FUNNEL_CELL_MAP.meetingsRow}/12,"\u2192 set in Funnel Math")`, numFmt: "#,##0" },
    mql_share: { formula: `IFERROR(${funnelSheet}!C${FUNNEL_CELL_MAP.mktShareRow},"\u2192 set in Funnel Math")`, numFmt: "0%" },
    mqls: { formula: `IFERROR(${funnelSheet}!C${FUNNEL_CELL_MAP.mqlsRow},"\u2192 set in Funnel Math")`, numFmt: "#,##0" },
  }

  const mapping = funnelFormulas[kr.funnel]
  if (mapping) {
    return { value: { formula: mapping.formula }, isFormula: true, numFmt: mapping.numFmt }
  }

  return { value: calc.funnelTargets[kr.funnel] || "\u2192 set target", isFormula: false }
}

// ── 4. Coherence sheet ───────────────────────────────────────────────
function buildCoherenceSheet(workbook, selected, customTargets, calc) {
  const ws = workbook.addWorksheet("5\uFE0F\u20E3 Coherence", {
    properties: { tabColor: { argb: "FFEF4444" } },
  })

  ws.getColumn(1).width = 1
  ws.getColumn(2).width = 8
  ws.getColumn(3).width = 42
  ws.getColumn(4).width = 22
  ws.getColumn(5).width = 8
  ws.getColumn(6).width = 8
  ws.getColumn(7).width = 30
  ws.getColumn(8).width = 12

  let r = 1

  // Title
  mergeAndStyle(ws, r, 2, 8, "Coherence Check \u2014 5 Accountability Rules", PURPLE, { size: 14, bold: true, color: WHITE })
  r++

  mergeAndStyle(ws, r, 2, 8, "Every Key Result must pass all 5 rules below. Use this sheet after completing your OKR Builder.", PURPLE_LIGHT, { size: 10, color: PURPLE, italic: true, wrap: true })
  ws.getRow(r).height = 30
  r += 2

  // Rules
  const rules = [
    { num: "R1", name: "Single owner", desc: "Every KR has exactly one person accountable (not a team, not two people)." },
    { num: "R2", name: "Own-action achievability", desc: "The owner can move the metric by their own actions, not someone else's." },
    { num: "R3", name: "Measurability", desc: "The KR has a clear number, date, or binary outcome \u2014 no ambiguity." },
    { num: "R4", name: "Result, not task", desc: "The KR describes an outcome, not an activity (e.g. 'win rate \u2265 25%' not 'send proposals')." },
    { num: "R5", name: "Leading + Lagging mix", desc: "Each objective has at least one leading indicator to track progress before the outcome is known." },
  ]

  rules.forEach((rule) => {
    setCell(ws, r, 2, rule.num, { font: { size: 11, bold: true, color: PURPLE }, fill: PURPLE_LIGHT })
    mergeAndStyle(ws, r, 3, 8, `${rule.name}: ${rule.desc}`, PURPLE_LIGHT, { size: 10, color: BODY_TEXT, wrap: true })
    ws.getRow(r).height = 36
    applyRowBorder(ws, r, 2, 8)
    r++
  })

  r += 2

  // KR Review table
  mergeAndStyle(ws, r, 2, 8, "KR Review Table", PURPLE, { size: 12, bold: true, color: WHITE })
  r++

  const reviewHeaders = ["KR ID", "Key Result", "Assigned to", "R1\u2713", "R2\u2713", "Notes", "Status"]
  reviewHeaders.forEach((lbl, i) => {
    setCell(ws, r, i + 2, lbl, {
      font: { size: 9, bold: true, color: PURPLE },
      fill: PURPLE_LIGHT,
    })
  })
  applyRowBorder(ws, r, 2, 8)
  r++

  const reviewStartRow = r
  let krCount = 0

  TEAMS.forEach((team) => {
    if (selected[team].length === 0) return
    const objectives = OBJECTIVES[team]
    const selectedObjs = objectives.filter((obj) => selected[team].includes(obj.id))
    const style = TEAM_STYLES[team]

    selectedObjs.forEach((obj) => {
      obj.krs.forEach((kr) => {
        const isAlt = krCount % 2 === 0
        const bgColor = isAlt ? GREY_BG : WHITE

        setCell(ws, r, 2, kr.id, { font: { size: 9, bold: true, color: style.header }, fill: bgColor })
        setCell(ws, r, 3, kr.text, { font: { size: 10, color: BODY_TEXT }, fill: bgColor, align: { wrapText: true, vertical: "middle" } })
        setCell(ws, r, 4, DEFAULT_OWNERS[team], { font: { size: 10, color: GREY_TEXT, italic: true }, fill: bgColor })
        setCell(ws, r, 5, "", { fill: bgColor, align: { horizontal: "center" } }) // R1
        setCell(ws, r, 6, "", { fill: bgColor, align: { horizontal: "center" } }) // R2
        setCell(ws, r, 7, "", { font: { size: 9, color: GREY_TEXT }, fill: bgColor })
        // Status formula
        setCell(ws, r, 8, { formula: `IF(AND(E${r}<>"",F${r}<>""),"\u2705 Pass","\u2192 Review")` }, {
          font: { size: 9, bold: true, color: "1A7A4A" }, fill: bgColor, align: { horizontal: "center" },
        })
        applyRowBorder(ws, r, 2, 8)
        r++
        krCount++
      })
    })
  })

  // Summary
  r += 1
  if (krCount > 0) {
    setCell(ws, r, 2, "Summary:", { font: { size: 10, bold: true, color: PURPLE } })
    setCell(ws, r, 3, { formula: `COUNTIF(H${reviewStartRow}:H${reviewStartRow + krCount - 1},"\u2705 Pass")&" / ${krCount} KRs passing"` }, {
      font: { size: 10, bold: true, color: "1A7A4A" },
    })
  }

  return ws
}

// ── Main export function ─────────────────────────────────────────────
export async function generateExcel({ ctx, selected, funnel, calc, customTargets }) {
  // Reset cell map for each export
  FUNNEL_CELL_MAP = {}

  const workbook = new ExcelJS.Workbook()
  workbook.creator = "OKR Builder"
  workbook.created = new Date()

  buildWelcomeSheet(workbook, ctx)
  buildFunnelSheet(workbook, funnel, calc)
  buildOKRSheet(workbook, selected, customTargets, calc, funnel)
  buildCoherenceSheet(workbook, selected, customTargets, calc)

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
