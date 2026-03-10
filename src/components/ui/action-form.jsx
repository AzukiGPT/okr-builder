import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ACTION_CHANNELS, ACTION_TYPES, ACTION_PRIORITIES } from "../../data/actions-config"
import { TEAM_CONFIG, TEAMS } from "../../data/config"
import { OBJECTIVES } from "../../data/objectives"
import { ChevronDown, ChevronRight } from "lucide-react"

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

function SectionHeader({ label }) {
  return (
    <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wide border-b border-border pb-1 mb-2">
      {label}
    </p>
  )
}

function truncate(text, max) {
  if (!text || text.length <= max) return text
  return text.slice(0, max) + "…"
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
    if (initialData?.kr_ids) return initialData.kr_ids
    return []
  })
  const [phaseId, setPhaseId] = useState(initialData?.phase_id || "")
  const [estimatedDays, setEstimatedDays] = useState(initialData?.estimated_days || 10)
  const [showBudget, setShowBudget] = useState(() => (initialData?.budget_estimated || 0) > 0)

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

  const hasKRs = krStatuses && Object.keys(krStatuses).length > 0

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border-2 border-primary/30 bg-card p-4 space-y-3">
      <p className="text-xs uppercase font-semibold text-primary tracking-wide">
        {initialData ? "Edit action" : "New action"}
      </p>

      {/* ── Essentials ── */}
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

      {/* ── Planning ── */}
      <div className="pt-2">
        <SectionHeader label="Planning" />
        <div className="space-y-2">
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
        </div>
      </div>

      {/* ── Budget (collapsed by default) ── */}
      <div className="pt-2">
        <button
          type="button"
          onClick={() => setShowBudget((v) => !v)}
          className="flex items-center gap-1 w-full text-left cursor-pointer group"
        >
          {showBudget
            ? <ChevronDown className="w-3 h-3 text-muted-foreground" />
            : <ChevronRight className="w-3 h-3 text-muted-foreground" />}
          <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wide group-hover:text-foreground transition-colors">
            Budget
          </span>
        </button>
        {showBudget && (
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wide">Amount</label>
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
        )}
      </div>

      {/* ── Link to KRs ── */}
      {hasKRs && (
        <div className="pt-2">
          <SectionHeader label="Link to KRs" />
          <div className="space-y-3 max-h-56 overflow-y-auto">
            {TEAMS.map((team) => {
              if (!selected?.[team]?.length) return null
              const cfg = TEAM_CONFIG[team]
              const objectives = OBJECTIVES[team].filter((obj) => selected[team].includes(obj.id))
              if (objectives.length === 0) return null

              return (
                <div key={team}>
                  <p className="text-[10px] font-bold mb-1.5" style={{ color: cfg.colorHex }}>{cfg.label}</p>
                  <div className="space-y-2">
                    {objectives.map((obj) => (
                      <div key={obj.id} className="space-y-1">
                        <p className="text-[10px] text-muted-foreground font-medium pl-1">
                          {obj.id} — {truncate(obj.title, 60)}
                        </p>
                        <div className="space-y-0.5 pl-1">
                          {obj.krs.map((kr) => {
                            const krData = krStatuses[kr.id]
                            if (!krData?.uuid) return null
                            const isSelected = selectedKRs.includes(krData.uuid)
                            return (
                              <button
                                key={kr.id}
                                type="button"
                                onClick={() => toggleKR(krData.uuid)}
                                className="flex items-center gap-2 w-full text-left px-1.5 py-1 rounded hover:bg-muted/50 transition-colors cursor-pointer group"
                              >
                                <span
                                  className="w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-colors"
                                  style={{
                                    borderColor: isSelected ? cfg.colorHex : "var(--border)",
                                    backgroundColor: isSelected ? cfg.colorHex : "transparent",
                                  }}
                                >
                                  {isSelected && (
                                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                  )}
                                </span>
                                <span
                                  className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded shrink-0"
                                  style={{
                                    backgroundColor: isSelected ? `${cfg.colorHex}15` : "var(--muted)",
                                    color: isSelected ? cfg.colorHex : "var(--muted-foreground)",
                                  }}
                                >
                                  {kr.id}
                                </span>
                                <span className="text-[11px] text-muted-foreground group-hover:text-foreground transition-colors truncate">
                                  {truncate(kr.text, 50)}
                                </span>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    ))}
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
          {initialData?.id ? "Update" : "Add"}
        </Button>
      </div>
    </form>
  )
}
