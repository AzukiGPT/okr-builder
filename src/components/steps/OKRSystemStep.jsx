import { OBJECTIVES } from "../../data/objectives"
import { TEAM_CONFIG, TEAMS } from "../../data/config"
import KRRow from "../ui/kr-row"
import Tag from "../ui/tag-custom"
import { Button } from "@/components/ui/button"
import {
  ArrowLeft,
  RotateCcw,
  Link2,
  FileSpreadsheet,
  FileText,
  Copy,
  Check,
} from "lucide-react"

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
  krStatuses,
  onKRStatusChange,
  onKRProgressChange,
  onKRValuesChange,
  onBack,
  onNext,
  onReset,
  onBackToSets,
  onExportPDF,
  onExportExcel,
  onCopyNotion,
  notionCopied,
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
              className="rounded-lg px-5 py-3 shadow-sm"
              style={{ background: `linear-gradient(135deg, ${cfg.colorHex}, ${cfg.colorHex}88)` }}
            >
              <h3 className="font-sans font-bold text-white text-lg">{cfg.label}</h3>
            </div>

            {selectedObjs.map((obj) => {
              const objKrProgress = obj.krs.reduce((sum, kr) => {
                return sum + (krStatuses?.[kr.id]?.progress || 0)
              }, 0)
              const objAvgProgress = obj.krs.length > 0
                ? Math.round(objKrProgress / obj.krs.length)
                : 0

              return (
              <div key={obj.id} className="space-y-0">
                <div
                  className="rounded-t-lg px-5 py-3"
                  style={{ backgroundColor: `${cfg.colorHex}12` }}
                >
                  <div className="flex items-center justify-between">
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
                    {krStatuses && (
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 rounded-full bg-gray-200 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${objAvgProgress}%`,
                              backgroundColor: cfg.colorHex,
                            }}
                          />
                        </div>
                        <span
                          className="text-xs font-mono font-bold"
                          style={{ color: cfg.colorHex }}
                        >
                          {objAvgProgress}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="border border-border rounded-b-lg overflow-x-auto glass-card">
                  <div className="grid grid-cols-[32px_36px_1fr_80px_80px_100px_56px_72px] gap-1.5 px-4 py-2 bg-muted">
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
                      Current
                    </span>
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground text-center">
                      Target
                    </span>
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground text-center">
                      Status
                    </span>
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground text-center">
                      Progress
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
                      krStatus={krStatuses?.[kr.id]?.status}
                      krProgress={krStatuses?.[kr.id]?.progress}
                      currentValue={krStatuses?.[kr.id]?.current_value}
                      targetValue={krStatuses?.[kr.id]?.target_value}
                      onStatusChange={onKRStatusChange}
                      onProgressChange={onKRProgressChange}
                      onValuesChange={onKRValuesChange}
                    />
                  ))}
                </div>
              </div>
              )
            })}
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

      <div className="rounded-xl border border-border bg-card p-5 space-y-4 glass-card">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-wide font-semibold text-muted-foreground">
            Export &amp; Share
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={onBack}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer flex items-center gap-1"
            >
              <ArrowLeft className="w-3 h-3" />
              Back
            </button>
            <span className="text-border">|</span>
            <button
              onClick={onReset}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              Start over
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button
            onClick={onExportExcel}
            className="group flex flex-col items-center gap-2 rounded-lg border-2 border-transparent bg-emerald-50 hover:border-emerald-300 p-4 transition-all cursor-pointer"
          >
            <div className="w-10 h-10 rounded-full bg-emerald-100 group-hover:bg-emerald-200 flex items-center justify-center transition-colors">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
            </div>
            <span className="text-sm font-semibold text-emerald-700">Excel</span>
            <span className="text-[10px] text-emerald-600/70 leading-tight text-center">
              Full workbook with funnel, OKRs &amp; coherence
            </span>
          </button>

          <button
            onClick={onExportPDF}
            className="group flex flex-col items-center gap-2 rounded-lg border-2 border-transparent bg-violet-50 hover:border-violet-300 p-4 transition-all cursor-pointer"
          >
            <div className="w-10 h-10 rounded-full bg-violet-100 group-hover:bg-violet-200 flex items-center justify-center transition-colors">
              <FileText className="w-5 h-5 text-violet-600" />
            </div>
            <span className="text-sm font-semibold text-violet-700">PDF</span>
            <span className="text-[10px] text-violet-600/70 leading-tight text-center">
              One-page summary for leadership review
            </span>
          </button>

          <button
            onClick={onCopyNotion}
            className="group flex flex-col items-center gap-2 rounded-lg border-2 border-transparent bg-gray-50 hover:border-gray-300 p-4 transition-all cursor-pointer"
          >
            <div className="w-10 h-10 rounded-full bg-gray-100 group-hover:bg-gray-200 flex items-center justify-center transition-colors">
              {notionCopied
                ? <Check className="w-5 h-5 text-emerald-600" />
                : <Copy className="w-5 h-5 text-gray-600" />
              }
            </div>
            <span className="text-sm font-semibold text-gray-700">
              {notionCopied ? "Copied!" : "Notion"}
            </span>
            <span className="text-[10px] text-gray-500 leading-tight text-center">
              Markdown tables ready to paste
            </span>
          </button>

          <button
            onClick={onShare}
            className="group flex flex-col items-center gap-2 rounded-lg border-2 border-transparent bg-blue-50 hover:border-blue-300 p-4 transition-all cursor-pointer"
          >
            <div className="w-10 h-10 rounded-full bg-blue-100 group-hover:bg-blue-200 flex items-center justify-center transition-colors">
              {shared
                ? <Check className="w-5 h-5 text-emerald-600" />
                : <Link2 className="w-5 h-5 text-blue-600" />
              }
            </div>
            <span className="text-sm font-semibold text-blue-700">
              {shared ? "Copied!" : "Share link"}
            </span>
            <span className="text-[10px] text-blue-600/70 leading-tight text-center">
              Shareable URL with your full config
            </span>
          </button>
        </div>
      </div>

      {totalSelected > 0 && onNext && (
        <div className="flex items-center justify-between pt-4">
          <Button variant="ghost" onClick={onBack}>
            &larr; Back
          </Button>
          <Button onClick={onNext}>
            Action Plan &rarr;
          </Button>
        </div>
      )}

      {onBackToSets && !onNext && (
        <div className="flex justify-center pt-2 pb-4">
          <Button onClick={onBackToSets} size="lg" className="px-8">
            Done — back to my sets
          </Button>
        </div>
      )}
    </div>
  )
}
