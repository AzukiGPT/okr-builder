export const STAGE_CODES = {
  "Early (<€1M ARR)": "E",
  "Growth (€1M–€10M ARR)": "G",
  "Scale (>€10M ARR)": "S",
}

export const BOTTLENECK_CODES = {
  "Not enough pipeline": "no_pipeline",
  "Pipeline exists but conversion is low": "pipeline_low",
  "Churn is too high": "churn",
  "Growth is good but not profitable": "not_profitable",
  "Brand unknown in target market": "brand_unknown",
  "PMF still being validated": "pmf",
}

export const TEAM_CONFIG = {
  sales: {
    key: "sales",
    label: "Sales",
    color: "sales",
    colorHex: "#3B82F6",
  },
  marketing: {
    key: "marketing",
    label: "Marketing",
    color: "mkt",
    colorHex: "#EF4444",
  },
  csm: {
    key: "csm",
    label: "Customer Success",
    color: "csm",
    colorHex: "#22C55E",
  },
}

export const TEAMS = Object.keys(TEAM_CONFIG)
export const STAGES = Object.keys(STAGE_CODES)
export const BOTTLENECKS = Object.keys(BOTTLENECK_CODES)
