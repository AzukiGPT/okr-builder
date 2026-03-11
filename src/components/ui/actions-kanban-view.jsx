// src/components/ui/actions-kanban-view.jsx
import { useCallback, useState, useMemo } from "react"
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  pointerWithin,
  rectIntersection,
} from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { groupActions, getGroupFieldName } from "../../utils/groupActions"
import ActionCard from "./action-card"

// Custom collision detection: pointerWithin first (best for containers), then rectIntersection fallback
function kanbanCollisionDetection(args) {
  const pointerCollisions = pointerWithin(args)
  if (pointerCollisions.length > 0) return pointerCollisions
  return rectIntersection(args)
}

function SortableCard({ action, onEdit, onDelete, krStatuses, phases }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: action.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    touchAction: "none",
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <ActionCard action={action} onEdit={onEdit} onDelete={onDelete} krStatuses={krStatuses} phases={phases} compact />
    </div>
  )
}

function KanbanColumn({ group, onEdit, onDelete, krStatuses, phases }) {
  // Droppable covers the entire column (header + card area)
  const { setNodeRef, isOver } = useDroppable({ id: group.key })

  return (
    <div ref={setNodeRef} className="flex-shrink-0 w-64 flex flex-col">
      <div
        className="rounded-t-lg px-3 py-2 flex items-center justify-between"
        style={{ backgroundColor: `${group.colorHex}12` }}
      >
        <span className="font-bold text-xs" style={{ color: group.colorHex }}>
          {group.label}
        </span>
        <span className="text-[10px] font-mono text-muted-foreground">
          {group.actions.length}
        </span>
      </div>
      <div
        className={`flex-1 rounded-b-lg border border-t-0 border-border p-2 space-y-2 min-h-[120px] transition-colors ${
          isOver ? "bg-primary/5 border-primary/30" : "bg-muted/20"
        }`}
      >
        <SortableContext
          items={group.actions.map((a) => a.id)}
          strategy={verticalListSortingStrategy}
        >
          {group.actions.map((action) => (
            <SortableCard
              key={action.id}
              action={action}
              onEdit={onEdit}
              onDelete={onDelete}
              krStatuses={krStatuses}
              phases={phases}
            />
          ))}
        </SortableContext>
        {group.actions.length === 0 && (
          <p className="text-[10px] text-muted-foreground text-center py-4">
            Drop here
          </p>
        )}
      </div>
    </div>
  )
}

export default function ActionsKanbanView({
  actions,
  groupBy,
  uuidToTeam,
  krStatuses,
  phases,
  onEdit,
  onDelete,
  onUpdateAction,
}) {
  const [activeId, setActiveId] = useState(null)
  const groups = groupActions(actions, groupBy, uuidToTeam, phases, krStatuses)
  const fieldName = getGroupFieldName(groupBy)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  // Build a set of column keys for fast lookup
  const groupKeySet = useMemo(
    () => new Set(groups.map((g) => g.key)),
    [groups]
  )

  const findContainer = useCallback((id) => {
    // Check if id is itself a column key
    if (groupKeySet.has(id)) return id
    // Otherwise find the column containing this action
    for (const group of groups) {
      if (group.actions.some((a) => a.id === id)) return group.key
    }
    return null
  }, [groups, groupKeySet])

  const handleDragStart = useCallback((event) => {
    setActiveId(event.active.id)
  }, [])

  const handleDragEnd = useCallback((event) => {
    const { active, over } = event
    setActiveId(null)
    if (!over || !fieldName) return

    const activeContainer = findContainer(active.id)
    const overContainer = findContainer(over.id)

    if (!overContainer || activeContainer === overContainer) return

    onUpdateAction(active.id, { [fieldName]: overContainer })
  }, [findContainer, fieldName, onUpdateAction])

  const activeAction = activeId ? actions.find((a) => a.id === activeId) : null

  if (actions.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-border bg-card/50 p-12 text-center">
        <p className="text-muted-foreground text-sm">No actions yet. Add your first action above.</p>
      </div>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={kanbanCollisionDetection}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-3 overflow-x-auto pb-4">
        {groups.map((group) => (
          <KanbanColumn
            key={group.key}
            group={group}
            onEdit={onEdit}
            onDelete={onDelete}
            krStatuses={krStatuses}
            phases={phases}
          />
        ))}
      </div>
      <DragOverlay dropAnimation={null}>
        {activeAction ? (
          <ActionCard action={activeAction} onEdit={() => {}} onDelete={() => {}} krStatuses={krStatuses} phases={phases} compact />
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
