import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ACTION_CHANNELS, ACTION_TYPES, ACTION_PRIORITIES } from "../../data/actions-config"
import { TEAM_CONFIG, TEAMS } from "../../data/config"
import { OBJECTIVES } from "../../data/objectives"

function SelectField({ label, value, onChange, options }) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wide">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-2 py-1.5 border rounded text-xs bg-background border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
      >
        <option value="">-- select --</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  )
}

function computeDefaultKRs(selected, krStatuses) {
  if (!selected || !krStatuses) return []
  const uuids = []
  TEAMS.forEach((team) => {
    if (!selected[team]?.length) return
    const objectives = OBJECTIVES[team].filter((obj) => selected[team].includes(obj.id))
    objectives.forEach((obj) => {
      obj.krs.forEach((kr) => {
        const krData = krStatuses[kr.id]
        if (krData?.uuid) uuids.push(krData.uuid)
      })
    })
  })
  return uuids
}

export default function ActionForm({ onSubmit, onCancel, initialData, selected, krStatuses, phases }) {
  const [title, setTitle] = useState(initialData?.title || "")
  const [description, setDescription] = useState(initialData?.description || "")
  const [channel, setChannel] = useState(initialData?.channel || "")
  const [actionType, setActionType] = useState(initialData?.action_type || "")
  const [priority, setPriority] = useState(initialData?.priority || "medium")
  const [startDate, setStartDate] = useState(initialData?.start_date || "")
  const [endDate, setEndDate] = useState(initialData?.end_date || "")
  const [budgetEstimated, setBudgetEstimated] = useState(initialData?.budget_estimated || "")
  const [currency, setCurrency] = useState(initialData?.currency || "EUR")
  const [selectedKRs, setSelectedKRs] = useState(() => {
    // Editing existing action: use its kr_ids
    if (initialData?.kr_ids) return initialData.kr_ids
    // New action: pre-select all KRs by default
    return computeDefaultKRs(selected, krStatuses)
  })
  const [phaseId, setPhaseId] = useState(initialData?.phase_id || "")
  const [estimatedDays, setEstimatedDays] = useState(initialData?.estimated_days || 10)

  const toggleKR = (uuid) => {
    setSelectedKRs((prev) =>
      prev.includes(uuid) ? prev.filter((id) => id !== uuid) : [...prev, uuid]
    )
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!title.trim()) return

    onSubmit({
      title: title.trim(),
      description: description.trim() || null,
      channel: channel || null,
      action_type: actionType || null,
      priority,
      start_date: startDate || null,
      end_date: endDate || null,
      budget_estimated: budgetEstimated ? Number(budgetEstimated) : null,
      currency,
      phase_id: phaseId || null,
      estimated_days: estimatedDays ? Number(estimatedDays) : 5,
      kr_ids: selectedKRs,
      source: initialData?.source || "manual",
      template_id: initialData?.template_id || null,
    })
  }

  const channelOptions = Object.entries(ACTION_CHANNELS).map(([k, v]) => ({ value: k, label: v.label }))
  const typeOptions = Object.entries(ACTION_TYPES).map(([k, v]) => ({ value: k, label: v.label }))
  const priorityOptions = Object.entries(ACTION_PRIORITIES).map(([k, v]) => ({ value: k, label: v.label }))

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border-2 border-primary/30 bg-card p-4 space-y-3">
      <p className="text-xs uppercase font-semibold text-primary tracking-wide">
        {initialData ? "Edit action" : "New action"}
      </p>

      <div className="space-y-1">
        <label className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wide">Title *</label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Action title..."
          className="text-sm"
          autoFocus
        />
      </div>

      <div className="space-y-1">
        <label className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wide">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional description..."
          rows={2}
          className="w-full px-3 py-2 border rounded text-xs bg-background border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
        />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <SelectField label="Channel" value={channel} onChange={setChannel} options={channelOptions} />
        <SelectField label="Type" value={actionType} onChange={setActionType} options={typeOptions} />
        <SelectField label="Priority" value={priority} onChange={setPriority} options={priorityOptions} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wide">Phase</label>
          <select
            value={phaseId}
            onChange={(e) => setPhaseId(e.target.value)}
            className="w-full px-2 py-1.5 border rounded text-xs bg-background border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
          >
            <option value="">-- no phase --</option>
            {(phases || []).map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wide">Est. days</label>
          <input
            type="number"
            min={1}
            max={90}
            value={estimatedDays}
            onChange={(e) => setEstimatedDays(e.target.value)}
            className="w-full px-2 py-1.5 border rounded text-xs bg-background border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wide">Start date</label>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="text-xs" />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wide">End date</label>
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="text-xs" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wide">Budget</label>
          <Input
            type="number"
            min={0}
            value={budgetEstimated}
            onChange={(e) => setBudgetEstimated(e.target.value)}
            placeholder="0"
            className="text-xs"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wide">Currency</label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="w-full px-2 py-1.5 border rounded text-xs bg-background border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
          >
            <option value="EUR">EUR</option>
            <option value="USD">USD</option>
            <option value="GBP">GBP</option>
          </select>
        </div>
      </div>

      {/* KR Picker */}
      {krStatuses && Object.keys(krStatuses).length > 0 && (
        <div className="space-y-2">
          <label className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wide">Link to KRs</label>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {TEAMS.map((team) => {
              if (!selected?.[team]?.length) return null
              const cfg = TEAM_CONFIG[team]
              const objectives = OBJECTIVES[team].filter((obj) => selected[team].includes(obj.id))

              return (
                <div key={team}>
                  <p className="text-[10px] font-bold mb-1" style={{ color: cfg.colorHex }}>{cfg.label}</p>
                  <div className="flex flex-wrap gap-1">
                    {objectives.flatMap((obj) =>
                      obj.krs.map((kr) => {
                        const krData = krStatuses[kr.id]
                        if (!krData?.uuid) return null
                        const isSelected = selectedKRs.includes(krData.uuid)
                        return (
                          <button
                            key={kr.id}
                            type="button"
                            onClick={() => toggleKR(krData.uuid)}
                            className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold border transition-colors cursor-pointer"
                            style={{
                              backgroundColor: isSelected ? `${cfg.colorHex}20` : "transparent",
                              borderColor: isSelected ? cfg.colorHex : "var(--border)",
                              color: isSelected ? cfg.colorHex : "var(--muted-foreground)",
                            }}
                          >
                            {kr.id}
                          </button>
                        )
                      })
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="flex items-center justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={!title.trim()}>
          {initialData ? "Update" : "Create"}
        </Button>
      </div>
    </form>
  )
}
