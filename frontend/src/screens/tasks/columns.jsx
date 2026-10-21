/** Columns the task tables share, so they cannot drift apart. */

import { cn } from '@/lib/cn'
import { CORE_METRICS, CORE_ORDER, DASH, fmt } from '@/lib/format'
import { Badge, MetricBadge, signTone, TEXT_TONE } from '@/ui/kit'
export const setting = (r, key) => String(r.settings?.[key] ?? '')
const STATUS = {
  IDLE: {
    label: 'Not Started',
    tone: 'outline',
  },
  QUEUED: {
    label: 'Waiting',
    tone: 'warn',
  },
  RUNNING: {
    label: 'Running',
    tone: 'profit',
  },
  PAUSED: {
    label: 'Paused',
    tone: 'muted',
  },
  COMPLETE: {
    label: 'Complete',
    tone: 'neutral',
  },
  FAILED: {
    label: 'Failed',
    tone: 'loss',
  },
}

/** A task's status in words, wherever it is shown. */
export function taskStatus(task) {
  if (task.stopping && task.status === 'RUNNING')
    return {
      label: 'Stopping',
      tone: 'warn',
    }
  // A stop ends the task COMPLETE; "Complete" beside 0 / 626 would claim work never done.
  if (task.stopping && task.status === 'COMPLETE' && task.simulated < task.target)
    return {
      label: 'Stopped',
      tone: 'muted',
    }
  return STATUS[task.status] ?? STATUS.IDLE
}

/** A Sharpe as the tables show it: a badge toned by its sign. */
export function SharpeCell({ value }) {
  if (value == null) return DASH
  return (
    <MetricBadge tone={value > 0 ? 'profit' : value < 0 ? 'loss' : 'neutral'}>
      {fmt.ratio(value)}
    </MetricBadge>
  )
}

/** After-Cost Sharpe's header. The figure is scaled to ten years of data, which the name alone
 *  does not say, so the header does on hover. */
export const AFTER_COST_HEADER = (
  <span title="After-cost t-stat ÷ √10: the Sharpe after 5 bps trading costs, times √(years of data ÷ 10). Every Alpha is normalized to 10 years, so fewer years of data score lower.">
    After-Cost Sharpe
  </span>
)

/**
 * How an Alpha is held to its instruments' liquidity. BRAIN refuses Max Trade and Max
 * Position both ON, so the two settings are one three-way choice and read better as one
 * column than as two columns of ON/OFF.
 */
export function investability(r) {
  if (r.settings?.['maxTrade'] === 'ON') return 'Max Trade'
  if (r.settings?.['maxPosition'] === 'ON') return 'Max Position'
  return 'None'
}
export const INVESTABILITY = {
  key: 'investability',
  header: 'Investability',
  width: 'minmax(108px,1fr)',
  sortable: true,
  cell: (r) => <span className="num truncate">{investability(r)}</span>,
}

/** Marks an Alpha simulated in Quick mode: real figures, but not one BRAIN will take. */
export function QuickBadge({ alpha }) {
  if (!alpha.quick) return null
  return (
    <Badge
      tone="outline"
      title={
        alpha.refusedBy.length === 0
          ? 'Simulated in Quick mode. It passed every check BRAIN ran, so it is being simulated again in full, the only mode BRAIN takes for submission.'
          : 'Simulated in Quick mode, which runs only the checks that score an Alpha.'
      }
    >
      Quick
    </Badge>
  )
}

/** The Alpha's BRAIN id: what a consultant searches BRAIN by and quotes. A click on the row
 *  opens its details; Ctrl-click opens it on BRAIN. */
export const ALPHA_ID = {
  key: 'alphaId',
  header: 'Alpha',
  width: '104px',
  sortable: true,
  cell: (r) => <span className="num text-ink">{r.alphaId ?? DASH}</span>,
}

/** BRAIN wants it below 0.7, or a Sharpe 10% above each production Alpha it exceeds. */
export const PROD_CORRELATION = {
  key: 'prodCorrelation',
  header: 'Production Correlation',
  width: 'minmax(120px,1.1fr)',
  align: 'right',
  sortable: true,
  cell: (r) =>
    r.prodCorrelation == null ? (
      <span className="text-ink-subtle">{DASH}</span>
    ) : (
      <span
        className={cn(
          'num',
          r.prodCorrelation < 0.7 ? 'text-pnl-positive-text' : 'text-status-warning',
        )}
      >
        {fmt.ratio(r.prodCorrelation, 4)}
      </span>
    ),
}
export const FAILED_CHECKS = {
  key: 'failed',
  header: 'Checks Failed',
  width: 'minmax(140px,1.6fr)',
  sortable: true,
  cell: (r) =>
    r.failedChecks.length === 0 ? (
      r.quick ? (
        <QuickBadge alpha={r} />
      ) : (
        <span className="text-ink-subtle">{DASH}</span>
      )
    ) : (
      <span className="truncate" title={r.failedChecks.join(', ')}>
        {r.failedChecks.map((name, i) => (
          <span
            key={name}
            // A check that failed without refusing the Alpha is shown, because it did fail,
            // but not in the colour that means "this is why you cannot submit".
            className={r.refusedBy.includes(name) ? 'text-pnl-negative-text' : 'text-ink-subtle'}
          >
            {i > 0 && ', '}
            {name}
          </span>
        ))}
      </span>
    ),
}

