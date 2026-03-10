import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"

const DEP_TYPES = [
  { value: "FS", label: "Finish \u2192 Start" },
  { value: "SS", label: "Start \u2192 Start" },
  { value: "FF", label: "Finish \u2192 Finish" },
  { value: "SF", label: "Start \u2192 Finish" },
]

export default function DependencyCreator({
  dragState, // { fromId, fromX, fromY, currentX, currentY } or null
  onComplete,
  onCancel,
}) {
  const [formState, setFormState] = useState(null) // { fromId, toId, x, y }

  const handleDrop = useCallback((toId, x, y) => {
    if (!dragState || toId === dragState.fromId) {
      onCancel()
      return
    }
    setFormState({
      fromId: dragState.fromId,
      toId,
      x,
      y,
    })
  }, [dragState, onCancel])

  const handleSubmit = useCallback((depType, lagDays) => {
    if (!formState) return
    onComplete({
      predecessor_id: formState.fromId,
      successor_id: formState.toId,
      dep_type: depType,
      lag_days: lagDays,
    })
    setFormState(null)
  }, [formState, onComplete])

  const handleCancel = useCallback(() => {
    setFormState(null)
    onCancel()
  }, [onCancel])

  return (
    <>
      {/* Drag line */}
      {dragState && !formState && (
        <svg
          className="absolute top-0 left-0 pointer-events-none z-30"
          width="100%"
          height="100%"
          style={{ overflow: "visible" }}
        >
          <line
            x1={dragState.fromX}
            y1={dragState.fromY}
            x2={dragState.currentX}
            y2={dragState.currentY}
            stroke="var(--primary, #8B5CF6)"
            strokeWidth={2}
            strokeDasharray="6 3"
            opacity={0.8}
          />
          <circle
            cx={dragState.currentX}
            cy={dragState.currentY}
            r={4}
            fill="var(--primary, #8B5CF6)"
            opacity={0.8}
          />
        </svg>
      )}

      {/* Mini-form popup */}
      {formState && (
        <div
          className="absolute z-40 bg-popover border border-border rounded-lg shadow-lg p-3 space-y-2"
          style={{
            left: formState.x,
            top: formState.y,
            minWidth: 180,
          }}
        >
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
            New dependency
          </p>
          <div className="space-y-1">
            {DEP_TYPES.map((dt) => (
              <button
                key={dt.value}
                type="button"
                className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-muted transition-colors"
                onClick={() => handleSubmit(dt.value, 0)}
              >
                {dt.label}
              </button>
            ))}
          </div>
          <Button variant="ghost" size="sm" className="w-full text-xs h-7" onClick={handleCancel}>
            Cancel
          </Button>
        </div>
      )}
    </>
  )
}

export { DependencyCreator }
