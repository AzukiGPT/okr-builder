/**
 * Compute auto-scheduled dates for actions based on phase order and dependencies.
 *
 * @param {Array} phases - sorted by position ascending
 * @param {Array} actions - all actions for the set
 * @param {string} [startDate] - ISO date string for the project start (defaults to today)
 * @param {Array} [dependencies] - action_dependencies rows with { predecessor_id, successor_id, dep_type, lag_days }
 * @returns {Array} actions with computed start_date and end_date
 */
export function computeSchedule(phases, actions, startDate, dependencies) {
  if (!actions || actions.length === 0) return actions || []

  const phaseScheduled = scheduleByPhases(phases, actions, startDate)

  if (!dependencies || dependencies.length === 0) return phaseScheduled

  return scheduleByDependencies(phaseScheduled, dependencies)
}

/**
 * Phase-based scheduling: actions within a phase run in parallel,
 * phase N+1 starts after the longest action in phase N ends.
 */
function scheduleByPhases(phases, actions, startDate) {
  const projectStart = startDate ? new Date(startDate) : new Date()
  projectStart.setHours(0, 0, 0, 0)

  const sortedPhases = [...(phases || [])].sort((a, b) => a.position - b.position)

  const phaseActions = new Map()
  for (const action of actions) {
    if (action.phase_id) {
      const list = phaseActions.get(action.phase_id) || []
      list.push(action)
      phaseActions.set(action.phase_id, list)
    }
  }

  const scheduled = new Map()
  let currentStart = projectStart

  for (const phase of sortedPhases) {
    const phaseActionList = phaseActions.get(phase.id) || []
    let maxEnd = currentStart

    for (const action of phaseActionList) {
      if (action.start_date && action.end_date) {
        const existingEnd = new Date(action.end_date)
        if (existingEnd > maxEnd) maxEnd = existingEnd
        scheduled.set(action.id, { start_date: action.start_date, end_date: action.end_date })
        continue
      }

      const days = action.estimated_days || 5
      const end = addBusinessDays(currentStart, days)

      scheduled.set(action.id, {
        start_date: formatDate(currentStart),
        end_date: formatDate(end),
      })

      if (end > maxEnd) maxEnd = end
    }

    currentStart = addBusinessDays(maxEnd, 1)
  }

  return actions.map((action) => {
    const dates = scheduled.get(action.id)
    if (dates) return { ...action, ...dates }
    return action
  })
}

/**
 * Dependency-based scheduling using topological sort (Kahn's algorithm).
 * Applies FS/SS/FF/SF constraints with lag_days on top of phase-scheduled dates.
 */
function scheduleByDependencies(actions, dependencies) {
  const actionMap = new Map()
  for (const action of actions) {
    actionMap.set(action.id, { ...action })
  }

  // Build adjacency list and in-degree count
  const successors = new Map()
  const inDegree = new Map()

  for (const action of actions) {
    successors.set(action.id, [])
    inDegree.set(action.id, 0)
  }

  const relevantDeps = dependencies.filter(
    (d) => actionMap.has(d.predecessor_id) && actionMap.has(d.successor_id)
  )

  for (const dep of relevantDeps) {
    const list = successors.get(dep.predecessor_id) || []
    list.push(dep)
    successors.set(dep.predecessor_id, list)

    inDegree.set(dep.successor_id, (inDegree.get(dep.successor_id) || 0) + 1)
  }

  // Kahn's algorithm: process nodes with no incoming edges first
  const queue = []
  for (const [id, degree] of inDegree.entries()) {
    if (degree === 0) queue.push(id)
  }

  const processed = new Set()

  while (queue.length > 0) {
    const currentId = queue.shift()
    if (processed.has(currentId)) continue
    processed.add(currentId)

    const current = actionMap.get(currentId)
    if (!current) continue

    const deps = successors.get(currentId) || []
    for (const dep of deps) {
      const successor = actionMap.get(dep.successor_id)
      if (!successor) continue

      const newDates = applyConstraint(current, successor, dep)
      actionMap.set(dep.successor_id, { ...successor, ...newDates })

      const newDeg = (inDegree.get(dep.successor_id) || 1) - 1
      inDegree.set(dep.successor_id, newDeg)

      if (newDeg <= 0) {
        queue.push(dep.successor_id)
      }
    }
  }

  return actions.map((a) => actionMap.get(a.id) || a)
}

/**
 * Apply a single dependency constraint between predecessor and successor.
 * Returns { start_date, end_date } for the successor.
 *
 * Types:
 *   FS (Finish-to-Start): successor starts after predecessor finishes + lag
 *   SS (Start-to-Start): successor starts after predecessor starts + lag
 *   FF (Finish-to-Finish): successor finishes after predecessor finishes + lag
 *   SF (Start-to-Finish): successor finishes after predecessor starts + lag
 */
function applyConstraint(predecessor, successor, dep) {
  const depType = dep.dep_type || "FS"
  const lagDays = dep.lag_days || 0
  const duration = successor.estimated_days || 5

  const predStart = predecessor.start_date ? new Date(predecessor.start_date) : new Date()
  const predEnd = predecessor.end_date ? new Date(predecessor.end_date) : addBusinessDays(predStart, predecessor.estimated_days || 5)
  const succStart = successor.start_date ? new Date(successor.start_date) : new Date()
  const succEnd = successor.end_date ? new Date(successor.end_date) : addBusinessDays(succStart, duration)

  let newStart
  let newEnd

  switch (depType) {
    case "FS": {
      // Successor starts after predecessor finishes + lag
      const earliest = addBusinessDays(predEnd, lagDays + 1)
      newStart = earliest > succStart ? earliest : succStart
      newEnd = addBusinessDays(newStart, duration)
      break
    }
    case "SS": {
      // Successor starts after predecessor starts + lag
      const earliest = addBusinessDays(predStart, lagDays)
      newStart = earliest > succStart ? earliest : succStart
      newEnd = addBusinessDays(newStart, duration)
      break
    }
    case "FF": {
      // Successor finishes after predecessor finishes + lag
      const earliestEnd = addBusinessDays(predEnd, lagDays)
      newEnd = earliestEnd > succEnd ? earliestEnd : succEnd
      // Backfill start from end
      newStart = addBusinessDays(newEnd, -duration)
      break
    }
    case "SF": {
      // Successor finishes after predecessor starts + lag
      const earliestEnd = addBusinessDays(predStart, lagDays)
      newEnd = earliestEnd > succEnd ? earliestEnd : succEnd
      // Backfill start from end
      newStart = addBusinessDays(newEnd, -duration)
      break
    }
    default: {
      return {}
    }
  }

  return {
    start_date: formatDate(newStart),
    end_date: formatDate(newEnd),
  }
}

/**
 * Add (or subtract) business days from a date, skipping weekends.
 * Positive days go forward, negative days go backward.
 */
function addBusinessDays(date, days) {
  const result = new Date(date)
  const direction = days >= 0 ? 1 : -1
  let remaining = Math.abs(days)

  while (remaining > 0) {
    result.setDate(result.getDate() + direction)
    const dow = result.getDay()
    if (dow !== 0 && dow !== 6) remaining--
  }

  return result
}

function formatDate(date) {
  return date.toISOString().split("T")[0]
}
