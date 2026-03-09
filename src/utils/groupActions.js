import { ACTION_STATUSES, ACTION_CHANNELS, ACTION_PRIORITIES } from "../data/actions-config"
import { TEAM_CONFIG } from "../data/config"

const GROUP_CONFIGS = {
  status: {
    getKey: (a) => a.status || "todo",
    columns: Object.entries(ACTION_STATUSES).map(([key, cfg]) => ({
      key,
      label: cfg.label,
      colorHex: cfg.colorHex,
    })),
  },
  channel: {
    getKey: (a) => a.channel || "other",
    columns: [
      ...Object.entries(ACTION_CHANNELS).map(([key, cfg]) => ({
        key,
        label: cfg.label,
        colorHex: cfg.colorHex,
      })),
      { key: "other", label: "Other", colorHex: "#6B7280" },
    ],
  },
  priority: {
    getKey: (a) => a.priority || "medium",
    columns: Object.entries(ACTION_PRIORITIES).map(([key, cfg]) => ({
      key,
      label: cfg.label,
      colorHex: cfg.colorHex,
    })),
  },
  team: {
    getKey: (a, uuidToTeam) => {
      const firstKrUuid = a.kr_ids?.[0]
      return firstKrUuid ? (uuidToTeam[firstKrUuid] || "unlinked") : "unlinked"
    },
    columns: [
      ...Object.entries(TEAM_CONFIG).map(([key, cfg]) => ({
        key,
        label: cfg.label,
        colorHex: cfg.colorHex,
      })),
      { key: "unlinked", label: "Unlinked", colorHex: "#6B7280" },
    ],
  },
}

export function getGroupConfig(groupBy) {
  return GROUP_CONFIGS[groupBy] || GROUP_CONFIGS.status
}

export function groupActions(actions, groupBy, uuidToTeam) {
  const config = getGroupConfig(groupBy)
  const groups = new Map()

  for (const col of config.columns) {
    groups.set(col.key, { ...col, actions: [] })
  }

  for (const action of actions) {
    const key = groupBy === "team"
      ? config.getKey(action, uuidToTeam)
      : config.getKey(action)
    const group = groups.get(key)
    if (group) {
      group.actions.push(action)
    } else {
      const fallback = groups.values().next().value
      if (fallback) fallback.actions.push(action)
    }
  }

  return [...groups.values()]
}

export function getGroupFieldName(groupBy) {
  const map = { status: "status", channel: "channel", priority: "priority", team: null }
  return map[groupBy] ?? "status"
}
