/**
 * Compute auto-scheduled dates for actions based on phase order.
 * Actions within the same phase run in parallel.
 * Phase N+1 starts when the longest action in phase N ends.
 *
 * @param {Array} phases - sorted by position ascending
 * @param {Array} actions - all actions for the set
 * @param {string} startDate - ISO date string for the project start (defaults to today)
 * @returns {Array} actions with computed start_date and end_date
 */
export function computeSchedule(phases, actions, startDate) {
  const projectStart = startDate ? new Date(startDate) : new Date()
  projectStart.setHours(0, 0, 0, 0)

  const sortedPhases = [...phases].sort((a, b) => a.position - b.position)

  const phaseActions = new Map()
  const unassigned = []

  for (const action of actions) {
    if (action.phase_id) {
      const list = phaseActions.get(action.phase_id) || []
      list.push(action)
      phaseActions.set(action.phase_id, list)
    } else {
      unassigned.push(action)
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

function addBusinessDays(date, days) {
  const result = new Date(date)
  let added = 0
  while (added < days) {
    result.setDate(result.getDate() + 1)
    const dow = result.getDay()
    if (dow !== 0 && dow !== 6) added++
  }
  return result
}

function formatDate(date) {
  return date.toISOString().split("T")[0]
}
