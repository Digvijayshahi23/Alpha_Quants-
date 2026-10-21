/** Tasks: what the labs added. Only the Tasks tab runs them. */

import { http, qs } from '@/api/http'

/** IDLE: not started. QUEUED: run, waiting for its cores to fit in the free slots. */

/** A submittable Alpha from any task, with the task that found it. */

const B = '/api/lab-tasks'
export const labTasks = {
  list: () => http.get(B),
  /** Spends simulation quota. */
  runAll: () => http.post(`${B}/run-all`),
  /** Spends simulation quota. Also resumes a paused task. */
  run: (id) => http.post(`${B}/${id}/run`),
  pause: (id) => http.post(`${B}/${id}/pause`),
  stop: (id) => http.post(`${B}/${id}/stop`),
  /** A blank name clears it. */
  rename: (id, name) =>
    http.put(`${B}/${id}/name`, {
      name,
    }),
  change: (id, body) => http.patch(`${B}/${id}`, body),
  remove: (id) => http.del(`${B}/${id}`),
  top: (id, limit = 50) =>
    http.get(
      `${B}/${id}/top${qs({
        limit,
      })}`,
    ),
  /** Every Alpha from every task that nothing refuses: each check PASS, WARNING or PENDING. */
  submittable: () => http.get(`${B}/submittable`),
  /** Quantitative Alpha Discovery & Submission Dashboard data */
  discovery: (params) => http.get(`${B}/discovery${qs(params ?? {})}`),
  /** Explicit Alpha submission to WorldQuant BRAIN */
  submitAlpha: (alphaId, force = false) =>
    http.post(`${B}/submit-alpha`, {
      alphaId,
      force,
    }),
  /** Measured locally against the submitted Power Pool, from the PnL already stored. */
  powerPoolFor: (alphaIds) =>
    http.post(`${B}/power-pool-correlation`, {
      alphaIds,
    }),
  /** Downloads PnL, then turnover for the Alphas that satisfy Power Pool Correlation. */
  powerPoolWorkflow: (alphaIds) =>
    http.post(`${B}/power-pool-workflow`, {
      alphaIds,
    }),
  /** Asks BRAIN, in this order, for each Production Correlation it has not given yet. */
  prodCorrelation: (alphaIds) =>
    http.post(`${B}/prod-correlation`, {
      alphaIds,
    }),
  /** Stops that check; the answers already back stay. */
  stopProdCorrelation: () => http.post(`${B}/prod-correlation/stop`),
}
