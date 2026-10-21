/**
 * Evolution Lab: choose seed Alphas, cores and simulations, then add the breeding to Tasks,
 * where it runs. Request bodies are snake_case.
 */

import { http } from '@/api/http'

const B = '/api/evolution-lab'
export const evolutionLab = {
  /** The markets holding Alphas, and what a task can be set to. */
  options: () => http.get(`${B}/options`),
  /** Free; queues nothing. */
  preview: (body) => http.post(`${B}/preview`, body),
  /** Chooses seeds in the background. Downloads daily PnL where missing; never simulates. */
  autoSeeds: (body) => http.post(`${B}/seeds/auto`, body),
  autoSeedsJob: (jobId) => http.get(`${B}/seeds/auto/${encodeURIComponent(jobId)}`),
  /** Adds the breeding to Tasks, not started. Spends nothing until it is run there. */
  addTask: (body) => http.post(`${B}/tasks`, body),
}
