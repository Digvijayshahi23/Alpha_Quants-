/** What the labs share around a task: its draft, market and datasets, and its preview. */

import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { DEFAULT_SCOPE, useScope } from '@/lib/scope'
import { useDebounced } from '@/lib/use-debounced'
import { useDatasetPick } from '@/screens/data/dataset-pick'
import { useFieldFilter } from '@/screens/data/state'
export const LAB_DEFAULTS = {
  region: DEFAULT_SCOPE.region,
  delay: DEFAULT_SCOPE.delay,
  universe: DEFAULT_SCOPE.universe,
  datasetIds: [],
  fieldFilter: null,
  cores: null,
  simulations: null,
  decay: 0,
  vectorOperators: null,
  neutralizations: [],
}
export const MAX_SIMULATIONS = 100_000

/** A draft's market and datasets, and the round trip to the Data Explorer to choose them. */

export function useLabMarket(draft, set, from) {
  const navigate = useNavigate()
  const [, setDataScope] = useScope('data')
  const scope = {
    instrumentType: 'EQUITY',
    region: draft.region,
    delay: draft.delay,
    universe: draft.universe,
  }
  const chosen = draft.datasetIds.length > 0

  // Back from the Data Explorer with a finished pick for this lab.
  useEffect(() => {
    const pick = useDatasetPick.getState().take(from)
    if (pick)
      set({
        region: pick.scope.region,
        delay: pick.scope.delay,
        universe: pick.scope.universe,
        datasetIds: pick.ids,
        fieldFilter: pick.extra ?? null,
      })
  }, [from, set])
  const choose = () => {
    // Back to the filter this lab applies, so the Explorer shows the fields it will use.
    if (draft.fieldFilter)
      useFieldFilter.getState().replace({
        ...draft.fieldFilter,
      })
    useDatasetPick.getState().start(scope, draft.datasetIds, from)
    setDataScope(scope)
    void navigate({
      to: '/data',
    })
  }
  return {
    chosen,
    scope,
    choose,
  }
}

/**
 * A lab's free preview of `body`, asked once the form has been still for `wait` ms. `current`
 * is whether the plan answers the form as it is now rather than an earlier state of it.
 */
export function useLabPreview(lab, body, preview, { enabled = true, wait = 300 } = {}) {
  const key = JSON.stringify(body)
  const settled = useDebounced(key, wait)
  const query = useQuery({
    queryKey: [lab, 'preview', settled],
    queryFn: () => preview(JSON.parse(settled)),
    enabled: enabled && settled === key,
    placeholderData: keepPreviousData,
  })
  return {
    preview: query,
    current: settled === key && !query.isFetching,
  }
}

/** `vec_avg` until the user chooses vector operators. */
export function vectorOperatorsOf(draft, available) {
  return draft.vectorOperators ?? (available?.includes('vec_avg') ? ['vec_avg'] : [])
}

/** The market and settings both labs send to preview a task. */
export function labBody(draft, vectorOperators, cores) {
  return {
    region: draft.region,
    delay: draft.delay,
    universe: draft.universe,
    dataset_ids: draft.datasetIds,
    field_filter: draft.fieldFilter ?? null,
    vector_operators: vectorOperators,
    neutralizations: draft.neutralizations,
    decay: draft.decay,
    cores,
  }
}
export function simulationsValid(simulations, maxSimulations) {
  return simulations !== null && simulations >= 1 && simulations <= maxSimulations
}
