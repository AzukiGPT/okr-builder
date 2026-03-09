import FunnelBar from "../ui/funnel-bar"
import { Button } from "@/components/ui/button"

const SALES_INPUTS = [
  { key: "target", label: "Annual revenue target (new ARR)", prefix: "\u20AC", step: 100000 },
  { key: "acv", label: "Average contract value (ACV)", prefix: "\u20AC", step: 10000 },
  { key: "winRate", label: "Win rate \u2014 proposals \u2192 deals", suffix: "%", step: 1 },
  { key: "demoToProp", label: "Demo \u2192 proposal conversion", suffix: "%", step: 5 },
  { key: "meetToDemo", label: "Meeting \u2192 demo conversion", suffix: "%", step: 5 },
  { key: "callToMeet", label: "Call \u2192 meeting conversion", suffix: "%", step: 1 },
]

const MKT_INPUTS = [
  { key: "mktShare", label: "Marketing pipeline share target", suffix: "%" },
  { key: "l2mql", label: "Lead-to-MQL conversion rate", suffix: "%" },
]

const FUNNEL_ROWS = [
  { label: "\uD83C\uDFC6 Deals to close", key: "deals", colorHex: "#3B82F6" },
  { label: "\uD83D\uDCC4 Proposals to send", key: "proposals", colorHex: "#3B82F6" },
  { label: "\uD83D\uDCBB Demos to run", key: "demos", colorHex: "#8B5CF6" },
  { label: "\uD83E\uDD1D Qualification meetings", key: "meetings", colorHex: "#8B5CF6" },
  { label: "\uD83D\uDCDE Outbound calls", key: "calls", colorHex: "#EF4444" },
]

function FunnelInput({ inputDef, value, onChange, borderColor }) {
  const { key, label, prefix, suffix, step } = inputDef

  return (
    <div className="mb-3">
      <label className="text-xs text-muted-foreground block mb-1">{label}</label>
      <div
        className="flex items-center bg-card border-2 rounded-lg overflow-hidden"
        style={{ borderColor }}
      >
        {prefix && (
          <span className="px-3 font-mono font-bold" style={{ color: borderColor }}>
            {prefix}
          </span>
        )}
        <input
          type="number"
          value={value}
          step={step}
          onChange={(e) => onChange(key, parseFloat(e.target.value) || 0)}
          className="flex-1 border-none p-3 text-lg font-bold font-mono bg-transparent outline-none text-foreground"
          style={{ color: borderColor }}
        />
        {suffix && (
          <span className="px-3 font-mono font-bold" style={{ color: borderColor }}>
            {suffix}
          </span>
        )}
      </div>
    </div>
  )
}

export default function FunnelStep({ funnel, setFunnel, calc, onNext, onBack }) {
  const maxBar = calc.calls

  const improvedProposals = Math.round(
    calc.deals / Math.max((funnel.winRate + 5) / 100, 0.001)
  )
  const improvedDemos = Math.round(
    improvedProposals / Math.max(funnel.demoToProp / 100, 0.001)
  )
  const demosSaved = calc.demos - improvedDemos

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-sans font-bold text-3xl gradient-heading">
          Funnel math
        </h2>
        <p className="text-muted-foreground mt-2">
          Model your revenue engine to derive activity targets.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <p className="uppercase text-xs font-semibold tracking-wide text-muted-foreground">
            Revenue model inputs
          </p>
          {SALES_INPUTS.map((inp) => (
            <FunnelInput
              key={inp.key}
              inputDef={inp}
              value={funnel[inp.key]}
              onChange={setFunnel}
              borderColor="#8B5CF6"
            />
          ))}

          <hr className="border-border" />

          <p className="uppercase text-xs font-semibold tracking-wide text-muted-foreground">
            Marketing assumptions
          </p>
          {MKT_INPUTS.map((inp) => (
            <FunnelInput
              key={inp.key}
              inputDef={inp}
              value={funnel[inp.key]}
              onChange={setFunnel}
              borderColor="#EF4444"
            />
          ))}
        </div>

        <div className="space-y-6">
          <p className="uppercase text-xs font-semibold tracking-wide text-muted-foreground">
            Annual volumes required
          </p>

          <div className="bg-card rounded-xl border border-border p-5 space-y-5 glass-card">
            {FUNNEL_ROWS.map((row) => (
              <FunnelBar
                key={row.key}
                label={row.label}
                value={calc[row.key]}
                max={maxBar}
                colorHex={row.colorHex}
                weekly={calc.weekly[row.key]}
                daily={calc.daily[row.key]}
              />
            ))}
          </div>

          <hr className="border-border" />

          <p className="uppercase text-xs font-semibold tracking-wide text-muted-foreground">
            Marketing derived targets
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-card rounded-lg border border-border p-4 glass-card">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                Annual MQL target
              </p>
              <p className="text-2xl font-extrabold font-mono mt-1" style={{ color: "#EF4444" }}>
                {calc.mqls.toLocaleString()}
              </p>
            </div>
            <div className="bg-card rounded-lg border border-border p-4 glass-card">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                MQLs per month
              </p>
              <p className="text-2xl font-extrabold font-mono mt-1" style={{ color: "#EF4444" }}>
                {calc.monthly.mqls.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 shadow-[0_0_20px_-5px_oklch(0.7_0.15_85_/_0.15)]">
            <p className="text-sm font-semibold text-amber-400">
              Key insight
            </p>
            <p className="text-sm text-amber-300 mt-1">
              {demosSaved > 0
                ? `A +5% win rate improvement (${funnel.winRate}% \u2192 ${funnel.winRate + 5}%) would save ${demosSaved} demos per year, reducing pressure on pipeline generation.`
                : `Increasing win rate from ${funnel.winRate}% to ${funnel.winRate + 5}% would reduce demos needed from ${calc.demos} to ${improvedDemos}.`}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4">
        <Button variant="ghost" onClick={onBack}>
          &larr; Back
        </Button>
        <Button onClick={onNext}>
          Next &rarr;
        </Button>
      </div>
    </div>
  )
}
