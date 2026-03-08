import FunnelBar from "../ui/FunnelBar"

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
  { label: "\uD83C\uDFC6 Deals to close", key: "deals", colorHex: "#1B4F8A" },
  { label: "\uD83D\uDCC4 Proposals to send", key: "proposals", colorHex: "#1B4F8A" },
  { label: "\uD83D\uDCBB Demos to run", key: "demos", colorHex: "#4A235A" },
  { label: "\uD83E\uDD1D Qualification meetings", key: "meetings", colorHex: "#4A235A" },
  { label: "\uD83D\uDCDE Outbound calls", key: "calls", colorHex: "#C0392B" },
]

function FunnelInput({ inputDef, value, onChange, borderColor }) {
  const { key, label, prefix, suffix, step } = inputDef

  return (
    <div className="mb-3">
      <label className="text-xs text-muted block mb-1">{label}</label>
      <div
        className="flex items-center bg-white border-2 rounded-lg overflow-hidden"
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
          className="flex-1 border-none p-3 text-lg font-bold font-mono bg-transparent outline-none"
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
        <h2 className="font-display text-3xl text-text">
          Funnel math
        </h2>
        <p className="text-muted mt-2">
          Model your revenue engine to derive activity targets.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <p className="uppercase text-xs font-semibold tracking-wide text-muted">
            Revenue model inputs
          </p>
          {SALES_INPUTS.map((inp) => (
            <FunnelInput
              key={inp.key}
              inputDef={inp}
              value={funnel[inp.key]}
              onChange={setFunnel}
              borderColor="#4A235A"
            />
          ))}

          <hr className="border-border" />

          <p className="uppercase text-xs font-semibold tracking-wide text-mkt">
            Marketing assumptions
          </p>
          {MKT_INPUTS.map((inp) => (
            <FunnelInput
              key={inp.key}
              inputDef={inp}
              value={funnel[inp.key]}
              onChange={setFunnel}
              borderColor="#C0392B"
            />
          ))}
        </div>

        <div className="space-y-6">
          <p className="uppercase text-xs font-semibold tracking-wide text-muted">
            Annual volumes required
          </p>

          <div className="bg-white rounded-xl border border-border p-5 space-y-5">
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

          <p className="uppercase text-xs font-semibold tracking-wide text-mkt">
            Marketing derived targets
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-lg border border-border p-4">
              <p className="text-xs text-muted uppercase tracking-wide">
                Annual MQL target
              </p>
              <p className="text-2xl font-extrabold font-mono text-mkt mt-1">
                {calc.mqls.toLocaleString()}
              </p>
            </div>
            <div className="bg-white rounded-lg border border-border p-4">
              <p className="text-xs text-muted uppercase tracking-wide">
                MQLs per month
              </p>
              <p className="text-2xl font-extrabold font-mono text-mkt mt-1">
                {calc.monthly.mqls.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-sm font-semibold text-amber-900">
              Key insight
            </p>
            <p className="text-sm text-amber-800 mt-1">
              {demosSaved > 0
                ? `A +5% win rate improvement (${funnel.winRate}% \u2192 ${funnel.winRate + 5}%) would save ${demosSaved} demos per year, reducing pressure on pipeline generation.`
                : `Increasing win rate from ${funnel.winRate}% to ${funnel.winRate + 5}% would reduce demos needed from ${calc.demos} to ${improvedDemos}.`}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4">
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-muted hover:text-text transition-colors"
        >
          &larr; Back
        </button>
        <button
          type="button"
          onClick={onNext}
          className="bg-accent text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          Next &rarr;
        </button>
      </div>
    </div>
  )
}
