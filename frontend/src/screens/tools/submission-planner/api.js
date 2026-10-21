/** Submission Planner: which submittable Alphas to submit, and in what order. */

import { http } from '@/api/http'

const B = '/api/tools/submission-planner'
export const submissionPlanner = {
  plan: (taskIds) =>
    http.post(`${B}/plan`, {
      taskIds,
    }),
  setSubmitted: (alphaId, submitted) =>
    http.post(`${B}/submitted`, {
      alphaId,
      submitted,
    }),
}
