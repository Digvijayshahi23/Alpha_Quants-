/** Tasks: what the labs added. Only the Tasks tab runs them. */

import type { components } from '@/api/generated'
import { http, qs } from '@/api/http'

type Schemas = components['schemas']

/** IDLE: not started. QUEUED: run, waiting for its cores to fit in the free slots. */
export type TaskStatus = Schemas['StudyStatus']
export type LabTask = Schemas['LabTask']
export type LabTasks = Schemas['LabTasks']
export type RankedAlpha = Omit<Schemas['RankedAlpha'], 'settings'> & {
  settings: { universe?: string; neutralization?: string; [key: string]: unknown } | null
}

/** A submittable Alpha from any task, with the task that found it. */
export type TaskAlpha = Omit<Schemas['TaskAlpha'], 'settings'> & {
  settings: RankedAlpha['settings']
}

export type PowerPoolCorrelation = Schemas['PowerPoolCorrelation']
export type PowerPoolRow = Schemas['PowerPoolRow']

export interface RegionMetric {
  region: string
  evaluated: number
  submittable: number
  highPerforming: number
  bestSharpe: number | null
  bestFitness: number | null
  datasets: string[]
}

export interface DiscoverySummary {
  runningCores: number
  assignedCores: number
  simulationsCompleted: number
  submittableAlphas: number
  highPerformingAlphas: number
  regionsCovered: number
  regions: string[]
  datasets: string[]
  regionMetrics: RegionMetric[]
}

export interface DiscoveryAlpha {
  rank: number
  alphaId: string
  trialId: number | null
  taskId: number | null
  taskName: string | null
  expression: string | null
  region: string
  delay: number
  universe: string
  neutralization: string
  datasetId: string | null
  datasetName: string | null
  category: string | null
  sharpe: number | null
  fitness: number | null
  returns: number | null
  turnover: number | null
  drawdown: number | null
  margin: number | null
  afterCostSharpe: number | null
  longCount: number | null
  shortCount: number | null
  validationStatus: 'submittable' | 'pending' | 'refused' | 'unvalidated'
  submissionStatus: string
  submittable: boolean
  checks: Array<{
    name: string
    result: string
    value?: number | null
    limit?: number | null
    threshold?: number | null
    description?: string | null
    [key: string]: unknown
  }>
  failedChecks: string[]
  refusedBy: string[]
  dateCreated: string | null
  dateSubmitted: string | null
  brainUrl: string
}

export interface DiscoveryResponse {
  summary: DiscoverySummary
  total: number
  alphas: DiscoveryAlpha[]
}

export interface DiscoveryParams {
  region?: string | undefined
  dataset_id?: string | undefined
  delay?: number | undefined
  universe?: string | undefined
  neutralization?: string | undefined
  status?: string | undefined
  search?: string | undefined
  sort_by?: string | undefined
  sort_desc?: boolean | undefined
  limit?: number | undefined
  offset?: number | undefined
}

export interface SubmitAlphaResponse {
  success: boolean
  alphaId: string
  status: string
  brainUrl: string
  message: string
}

const B = '/api/lab-tasks'

export const labTasks = {
  list: () => http.get<LabTasks>(B),
  /** Spends simulation quota. */
  runAll: () => http.post<LabTasks>(`${B}/run-all`),
  /** Spends simulation quota. Also resumes a paused task. */
  run: (id: number) => http.post<LabTask>(`${B}/${id}/run`),
  pause: (id: number) => http.post<LabTask>(`${B}/${id}/pause`),
  stop: (id: number) => http.post<LabTask>(`${B}/${id}/stop`),
  /** A blank name clears it. */
  rename: (id: number, name: string) => http.put<LabTask>(`${B}/${id}/name`, { name }),
  change: (id: number, body: { cores?: number; simulations?: number }) =>
    http.patch<LabTask>(`${B}/${id}`, body),
  remove: (id: number) => http.del<Schemas['TaskRemoved']>(`${B}/${id}`),
  top: (id: number, limit = 50) => http.get<RankedAlpha[]>(`${B}/${id}/top${qs({ limit })}`),
  /** Every Alpha from every task that nothing refuses: each check PASS, WARNING or PENDING. */
  submittable: () => http.get<TaskAlpha[]>(`${B}/submittable`),
  /** Quantitative Alpha Discovery & Submission Dashboard data */
  discovery: (params?: DiscoveryParams) =>
    http.get<DiscoveryResponse>(
      `${B}/discovery${qs((params ?? {}) as Record<string, string | number | boolean | null | undefined>)}`,
    ),
  /** Explicit Alpha submission to WorldQuant BRAIN */
  submitAlpha: (alphaId: string, force = false) =>
    http.post<SubmitAlphaResponse>(`${B}/submit-alpha`, { alphaId, force }),
  /** Measured locally against the submitted Power Pool, from the PnL already stored. */
  powerPoolFor: (alphaIds: string[]) =>
    http.post<PowerPoolCorrelation>(`${B}/power-pool-correlation`, { alphaIds }),
  /** Downloads PnL, then turnover for the Alphas that satisfy Power Pool Correlation. */
  powerPoolWorkflow: (alphaIds: string[]) =>
    http.post<Schemas['WorkflowStarted']>(`${B}/power-pool-workflow`, { alphaIds }),
  /** Asks BRAIN, in this order, for each Production Correlation it has not given yet. */
  prodCorrelation: (alphaIds: string[]) =>
    http.post<Schemas['WorkflowStarted']>(`${B}/prod-correlation`, { alphaIds }),
  /** Stops that check; the answers already back stay. */
  stopProdCorrelation: () => http.post<void>(`${B}/prod-correlation/stop`),
}