/** Per row, for a sweep whose Truncation Agent set it market by market. */
export const TRUNCATION = {
  key: 'truncation',
  header: 'Truncation',
  width: 'minmax(84px,0.8fr)',
  align: 'right',
  cell: (r) => (
    <span className="num">
      {r.settings?.['truncation'] == null ? DASH : fmt.ratio(Number(r.settings['truncation']), 2)}
    </span>
  ),
}
export const DELAY = {
  key: 'delay',
  header: 'Delay',
  width: 'minmax(64px,0.6fr)',
  sortable: true,
  cell: (r) => (
    <span className="num">{r.settings?.['delay'] == null ? DASH : `D${r.settings['delay']}`}</span>
  ),
}
export const METRICS = [
  ...CORE_ORDER.map((key) => ({
    key,
    ...CORE_METRICS[key],
    best: key === 'turnover' || key === 'drawdown' ? 'min' : 'max',
  })),
  {
    key: 'afterCostSharpe',
    label: 'After-Cost Sharpe',
    show: (v) => fmt.ratio(v),
    signed: true,
    best: 'max',
  },
  // The held-out years: an Alpha that decays shows it here, beside its full-period figures.
  {
    key: 'testSharpe',
    label: 'Test Sharpe',
    show: (v) => fmt.ratio(v),
    signed: true,
    best: 'max',
  },
  {
    key: 'testFitness',
    label: 'Test Fitness',
    show: (v) => fmt.ratio(v),
    signed: true,
    best: 'max',
  },
]

/** A metric's figure, in profit or loss colour where its sign means something. */
export function Figure({ metric, value }) {
  return (
    <span className={cn('num', metric.signed && TEXT_TONE[signTone(value)])}>
      {metric.show(value)}
    </span>
  )
}
export const metricHeader = (m) => (m.key === 'afterCostSharpe' ? AFTER_COST_HEADER : m.label)

/** Where and how an Alpha ran. */
export const SETTING_COLUMNS = [
  {
    key: 'alphaId',
    header: 'Alpha ID',
    width: 'minmax(96px,1fr)',
    sortable: true,
    cell: (r) => <span className="num truncate">{r.alphaId || DASH}</span>,
  },
  {
    key: 'region',
    header: 'Region',
    width: 'minmax(70px,0.7fr)',
    sortable: true,
    cell: (r) => <span className="num">{setting(r, 'region') || DASH}</span>,
  },
  DELAY,
  {
    key: 'universe',
    header: 'Universe',
    width: 'minmax(84px,0.9fr)',
    sortable: true,
    cell: (r) => <span className="num truncate">{setting(r, 'universe') || DASH}</span>,
  },
  {
    key: 'neutralization',
    header: 'Neutralization',
    width: 'minmax(96px,1fr)',
    sortable: true,
    cell: (r) => <span className="num truncate">{setting(r, 'neutralization') || DASH}</span>,
  },
  INVESTABILITY,
]
export const METRIC_COLUMNS = METRICS.map((m) => ({
  key: String(m.key),
  header: metricHeader(m),
  width: 'minmax(84px,0.8fr)',
  align: 'right',
  sortable: true,
  cell: (r) => <Figure metric={m} value={r[m.key]} />,
}))

/** Sorted client-side on any column above, absent values last whichever way. */
export function compareAlphas(a, b, sort) {
  const pick = (r) => {
    switch (sort.key) {
      case 'region':
      case 'universe':
      case 'neutralization':
        return setting(r, sort.key)
      case 'investability':
        return investability(r)
      case 'delay':
        return r.settings?.['delay'] ?? null
      case 'failed':
        return r.failedChecks.length
      case 'alphaId':
        return r.alphaId
      default:
        return r[sort.key] ?? null
    }
  }
  const x = pick(a)
  const y = pick(b)
  if (x == null) return y == null ? 0 : 1
  if (y == null) return -1
  const order = typeof x === 'string' ? x.localeCompare(String(y)) : Number(x) - Number(y)
  return sort.desc ? -order : order
}
