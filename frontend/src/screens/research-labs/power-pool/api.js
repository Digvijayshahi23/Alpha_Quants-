/** LLM Power Pool Lab: datasets, a model, cores and simulations, then add the task to Tasks. */

import { http } from '@/api/http'

const B = '/api/power-pool-lab'
export const powerPoolLab = {
  options: () => http.get(`${B}/options`),
  /** Free: no LLM call, no simulation. */
  preview: (body) => http.post(`${B}/preview`, body),
  addTask: (body) => http.post(`${B}/tasks`, body),
}
