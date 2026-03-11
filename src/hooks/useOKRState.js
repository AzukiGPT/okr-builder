import { useReducer, useCallback } from "react"

const INITIAL_STATE = {
  step: 0,
  maxStep: 0,
  ctx: {
    company: "",
    arr: "",
    stage: "",
    bottleneck: "",
    winRate: "",
    churn: "",
    founderLed: "",
  },
  selected: { sales: [], marketing: [], csm: [] },
  funnel: {
    target: 3000000,
    acv: 100000,
    winRate: 25,
    demoToProp: 50,
    meetToDemo: 40,
    callToMeet: 10,
    mktShare: 40,
    l2mql: 30,
  },
  customTargets: {},
}

function reducer(state, action) {
  switch (action.type) {
    case "SET_STEP":
      return {
        ...state,
        step: action.payload,
        maxStep: Math.max(state.maxStep, action.payload),
      }
    case "SET_CTX":
      return { ...state, ctx: { ...state.ctx, [action.key]: action.value } }
    case "TOGGLE_OBJECTIVE": {
      const { team, id } = action.payload
      const cur = state.selected[team]
      const next = cur.includes(id)
        ? cur.filter(x => x !== id)
        : [...cur, id]
      return { ...state, selected: { ...state.selected, [team]: next } }
    }
    case "SET_FUNNEL":
      return { ...state, funnel: { ...state.funnel, [action.key]: action.value } }
    case "ADD_CUSTOM_OBJECTIVE": {
      const { team, objective } = action.payload
      const customObjs = state.selected.customObjectives || { sales: [], marketing: [], csm: [] }
      return {
        ...state,
        selected: {
          ...state.selected,
          [team]: [...state.selected[team], objective.id],
          customObjectives: {
            ...customObjs,
            [team]: [...(customObjs[team] || []), objective],
          },
        },
      }
    }
    case "REMOVE_CUSTOM_OBJECTIVE": {
      const { team, id } = action.payload
      const customObjs = state.selected.customObjectives || { sales: [], marketing: [], csm: [] }
      const updatedCustomKRs = { ...(state.selected.customKRs || {}) }
      delete updatedCustomKRs[id]
      return {
        ...state,
        selected: {
          ...state.selected,
          [team]: state.selected[team].filter(x => x !== id),
          customObjectives: {
            ...customObjs,
            [team]: (customObjs[team] || []).filter(o => o.id !== id),
          },
          customKRs: updatedCustomKRs,
        },
      }
    }
    case "ADD_CUSTOM_KR": {
      const { objId, kr } = action.payload
      const existingKRs = state.selected.customKRs || {}
      const objKRs = existingKRs[objId] || []
      return {
        ...state,
        selected: {
          ...state.selected,
          customKRs: {
            ...existingKRs,
            [objId]: [...objKRs, kr],
          },
        },
      }
    }
    case "REMOVE_CUSTOM_KR": {
      const { objId, krId } = action.payload
      const existingKRs = state.selected.customKRs || {}
      const objKRs = existingKRs[objId] || []
      return {
        ...state,
        selected: {
          ...state.selected,
          customKRs: {
            ...existingKRs,
            [objId]: objKRs.filter(kr => kr.id !== krId),
          },
        },
      }
    }
    case "SET_CUSTOM_TARGET":
      return { ...state, customTargets: { ...state.customTargets, [action.krId]: action.value } }
    case "SYNC_CTX_TO_FUNNEL":
      return { ...state, funnel: { ...state.funnel, ...action.payload } }
    case "RESET":
      return { ...INITIAL_STATE }
    case "LOAD":
      return { ...INITIAL_STATE, ...action.payload }
    default:
      return state
  }
}

export function useOKRState() {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE)

  const setStep = useCallback((s) => dispatch({ type: "SET_STEP", payload: s }), [])
  const setCtx = useCallback((key, value) => dispatch({ type: "SET_CTX", key, value }), [])
  const toggleObjective = useCallback((team, id) => dispatch({ type: "TOGGLE_OBJECTIVE", payload: { team, id } }), [])
  const addCustomObjective = useCallback((team, objective) => dispatch({ type: "ADD_CUSTOM_OBJECTIVE", payload: { team, objective } }), [])
  const removeCustomObjective = useCallback((team, id) => dispatch({ type: "REMOVE_CUSTOM_OBJECTIVE", payload: { team, id } }), [])
  const addCustomKR = useCallback((objId, kr) => dispatch({ type: "ADD_CUSTOM_KR", payload: { objId, kr } }), [])
  const removeCustomKR = useCallback((objId, krId) => dispatch({ type: "REMOVE_CUSTOM_KR", payload: { objId, krId } }), [])
  const setFunnel = useCallback((key, value) => dispatch({ type: "SET_FUNNEL", key, value }), [])
  const setCustomTarget = useCallback((krId, value) => dispatch({ type: "SET_CUSTOM_TARGET", krId, value }), [])
  const syncCtxToFunnel = useCallback((updates) => dispatch({ type: "SYNC_CTX_TO_FUNNEL", payload: updates }), [])
  const reset = useCallback(() => dispatch({ type: "RESET" }), [])

  return {
    state, dispatch, setStep, setCtx, toggleObjective,
    addCustomObjective, removeCustomObjective, addCustomKR, removeCustomKR,
    setFunnel, setCustomTarget, syncCtxToFunnel, reset,
  }
}
