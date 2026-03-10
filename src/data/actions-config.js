export const ACTION_CHANNELS = {
  content: { label: "Content", colorHex: "#8B5CF6" },
  seo: { label: "SEO", colorHex: "#06B6D4" },
  paid: { label: "Paid", colorHex: "#F59E0B" },
  events: { label: "Events", colorHex: "#EC4899" },
  outbound: { label: "Outbound", colorHex: "#3B82F6" },
  email: { label: "Email", colorHex: "#14B8A6" },
  social: { label: "Social", colorHex: "#EF4444" },
  product: { label: "Product", colorHex: "#22C55E" },
  ops: { label: "Ops", colorHex: "#6B7280" },
}

export const ACTION_TYPES = {
  strategy: { label: "Strategy" },
  creation: { label: "Creation" },
  technical: { label: "Technical" },
  process: { label: "Process" },
  hiring: { label: "Hiring" },
}

export const ACTION_STATUSES = {
  todo: { label: "To Do", colorHex: "#6B7280" },
  in_progress: { label: "In Progress", colorHex: "#3B82F6" },
  done: { label: "Done", colorHex: "#22C55E" },
  cancelled: { label: "Cancelled", colorHex: "#EF4444" },
}

export const ACTION_PRIORITIES = {
  low: { label: "Low", colorHex: "#6B7280" },
  medium: { label: "Medium", colorHex: "#F59E0B" },
  high: { label: "High", colorHex: "#EF4444" },
  critical: { label: "Critical", colorHex: "#DC2626" },
}

export const DEFAULT_PHASES = [
  { key: "audit", name: "Audit & Research", position: 0, colorHex: "#06B6D4" },
  { key: "setup", name: "Foundation & Setup", position: 1, colorHex: "#8B5CF6" },
  { key: "launch", name: "Launch & Execution", position: 2, colorHex: "#F59E0B" },
  { key: "optimize", name: "Optimize & Iterate", position: 3, colorHex: "#22C55E" },
  { key: "scale", name: "Scale & Expand", position: 4, colorHex: "#EC4899" },
]
