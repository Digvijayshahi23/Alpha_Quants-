/**
 * Portfolio: submitted Alphas combined at equal weight, as BRAIN combines its own pool.
 * Request bodies are snake_case ONLY — camelCase keys are silently dropped.
 */

import { http } from '@/api/http'
export const portfolio = {
  members: () => http.get('/api/portfolio/members'),
  /** Refresh the submitted Alphas and download any missing PnL and turnover. */
  sync: () => http.post('/api/portfolio/sync'),
  compute: (alphaIds, costBps) =>
    http.post('/api/portfolio/compute', {
      alpha_ids: alphaIds,
      cost_bps: costBps,
    }),
}
