import { OBJECTIVES } from "../../data/objectives"
import { TEAM_CONFIG, TEAMS } from "../../data/config"
import KRRow from "../ui/KRRow"
import Tag from "../ui/Tag"

const SUMMARY_ITEMS = [
  { label: "Revenue target", targetKey: "revenue", colorHex: "#4A235A" },
  { label: "Deals needed", calcKey: "deals", colorHex: "#1B4F8A" },
  { label: "Demos needed", calcKey: "demos", colorHex: "#4A235A" },
  { label: "MQL target", calcKey: "mqls", colorHex: "#C0392B" },
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
        <h2 className="font-display text-3xl text-text">{title}</h2>
        <p className="text-muted mt-2">
          {totalSelected} objective{totalSelected !== 1 ? "s" : ""} selected
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {summaryValues.map((item) => (
          <div
            key={item.label}
            className="bg-white rounded-lg border border-border p-4"
          >
            <p className="text-xs uppercase tracking-wide text-muted">
              {item.label}
            </p>
            <p
              className="text-2xl font-extrabold font-mono mt-1"
              style={{ color: item.colorHex }}
            >
              {item.val}
            </p>
          </div>
        ))}
      </div>

      {totalSelected === 0 && (
        <div className="bg-white rounded-xl border border-border p-8 text-center">
          <p className="text-muted mb-4">
            No objectives selected yet. Go back to select your OKRs.
          </p>
          <button
            type="button"
            onClick={onReset}
            className="bg-accent text-white px-5 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Go to Step 1
          </button>
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
              className="rounded-lg px-5 py-3"
              style={{ backgroundColor: cfg.colorHex }}
            >
              <h3 className="font-display text-white text-lg">{cfg.label}</h3>
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
                    <span className="font-bold text-sm text-text">
                      {obj.title}
                    </span>
                  </div>
                </div>

                <div className="border border-border rounded-b-lg overflow-hidden">
                  <div className="grid grid-cols-[40px_36px_1fr_160px_80px] px-5 py-2 bg-gray-100">
                    <span className="text-[10px] uppercase font-semibold text-muted">
                      #
                    </span>
                    <span className="text-[10px] uppercase font-semibold text-muted">
                      ID
                    </span>
                    <span className="text-[10px] uppercase font-semibold text-muted">
                      Key Result
                    </span>
                    <span className="text-[10px] uppercase font-semibold text-muted text-center">
                      Target
                    </span>
                    <span className="text-[10px] uppercase font-semibold text-muted text-right">
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
        <div className="bg-accent-light rounded-xl p-5 space-y-3">
          <h3 className="font-display text-lg text-text">Next steps</h3>
          <ol className="space-y-2">
            {NEXT_STEPS.map((step, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-text">
                <span className="font-mono font-bold text-accent shrink-0">
                  {i + 1}.
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="flex items-center justify-between pt-4">
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-muted hover:text-text transition-colors"
        >
          &larr; Back
        </button>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onReset}
            className="text-sm text-muted hover:text-text transition-colors"
          >
            &larr; Start over
          </button>
          <button
            type="button"
            onClick={onShare}
            className="border border-accent text-accent px-4 py-2 rounded-lg text-sm font-semibold hover:bg-accent-light transition-colors"
          >
            {shared ? "Copied!" : "Share"}
          </button>
          <button
            type="button"
            onClick={onExportPDF}
            className="bg-accent text-white px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Export PDF
          </button>
        </div>
      </div>
    </div>
  )
}
