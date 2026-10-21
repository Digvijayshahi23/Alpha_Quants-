/** Settings Sampler: where one proven expression could also run, and queueing it there. */

import { http } from '@/api/http'

/** How every simulation in the sweep is held, whatever market it lands in. Each is optional:
 * left out, an Alpha's own value stands, or the platform default when there is no Alpha. */

/** Where the sweep's expression comes from: an Alpha, or an expression typed in. */

const B = '/api/tools/settings-sampler'
export const settingsSampler = {
  /** Free: reads the Alpha (if any) and the catalog, simulates nothing. */
  preview: (source) => http.post(`${B}/preview`, source),
  addTask: (body) => http.post(`${B}/tasks`, body),
}

/** How an Alpha is held to its instruments' liquidity. BRAIN refuses both ON, so the two
 *  settings are one three-way choice; `None` matches the Investability column on the tables. */
export const pairLabel = (p) =>
  p.maxTrade === 'OFF' && p.maxPosition === 'OFF'
    ? 'None'
    : p.maxTrade === 'ON'
      ? 'Max Trade'
      : 'Max Position'
