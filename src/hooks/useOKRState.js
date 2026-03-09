import { useReducer, useEffect, useRef, useCallback } from "react"
import { loadState, saveState } from "../utils/storage"

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
        : cur.length >= 5
          ? cur
          : [...cur, id]
      return { ...state, selected: { ...state.selected, [team]: next } }
    }
    case "SET_FUNNEL":
      return { ...state, funnel: { ...state.funnel, [action.key]: action.value } }
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
  const saved = loadState()
  const [state, dispatch] = useReducer(reducer, saved ? { ...INITIAL_STATE, ...saved } : INITIAL_STATE)
  const timerRef = useRef(null)

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => saveState(state), 500)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [state])

  const setStep = useCallback((s) => dispatch({ type: "SET_STEP", payload: s }), [])
  const setCtx = useCallback((key, value) => dispatch({ type: "SET_CTX", key, value }), [])
  const toggleObjective = useCallback((team, id) => dispatch({ type: "TOGGLE_OBJECTIVE", payload: { team, id } }), [])
  const setFunnel = useCallback((key, value) => dispatch({ type: "SET_FUNNEL", key, value }), [])
  const setCustomTarget = useCallback((krId, value) => dispatch({ type: "SET_CUSTOM_TARGET", krId, value }), [])
  const syncCtxToFunnel = useCallback((updates) => dispatch({ type: "SYNC_CTX_TO_FUNNEL", payload: updates }), [])
  const reset = useCallback(() => dispatch({ type: "RESET" }), [])

  return { state, dispatch, setStep, setCtx, toggleObjective, setFunnel, setCustomTarget, syncCtxToFunnel, reset }
}
