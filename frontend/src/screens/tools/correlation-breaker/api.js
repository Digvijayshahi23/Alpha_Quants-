/** Correlation Breaker: re-shape one Alpha's expression, holding its settings still. */

import { http } from '@/api/http'

const B = '/api/tools/correlation-breaker'
export const correlationBreaker = {
  /** Free: reads the Alpha and the catalog, simulates nothing. */
  preview: (body) => http.post(`${B}/preview`, body),
  addTask: (body) => http.post(`${B}/tasks`, body),
}
