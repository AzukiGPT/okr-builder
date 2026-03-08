import { useMemo } from "react"
import { WORKING_WEEKS, WORKING_DAYS } from "../data/funnelDefaults"

function safeDivide(numerator, rate) {
  return Math.round(numerator / Math.max(rate / 100, 0.001))
}

export function useFunnelCalc(funnel) {
  return useMemo(() => {
    const deals = Math.round(funnel.target / Math.max(funnel.acv, 1))
    const proposals = safeDivide(deals, funnel.winRate)
    const demos = safeDivide(proposals, funnel.demoToProp)
    const meetings = safeDivide(demos, funnel.meetToDemo)
    const calls = safeDivide(meetings, funnel.callToMeet)
    const mktDemos = Math.round(demos * funnel.mktShare / 100)
    const mqls = safeDivide(mktDemos, funnel.l2mql)

    const wk = WORKING_WEEKS
    const dy = WORKING_DAYS

    return {
      deals,
      proposals,
      demos,
      meetings,
      calls,
      mktDemos,
      mqls,
      weekly: {
        deals: (deals / wk).toFixed(1),
        proposals: (proposals / wk).toFixed(1),
        demos: (demos / wk).toFixed(1),
        meetings: (meetings / wk).toFixed(1),
        calls: Math.round(calls / wk),
      },
      daily: {
        deals: (deals / dy).toFixed(2),
        proposals: (proposals / dy).toFixed(2),
        demos: (demos / dy).toFixed(2),
        meetings: (meetings / dy).toFixed(1),
        calls: Math.round(calls / dy),
      },
      monthly: {
        mqls: Math.round(mqls / 12),
      },
      funnelTargets: {
        revenue: `€${(funnel.target / 1000).toFixed(0)}k`,
        deals: `${deals} deals`,
        winrate: `≥ ${funnel.winRate}%`,
        demos_annual: `${demos} demos/year`,
        meetings_monthly: `${Math.round(meetings / 12)} meetings/month`,
        mql_share: `≥ ${funnel.mktShare}%`,
        mqls: `${mqls} MQLs/year`,
      },
    }
  }, [funnel])
}
