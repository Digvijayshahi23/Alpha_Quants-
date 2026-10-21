/**
 * Search Lab: choose datasets, cores and simulations, then run the search as a task.
 * Request bodies are snake_case.
 */

import { http } from '@/api/http'

const B = '/api/search-lab'
export const searchLab = {
  /** Reads the account's operators, syncing them from BRAIN when missing. */
  options: () => http.get(`${B}/options`),
  /** Free; queues nothing. */
  preview: (body) => http.post(`${B}/preview`, body),
  /** Adds the search to Tasks, not started. */
  addTask: (body) => http.post(`${B}/tasks`, body),
}
