import { useState } from "react"
import { ACTION_CHANNELS } from "../../data/actions-config"
import { Sparkles, Plus, Zap, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function TemplateSuggestions({
  templates, onAddFromTemplate, onBatchAdd, existingTemplateIds,
}) {
  const [batchAdding, setBatchAdding] = useState(false)

  if (!templates || templates.length === 0) return null

  const newTemplates = existingTemplateIds
    ? templates.filter((tpl) => !existingTemplateIds.has(tpl.id))
    : templates

  const handleBatchAdd = async () => {
    if (!onBatchAdd || newTemplates.length === 0) return
    setBatchAdding(true)
    try {
      await onBatchAdd(newTemplates)
    } finally {
      setBatchAdding(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <h3 className="font-sans font-bold text-sm text-foreground">Suggested actions</h3>
          <span className="text-[10px] text-muted-foreground">
            {newTemplates.length} suggestion{newTemplates.length !== 1 ? "s" : ""}
          </span>
        </div>
        {onBatchAdd && newTemplates.length > 0 && (
          <Button
            size="sm"
            onClick={handleBatchAdd}
            disabled={batchAdding}
            className="gap-1.5"
          >
            {batchAdding ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Zap className="w-3.5 h-3.5" />
            )}
            {batchAdding ? "Adding..." : `Add all (${newTemplates.length})`}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {newTemplates.map((tpl) => {
          const channel = ACTION_CHANNELS[tpl.channel]

          return (
            <div
              key={tpl.id}
              className="rounded-lg border border-border bg-card/50 p-3 space-y-2 hover:border-amber-300 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <h4 className="font-semibold text-xs text-foreground leading-tight flex-1">
                  {tpl.title}
                </h4>
                <button
                  onClick={() => onAddFromTemplate(tpl)}
                  className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-colors cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  Add
                </button>
              </div>

              {tpl.description && (
                <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed">
                  {tpl.description}
                </p>
              )}

              <div className="flex items-center gap-1 flex-wrap">
                {channel && (
                  <span
                    className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
                    style={{ backgroundColor: `${channel.colorHex}15`, color: channel.colorHex }}
                  >
                    {channel.label}
                  </span>
                )}
                {tpl.effort && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">
                    Effort: {tpl.effort}
                  </span>
                )}
                {tpl.impact && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">
                    Impact: {tpl.impact}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {existingTemplateIds && newTemplates.length === 0 && templates.length > 0 && (
        <p className="text-xs text-muted-foreground text-center py-2">
          All suggested actions have been added to your plan.
        </p>
      )}
    </div>
  )
}
