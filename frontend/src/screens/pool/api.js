/**
 * Alphas (spec §4.5): the local store of Alphas, their submission checks and correlations.
 * Request bodies are snake_case ONLY — camelCase keys are silently dropped — and nothing here
 * submits an alpha.
 */

import { queryOptions } from '@tanstack/react-query'
import { http, qs } from '@/api/http'
/**
 * Singular. `/alphas/:id` is the Alpha *list* and its `:id` is a tab — `/alphas/unsubmitted`,
 * `/alphas/lists`. Mirrors `vault.yields.PLATFORM_ALPHA_URL`, which builds the same link
 * server-side.
 */
export const BRAIN_ALPHA_URL = (alphaId) => `https://platform.worldquantbrain.com/alpha/${alphaId}`
export const pool = {
  overview: () => http.get('/api/vault'),
  /** Raw BRAIN counts by stage and status. One BRAIN read. */
  summary: () => http.get('/api/alphas/summary'),
  sync: () => http.post('/api/vault/sync'),
  query: (body) => http.post('/api/vault/alphas/query', body),
  detail: (alphaId) => http.get(`/api/vault/alphas/${encodeURIComponent(alphaId)}/detail`),
  /** Downloads the daily PnL from BRAIN the first time, so it can take a while. */
  pnl: (alphaId) => http.get(`/api/vault/alphas/${encodeURIComponent(alphaId)}/pnl`),
  submittable: (scope, limit = 200) =>
    http.get(
      `/api/vault/submittable${qs({
        region: scope.region,
        delay: scope.delay,
        universe: scope.universe,
        instrument_type: scope.instrumentType,
        limit,
      })}`,
    ),
  /** Every market at once: the sidebar's count, and where an empty market points instead. */
  everywhere: queryOptions({
    queryKey: ['pool', 'submittable-count'],
    queryFn: () => http.get('/api/vault/submittable?limit=1'),
  }),
  /** Re-runs the submission checks on BRAIN without submitting. */
  check: (alphaId) => http.get(`/api/alphas/${encodeURIComponent(alphaId)}/check`),
}
