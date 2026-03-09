import { OBJECTIVES } from "../data/objectives"
import { TEAM_CONFIG, TEAMS } from "../data/config"

const TEAM_EMOJI = {
  sales: "🔵",
  marketing: "🔴",
  csm: "🟢",
}

const NEXT_STEPS = [
  "Replace all 'X' placeholders in KR targets with your specific numbers",
  "Assign an owner (name, not team) to each KR",
  "Set quarterly milestones for each annual KR",
  "Run the coherence check: every KR must be achievable by the owner's own actions alone",
  "Present to leadership for alignment before the quarter starts",
]

function buildSummaryTable(calc) {
  const rows = [
    ["Revenue target", calc.funnelTargets.revenue],
    ["Deals needed", String(calc.deals)],
    ["Demos needed", String(calc.demos)],
    ["MQL target", String(calc.mqls)],
  ]

  const lines = [
    "| Metric | Target |",
    "|--------|--------|",
    ...rows.map(([label, val]) => `| ${label} | **${val}** |`),
  ]

  return lines.join("\n")
}

function buildTeamSection(team, selected, calc, customTargets) {
  const cfg = TEAM_CONFIG[team]
  const emoji = TEAM_EMOJI[team]
  const objectives = OBJECTIVES[team]
  const selectedObjs = objectives.filter((obj) => selected[team].includes(obj.id))

  if (selectedObjs.length === 0) return ""

  const lines = [`## ${emoji} ${cfg.label}`, ""]

  selectedObjs.forEach((obj) => {
    lines.push(`### ${obj.id} — ${obj.title}`)
    lines.push("")
    lines.push("| # | ID | Key Result | Target | Type |")
    lines.push("|---|-----|------------|--------|------|")

    obj.krs.forEach((kr, i) => {
      const target =
        customTargets[kr.id] ??
        (kr.funnel ? calc.funnelTargets[kr.funnel] : "→ set target")

      lines.push(
        `| ${i + 1} | ${kr.id} | ${kr.text} | **${target}** | ${kr.type} |`
      )
    })

    lines.push("")
  })

  return lines.join("\n")
}

export function generateNotionMarkdown({ ctx, selected, calc, customTargets }) {
  const totalSelected = TEAMS.reduce(
    (sum, team) => sum + selected[team].length,
    0
  )

  const title = ctx.company
    ? `${ctx.company}'s OKR System`
    : "OKR System"

  const lines = [
    `# ${title}`,
    "",
    `**Stage:** ${ctx.stage || "—"} | **Focus:** ${ctx.bottleneck || "—"} | **${totalSelected} objective${totalSelected !== 1 ? "s" : ""}**`,
    "",
    "## Summary",
    "",
    buildSummaryTable(calc),
    "",
    "---",
    "",
  ]

  TEAMS.forEach((team) => {
    const section = buildTeamSection(team, selected, calc, customTargets)
    if (section) {
      lines.push(section)
      lines.push("---")
      lines.push("")
    }
  })

  lines.push("## Next steps")
  lines.push("")
  NEXT_STEPS.forEach((step) => {
    lines.push(`- [ ] ${step}`)
  })
  lines.push("")

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

export async function copyNotionMarkdown({ ctx, selected, calc, customTargets }) {
  const markdown = generateNotionMarkdown({ ctx, selected, calc, customTargets })
  try {
    await navigator.clipboard.writeText(markdown)
  } catch {
    fallbackCopy(markdown)
  }
}
