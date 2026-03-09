import { OBJECTIVES } from "../../data/objectives"
import { TEAM_CONFIG, TEAMS } from "../../data/config"
import KRRow from "../ui/kr-row"
import Tag from "../ui/tag-custom"
import { Button } from "@/components/ui/button"

const SUMMARY_ITEMS = [
  { label: "Revenue target", targetKey: "revenue", colorHex: "#8B5CF6", gradientTo: "#C084FC" },
  { label: "Deals needed", calcKey: "deals", colorHex: "#3B82F6", gradientTo: "#60A5FA" },
  { label: "Demos needed", calcKey: "demos", colorHex: "#8B5CF6", gradientTo: "#C084FC" },
  { label: "MQL target", calcKey: "mqls", colorHex: "#EF4444", gradientTo: "#F87171" },
]

const NEXT_STEPS = [
  "Replace all 'X' placeholders in KR targets with your specific numbers",
  "Assign an owner (name, not team) to each KR",
  "Set quarterly milestones for each annual KR",
  "Run the coherence check: every KR must be achievable by the owner's own actions alone",
  "Present to leadership for alignment before the quarter starts",
]

export default function OKRSystemStep({
  ctx,
  selected,
  funnel,
  calc,
  customTargets,
  setCustomTarget,
  onBack,
  onReset,
  onExportPDF,
  onShare,
  shared,
}) {
  const totalSelected = TEAMS.reduce(
    (sum, team) => sum + selected[team].length,
    0
  )

  const title = ctx.company
    ? `${ctx.company}'s OKR System`
    : "Your OKR System"

  const summaryValues = SUMMARY_ITEMS.map((item) => {
    if (item.targetKey) {
      return { ...item, val: calc.funnelTargets[item.targetKey] }
    }
    const raw = calc[item.calcKey]
    return { ...item, val: typeof raw === "number" ? raw.toLocaleString() : raw }
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-sans font-bold text-3xl gradient-heading">{title}</h2>
        <p className="text-muted-foreground mt-2">
          {totalSelected} objective{totalSelected !== 1 ? "s" : ""} selected
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {summaryValues.map((item) => (
          <div
            key={item.label}
            className="rounded-lg p-4 gradient-border"
            style={{ "--gb-from": item.colorHex, "--gb-to": `${item.colorHex}40` }}
          >
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {item.label}
            </p>
            <p
              className="text-2xl font-extrabold font-mono mt-1"
              style={{
                background: `linear-gradient(135deg, ${item.colorHex}, ${item.gradientTo})`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              {item.val}
            </p>
          </div>
        ))}
      </div>

      {totalSelected === 0 && (
        <div className="bg-card rounded-xl border border-border p-8 text-center">
          <p className="text-muted-foreground mb-4">
            No objectives selected yet. Go back to select your OKRs.
          </p>
          <Button onClick={onReset}>
            Go to Step 1
          </Button>
        </div>
      )}

      {TEAMS.map((team) => {
        if (selected[team].length === 0) return null

        const cfg = TEAM_CONFIG[team]
        const objectives = OBJECTIVES[team]
        const selectedObjs = objectives.filter((obj) =>
          selected[team].includes(obj.id)
        )

        return (
          <div key={team} className="space-y-4">
            <div
              className="rounded-lg px-5 py-3 shadow-lg shadow-black/20"
              style={{ background: `linear-gradient(135deg, ${cfg.colorHex}, ${cfg.colorHex}88)` }}
            >
              <h3 className="font-sans font-bold text-white text-lg">{cfg.label}</h3>
            </div>

            {selectedObjs.map((obj) => (
              <div key={obj.id} className="space-y-0">
                <div
                  className="rounded-t-lg px-5 py-3"
                  style={{ backgroundColor: `${cfg.colorHex}10` }}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="font-mono text-xs font-bold"
                      style={{ color: cfg.colorHex }}
                    >
                      {obj.id}
                    </span>
                    <span className="font-bold text-sm text-foreground">
                      {obj.title}
                    </span>
                  </div>
                </div>

                <div className="border border-border rounded-b-lg overflow-x-auto glass-card">
                  <div className="grid grid-cols-[40px_36px_1fr_160px_80px] px-5 py-2 bg-muted">
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground">
                      #
                    </span>
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground">
                      ID
                    </span>
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground">
                      Key Result
                    </span>
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground text-center">
                      Target
                    </span>
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground text-right">
                      Type
                    </span>
                  </div>

                  {obj.krs.map((kr, ki) => (
                    <KRRow
                      key={kr.id}
                      kr={kr}
                      index={ki}
                      teamConfig={cfg}
                      suggestedTarget={
                        kr.funnel
                          ? calc.funnelTargets[kr.funnel]
                          : "\u2192 set target"
                      }
                      customTarget={customTargets[kr.id]}
                      onTargetChange={(krId, val) => setCustomTarget(krId, val)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )
      })}

      {totalSelected > 0 && (
        <div className="bg-primary/10 rounded-xl p-5 space-y-3 glass-card border-primary/20">
          <h3 className="font-sans font-bold text-lg text-foreground">Next steps</h3>
          <ol className="space-y-2">
            {NEXT_STEPS.map((step, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-foreground">
                <span className="font-mono font-bold text-primary shrink-0">
                  {i + 1}.
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="flex items-center justify-between pt-4">
        <Button variant="ghost" onClick={onBack}>
          &larr; Back
        </Button>
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={onReset}>
            &larr; Start over
          </Button>
          <Button variant="outline" onClick={onShare}>
            {shared ? "Copied!" : "Share"}
          </Button>
          <Button onClick={onExportPDF}>
            Export PDF
          </Button>
        </div>
      </div>
    </div>
  )
}
