import { useState, useCallback } from "react"
import { OBJECTIVES } from "../../data/objectives"
import { TEAM_CONFIG, STAGE_CODES, BOTTLENECK_CODES, TEAMS, FOUNDER_LED_BOOST_IDS } from "../../data/config"
import { scoreObj, getRecommendationLabel } from "../../utils/scoring"
import { parseContextValue } from "../../utils/parseContextValue"
import ObjectiveCard from "../ui/objective-card"
import { Button } from "@/components/ui/button"
import { Plus, Trash2 } from "lucide-react"

function sortByRecommendation(objectives, stageCode, btlnkCode, ctxBonus) {
  return [...objectives].sort((a, b) => {
    const scoreA = scoreObj(a, stageCode, btlnkCode, ctxBonus)
    const scoreB = scoreObj(b, stageCode, btlnkCode, ctxBonus)
    return scoreB - scoreA
  })
}

const TEAM_PREFIXES = { sales: "SC", marketing: "MC", csm: "CC" }

function nextCustomObjId(team, customObjs) {
  const prefix = TEAM_PREFIXES[team]
  const existing = customObjs || []
  const maxNum = existing.reduce((max, obj) => {
    const match = obj.id.match(new RegExp(`^${prefix}(\\d+)$`))
    return match ? Math.max(max, parseInt(match[1])) : max
  }, 0)
  return `${prefix}${maxNum + 1}`
}

export default function SelectionStep({
  ctx,
  selected,
  toggleObjective,
  addCustomObjective,
  removeCustomObjective,
  onNext,
  onBack,
}) {
  const stageCode = STAGE_CODES[ctx.stage] || ""
  const btlnkCode = BOTTLENECK_CODES[ctx.bottleneck] || ""
  const [addingTeam, setAddingTeam] = useState(null)
  const [newTitle, setNewTitle] = useState("")

  const parsedChurn = parseContextValue(ctx.churn)
  const founderLedNorm = (ctx.founderLed || "").trim().toLowerCase()
  const isFounderLed = founderLedNorm === "yes" || founderLedNorm === "partially"
  const ctxBonus = {
    churnBonus: parsedChurn != null && parsedChurn >= 10 ? 1 : 0,
    founderLedIds: isFounderLed ? FOUNDER_LED_BOOST_IDS : [],
  }

  const customObjectives = selected.customObjectives || { sales: [], marketing: [], csm: [] }
  const customKRs = selected.customKRs || {}

  const handleAddObjective = useCallback((team) => {
    if (!newTitle.trim()) return
    const id = nextCustomObjId(team, customObjectives[team])
    addCustomObjective(team, { id, title: newTitle.trim() })
    setNewTitle("")
    setAddingTeam(null)
  }, [newTitle, customObjectives, addCustomObjective])

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
        const teamCustomObjs = customObjectives[team] || []

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

              {/* Custom objectives */}
              {teamCustomObjs.map((obj) => (
                <div key={obj.id} className="relative group">
                  <ObjectiveCard
                    objective={{
                      ...obj,
                      krs: customKRs[obj.id] || [],
                      when: "Custom objective",
                    }}
                    isSelected={selected[team].includes(obj.id)}
                    isDisabled={false}
                    recommendation={null}
                    teamConfig={cfg}
                    onToggle={() => toggleObjective(team, obj.id)}
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      removeCustomObjective(team, obj.id)
                    }}
                    className="absolute top-3 right-12 p-1.5 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                    title="Delete custom objective"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              {/* Add custom objective form */}
              {addingTeam === team ? (
                <div className="flex items-center gap-2 p-3 rounded-lg border border-dashed border-border bg-card/50">
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddObjective(team)
                      if (e.key === "Escape") { setAddingTeam(null); setNewTitle("") }
                    }}
                    placeholder="Objective title..."
                    className="flex-1 px-3 py-1.5 text-sm border rounded-md bg-background border-border text-foreground focus:outline-none focus:ring-1"
                    style={{ "--tw-ring-color": cfg.colorHex }}
                    autoFocus
                  />
                  <Button
                    size="sm"
                    onClick={() => handleAddObjective(team)}
                    disabled={!newTitle.trim()}
                  >
                    Add
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => { setAddingTeam(null); setNewTitle("") }}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <button
                  onClick={() => { setAddingTeam(team); setNewTitle("") }}
                  className="flex items-center gap-2 w-full p-3 rounded-lg border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span className="text-sm">Add custom objective</span>
                </button>
              )}
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
