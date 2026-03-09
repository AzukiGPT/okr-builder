import { OBJECTIVES } from "../../data/objectives"
import { TEAM_CONFIG, STAGE_CODES, BOTTLENECK_CODES, TEAMS, FOUNDER_LED_BOOST_IDS } from "../../data/config"
import { scoreObj, getRecommendationLabel } from "../../utils/scoring"
import { parseContextValue } from "../../utils/parseContextValue"
import ObjectiveCard from "../ui/objective-card"
import { Button } from "@/components/ui/button"

function sortByRecommendation(objectives, stageCode, btlnkCode, ctxBonus) {
  return [...objectives].sort((a, b) => {
    const scoreA = scoreObj(a, stageCode, btlnkCode, ctxBonus)
    const scoreB = scoreObj(b, stageCode, btlnkCode, ctxBonus)
    return scoreB - scoreA
  })
}

export default function SelectionStep({ ctx, selected, toggleObjective, onNext, onBack }) {
  const stageCode = STAGE_CODES[ctx.stage] || ""
  const btlnkCode = BOTTLENECK_CODES[ctx.bottleneck] || ""

  const parsedChurn = parseContextValue(ctx.churn)
  const founderLedNorm = (ctx.founderLed || "").trim().toLowerCase()
  const isFounderLed = founderLedNorm === "yes" || founderLedNorm === "partially"
  const ctxBonus = {
    churnBonus: parsedChurn != null && parsedChurn >= 10 ? 1 : 0,
    founderLedIds: isFounderLed ? FOUNDER_LED_BOOST_IDS : [],
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-sans font-bold text-3xl gradient-heading">
          Select your objectives
        </h2>
        <p className="text-muted-foreground mt-2">
          &#9733; Recommended objectives match your context.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {TEAMS.map((team) => {
          const cfg = TEAM_CONFIG[team]
          const count = selected[team].length

          return (
            <div
              key={team}
              className="rounded-xl p-4 gradient-border"
              style={{ "--gb-from": cfg.colorHex, "--gb-to": `${cfg.colorHex}40` }}
            >
              <p
                className="text-xs font-semibold uppercase tracking-wide"
                style={{ color: cfg.colorHex }}
              >
                {cfg.label}
              </p>
              <p className="font-mono text-2xl font-extrabold text-foreground mt-1">
                {count}
              </p>
            </div>
          )
        })}
      </div>

      {TEAMS.map((team) => {
        const cfg = TEAM_CONFIG[team]
        const objectives = OBJECTIVES[team]
        const sorted = sortByRecommendation(objectives, stageCode, btlnkCode, ctxBonus)
        const count = selected[team].length

        return (
          <div key={team} className="space-y-3">
            <div className="flex items-center gap-3">
              <div
                className="w-1 h-8 rounded-full"
                style={{ backgroundColor: cfg.colorHex }}
              />
              <h3 className="font-sans font-bold text-xl text-foreground">{cfg.label}</h3>
            </div>

            <div className="space-y-2">
              {sorted.map((obj) => {
                const score = scoreObj(obj, stageCode, btlnkCode, ctxBonus)
                const recommendation = getRecommendationLabel(score)

                return (
                  <ObjectiveCard
                    key={obj.id}
                    objective={obj}
                    isSelected={selected[team].includes(obj.id)}
                    isDisabled={false}
                    recommendation={recommendation}
                    teamConfig={cfg}
                    onToggle={() => toggleObjective(team, obj.id)}
                  />
                )
              })}
            </div>
          </div>
        )
      })}

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
