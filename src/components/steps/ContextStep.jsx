import { STAGES, BOTTLENECKS } from "../../data/config"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

function RadioGroup({ label, options, value, onChange, selectedBorderColor }) {
  return (
    <div
      className="bg-card rounded-xl p-5 border-2 transition-colors glass-card"
      style={{ borderColor: value ? selectedBorderColor : "oklch(0.82 0.005 280)" }}
    >
      <p className="uppercase text-xs font-semibold tracking-wide text-muted-foreground mb-3">
        {label}
      </p>
      <div className="space-y-2">
        {options.map((opt) => {
          const isSelected = value === opt

          return (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt)}
              className="flex items-center gap-3 w-full text-left py-1.5 cursor-pointer group"
            >
              <span
                className="flex items-center justify-center shrink-0 rounded-full"
                style={{
                  width: 18,
                  height: 18,
                  border: isSelected ? "none" : "2px solid oklch(0.82 0.005 280)",
                  backgroundColor: isSelected ? selectedBorderColor : "transparent",
                }}
              >
                {isSelected && (
                  <span
                    className="block rounded-full bg-white"
                    style={{ width: 6, height: 6 }}
                  />
                )}
              </span>
              <span
                className={cn(
                  "text-sm transition-colors",
                  isSelected
                    ? "font-semibold text-foreground"
                    : "text-muted-foreground group-hover:text-foreground"
                )}
              >
                {opt}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function TextInputCard({ label, value, placeholder, onChange }) {
  return (
    <div className="bg-card rounded-xl p-5 border border-border glass-card">
      <label className="uppercase text-xs font-semibold tracking-wide text-muted-foreground block mb-2">
        {label}
      </label>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border-b-2 border-border bg-transparent text-sm font-semibold text-foreground outline-none focus:border-primary transition-colors py-1"
      />
    </div>
  )
}

export default function ContextStep({ ctx, setCtx, onNext }) {
  const contextReady = ctx.stage && ctx.bottleneck

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-sans font-bold text-3xl gradient-heading">
          What's your situation?
        </h2>
        <p className="text-muted-foreground mt-2">
          Your answers determine which objectives are recommended.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <div className="bg-card rounded-xl p-5 border border-border glass-card">
            <label className="uppercase text-xs font-semibold tracking-wide text-muted-foreground block mb-2">
              Company name
            </label>
            <input
              type="text"
              value={ctx.company}
              placeholder="e.g. Acme Corp"
              onChange={(e) => setCtx("company", e.target.value)}
              className="w-full border-none bg-transparent text-lg font-semibold text-foreground outline-none"
            />
          </div>
        </div>

        <RadioGroup
          label="Company stage"
          options={STAGES}
          value={ctx.stage}
          onChange={(val) => setCtx("stage", val)}
          selectedBorderColor="#8B5CF6"
        />

        <RadioGroup
          label="Primary bottleneck"
          options={BOTTLENECKS}
          value={ctx.bottleneck}
          onChange={(val) => setCtx("bottleneck", val)}
          selectedBorderColor="#EF4444"
        />

        <TextInputCard
          label="Current ARR"
          value={ctx.arr}
          placeholder="e.g. &euro;800k"
          onChange={(val) => setCtx("arr", val)}
        />
        <TextInputCard
          label="Win rate"
          value={ctx.winRate}
          placeholder="e.g. 20%"
          onChange={(val) => setCtx("winRate", val)}
        />
        <TextInputCard
          label="Annual churn"
          value={ctx.churn}
          placeholder="e.g. 8%"
          onChange={(val) => setCtx("churn", val)}
        />
        <RadioGroup
          label="Founder-led sales?"
          options={["Yes", "Partially", "No"]}
          value={ctx.founderLed}
          onChange={(val) => setCtx("founderLed", val)}
          selectedBorderColor="#F59E0B"
        />
      </div>

      {contextReady && (
        <div className="bg-primary/10 rounded-xl p-5 border border-primary/20 shadow-[0_0_20px_-8px_oklch(0.55_0.2_280_/_0.15)]">
          <div className="flex items-start gap-3">
            <span className="text-primary text-xl shrink-0" aria-hidden="true">
              &#10003;
            </span>
            <div className="flex-1">
              <p className="font-semibold text-foreground">
                Context set. Recommendations are ready.
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Stage: <strong>{ctx.stage}</strong> &middot; Bottleneck:{" "}
                <strong>{ctx.bottleneck}</strong>
              </p>
            </div>
            <Button onClick={onNext}>
              View recommendations &rarr;
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
