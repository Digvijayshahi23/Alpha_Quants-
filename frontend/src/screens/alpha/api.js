/**
 * The Alpha page's contract. Correlations and the performance comparison spend BRAIN's
 * hourly budgets, so they run on a click and come back cached with `fetchedAt`; only
 * `refresh` asks BRAIN again. Nothing here submits an Alpha.
 */

import { ApiError, http, qs } from '@/api/http'

/** The Portfolio page's result shape, over a book of one — see `/api/alphas/{id}/after-cost`. */

/** `cached: false` only answers a `cached` read that found nothing kept. */

/** `cached` reads only what is kept; `run` asks BRAIN if nothing is; `refresh` always asks. */

const read = (mode) =>
  qs({
    cached_only: mode === 'cached' || null,
    refresh: mode === 'refresh' || null,
  })

/** Before and after the Alpha joins its pool partition, as BRAIN reports it. */

const id = (alphaId) => encodeURIComponent(alphaId)

/** BRAIN's answer, 410 or 412, when a correlation does not apply to this Alpha. */
export const notApplicable = (error) =>
  error instanceof ApiError && [410, 412].includes(Number(error.body['platformStatus']))
export const alpha = {
  page: (alphaId, refresh = false) =>
    http.get(
      `/api/alphas/${id(alphaId)}/page${qs({
        refresh: refresh || null,
      })}`,
    ),
  save: (alphaId, body) => http.patch(`/api/alphas/${id(alphaId)}`, body),
  correlation: (alphaId, kind, mode) =>
    http.get(`/api/alphas/${id(alphaId)}/correlations/${kind}${read(mode)}`),
  performance: (alphaId, mode) => http.get(`/api/alphas/${id(alphaId)}/performance${read(mode)}`),
  /** Gross and after-cost PnL, charging `costBps` against each day's own turnover. */
  afterCost: (alphaId, costBps) =>
    http.get(
      `/api/alphas/${id(alphaId)}/after-cost${qs({
        costBps,
      })}`,
    ),
}
