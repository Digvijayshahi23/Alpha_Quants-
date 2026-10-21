/** A task's results as key-value Markdown for an LLM to review (see `lib/llm-copy`). */

import { fmt } from '@/lib/format'
import { coreMetrics, kvMarkdown } from '@/lib/llm-copy'

/** The simulation settings worth reading, in BRAIN's order. The rest are platform constants. */
const SETTINGS = [
  ['region', 'Region'],
  ['universe', 'Universe'],
  ['delay', 'Delay'],
  ['decay', 'Decay'],
  ['neutralization', 'Neutralization'],
  ['truncation', 'Truncation'],
  ['pasteurization', 'Pasteurization'],
  ['nanHandling', 'NaN Handling'],
  ['maxTrade', 'Max Trade'],
  ['maxPosition', 'Max Position'],
]
const text = (value) => (typeof value === 'string' ? value : JSON.stringify(value))
const failed = (r) =>
  r.pending || r.submittable || !r.failedChecks.length ? null : r.failedChecks.join(', ')

/** Each distinct set of failed checks, named F1, F2, … by how many results share it: a few
 * sets cover most results, and naming them once cuts about a fifth of the text. */
function failedSets(rows) {
  const counts = new Map()
  for (const r of rows) {
    const set = failed(r)
    if (set) counts.set(set, (counts.get(set) ?? 0) + 1)
  }
  return new Map(
    [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([set], i) => [set, `F${i + 1}`]),
  )
}
export function resultsMarkdown(task, rows) {
  const sets = failedSets(rows)
  const checks = (r) => {
    if (r.pending) return 'PENDING'
    if (r.submittable) return 'PASS'
    const set = failed(r)
    return set ? `FAIL ${sets.get(set)}` : 'FAIL'
  }
  return kvMarkdown({
    title: `${fmt.int(rows.length)} Results`,
    unit: 'Result',
    extra: sets.size
      ? [['Failed Check Sets', ...[...sets].map(([set, name]) => `${name}: ${set}`)]]
      : [],
    alphas: rows.map((r) => ({
      expression: r.expression,
      sharpe: r.sharpe,
      settings: SETTINGS.filter(([key]) => r.settings?.[key] != null).map(([key, label]) => [
        label,
        text(r.settings?.[key]),
      ]),
      traits: [],
      metrics: [
        ...(task.objectiveLabel === 'Sharpe' ? [] : [[task.objectiveLabel, fmt.ratio(r.value)]]),
        ...coreMetrics(r),
        ['Checks', checks(r)],
      ],
    })),
  })
}
