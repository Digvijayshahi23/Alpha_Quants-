/**
 * What the Alpha page works out for itself, from what BRAIN already sent: the verdict on
 * submission, Power Pool eligibility, and the PnL analysis BRAIN's page does not show.
 * Pure functions; the rules are BRAIN's own.
 */

import { isNum } from '@/lib/format'

// ── Checks ─────────────────────────────────────────────────────────────────────────────────

const NAMES = {
  LOW_SHARPE: 'Sharpe',
  LOW_FITNESS: 'Fitness',
  LOW_TURNOVER: 'Minimum turnover',
  HIGH_TURNOVER: 'Maximum turnover',
  CONCENTRATED_WEIGHT: 'Weight concentration',
  LOW_SUB_UNIVERSE_SHARPE: 'Sub-universe Sharpe',
  LOW_ROBUST_UNIVERSE_SHARPE: 'Robust universe Sharpe',
  IS_LADDER_SHARPE: 'IS ladder Sharpe',
  LOW_2Y_SHARPE: 'Last 2 years Sharpe',
  SELF_CORRELATION: 'Self-Correlation',
  PROD_CORRELATION: 'Production Correlation',
  POWER_POOL_CORRELATION: 'Power Pool Correlation',
  CLUSTER_TEST: 'Cluster Sharpe',
  QUICK_MODE: 'Quick mode',
  DATA_DIVERSITY: 'Data diversity',
  REGULAR_SUBMISSION: 'Submission quota',
  D0_SUBMISSION: 'Delay 0 quota',
  MATCHES_COMPETITION: 'Competitions',
  MATCHES_PYRAMID: 'Pyramids',
  MATCHES_THEMES: 'Themes',
  OSMOSIS_ALLOCATION: 'Osmosis allocation',
  REVERSION_COMPONENT: 'Reversion component',
  HT_AFTER_COST_SHARPE: 'After-cost Sharpe',
  HT_ORTHOGONAL_RAM_NEUTRALIZATION: 'Orthogonal neutralization',
  UNITS: 'Units',
  OPERATOR_AUTHORIZATION: 'Operator access',
  DATA_SET_AUTHORIZATION: 'Dataset access',
}

/** BRAIN's check id in plain words; an unknown check keeps a readable form of its id. */
export const checkName = (name) =>
  NAMES[name] ??
  name
    .toLowerCase()
    .split('_')
    .map((w, i) => (i === 0 ? w[0]?.toUpperCase() + w.slice(1) : w))
    .join(' ')

/** A check that caps its value from above, rather than setting a floor. `CONCENTRATED_WEIGHT`
 * is one despite its name, so it is listed by hand. */
export const isCeiling = (name) =>
  name === 'CONCENTRATED_WEIGHT' || name.startsWith('HIGH_') || name.includes('CORRELATION')

/**
 * Checks listed as notes rather than blockers. Display only, but it has to be the *same* set
 * as `IGNORED_CHECKS` plus `QUOTA_CHECKS` in `vault/yields.py`, which decide `alpha.verdict`:
 * a check excused there and shown failing here reads as "ready" beside a red row, and one
 * gating there but excused here reads as "blocked" with nothing to point at.
 */
const INFORMATIONAL = new Set([
  'PROD_CORRELATION',
  'REGULAR_SUBMISSION',
  'D0_SUBMISSION',
  'MATCHES_COMPETITION',
  'MATCHES_PYRAMID',
  'MATCHES_THEMES',
  'CLUSTER_TEST',
  'OSMOSIS_ALLOCATION',
  'POWER_POOL_DESCRIPTION_LENGTH',
  'POWER_POOL_DESCRIPTION_FORMAT',
])
export const resultOf = (check) => check.result ?? 'PENDING'
export function groupChecks(checks) {
  const groups = {
    failing: [],
    pending: [],
    passing: [],
    notes: [],
  }
  for (const check of checks) {
    const result = resultOf(check)
    if (INFORMATIONAL.has(check.name)) groups.notes.push(check)
    else if (result === 'FAIL' || result === 'ERROR') groups.failing.push(check)
    else if (result === 'PENDING') groups.pending.push(check)
    else if (result === 'WARNING') groups.notes.push(check)
    else groups.passing.push(check)
  }
  return groups
}

// ── The verdict ────────────────────────────────────────────────────────────────────────────

/**
 * Quick mode alphas carry every performance check and none of the submission ones, so their
 * checks alone read as "all clear". BRAIN will not even run the submission check on one:
 * `GET /alphas/{id}/check` answers 400. Measured.
 */
export const isQuickMode = (alpha) => alpha.settings['simulationMode'] === 'QUICK'
export function verdictOf(alpha) {
  const groups = groupChecks(alpha.checks)
  if (alpha.status && alpha.status !== 'UNSUBMITTED')
    return {
      kind: 'submitted',
      groups,
    }
  if (isQuickMode(alpha))
    return {
      kind: 'blocked',
      groups,
    }
  // The backend's rule, shared with Tasks and the Submission Planner. No gating check at all
  // (`null`) reads as pending: calling it ready would invite a permanent submission on nothing.
  if (alpha.verdict === 'refused')
    return {
      kind: 'blocked',
      groups,
    }
  if (alpha.verdict === 'submittable')
    return {
      kind: 'ready',
      groups,
    }
  return {
    kind: 'pending',
    groups,
  }
}

// ── Power Pool ─────────────────────────────────────────────────────────────────────────────

/** The headings BRAIN's Power Pool description template asks for (getting-started-power-pool-alphas.md). */
export const POWER_POOL_HEADINGS = [
  'Idea',
  'Rationale for data used',
  'Rationale for operators used',
]

/** A heading followed by its colon, allowing the Markdown bold of BRAIN's own example. */
const hasHeading = (text, heading) => new RegExp(`${heading}\\W*:`, 'i').test(text)
const byName = (checks, name) => checks.find((c) => c.name === name)
const fromCheck = (check) => {
  const r = check ? resultOf(check) : 'PENDING'
  return r === 'PASS' ? 'pass' : r === 'FAIL' || r === 'ERROR' ? 'fail' : 'unknown'
}
export function powerPoolRules(alpha) {
  // Counted by the backend's Fast Expression parser, as BRAIN counts them.
  const counted = alpha.powerPoolOperators
  const fields = alpha.dataFields
  const robust = byName(alpha.checks, 'LOW_ROBUST_UNIVERSE_SHARPE')
  const sharpe = alpha.inSample?.sharpe
  const description = (alpha.description ?? '').trim()
  const described = description.length
  const missing = POWER_POOL_HEADINGS.filter((h) => !hasHeading(description, h))
  const themed = byName(alpha.checks, 'MATCHES_THEMES')
  // BRAIN names its Power Pool themes as such ("GLB/D1 Liquid Power Pool Aug`26"); a theme
  // object carries only an id, a name and a multiplier.
  const powerPoolThemes = matches(alpha.checks)
    .themes.map((t) => t.name)
    .filter((name) => /power pool/i.test(name))
  const correlation = byName(alpha.checks, 'POWER_POOL_CORRELATION')
  const turnover = [byName(alpha.checks, 'LOW_TURNOVER'), byName(alpha.checks, 'HIGH_TURNOVER')]
  const turnoverState = turnover.some((c) => fromCheck(c) === 'fail')
    ? 'fail'
    : turnover.every((c) => fromCheck(c) === 'pass')
      ? 'pass'
      : 'unknown'
  return [
    {
      label: 'Sharpe of at least 1.0',
      detail: isNum(sharpe) ? sharpe.toFixed(2) : 'Not reported',
      state: isNum(sharpe) ? (sharpe >= 1 ? 'pass' : 'fail') : 'unknown',
    },
    {
      label: 'At most 8 operators',
      detail: isNum(counted) ? `${counted} counted, backfills excluded` : 'Code not readable',
      state: isNum(counted) ? (counted <= 8 ? 'pass' : 'fail') : 'unknown',
    },
    {
      label: 'At most 3 data fields',
      detail: !fields ? 'Code not readable' : fields.length ? fields.join(', ') : 'None found',
      state: !fields ? 'unknown' : fields.length <= 3 ? 'pass' : 'fail',
    },
    {
      label: 'Power Pool Correlation below 0.5',
      detail: isNum(correlation?.value)
        ? correlation.value.toFixed(2)
        : 'Runs with Check Submission',
      state: fromCheck(correlation),
    },
    {
      label: 'Turnover tests pass',
      detail: turnoverState === 'unknown' ? 'Not reported' : 'Within 1% to 70%',
      state: turnoverState,
    },
    {
      label: 'Sub-universe test passes',
      detail: 'LOW_SUB_UNIVERSE_SHARPE',
      state: fromCheck(byName(alpha.checks, 'LOW_SUB_UNIVERSE_SHARPE')),
    },
    // Only where BRAIN runs it.
    ...(robust
      ? [
          {
            label: 'Robust universe test passes',
            detail: 'LOW_ROBUST_UNIVERSE_SHARPE',
            state: fromCheck(robust),
          },
        ]
      : []),
    {
      label: 'Description of 100 characters or more',
      detail: `${described} of 100`,
      state: described >= 100 ? 'pass' : 'fail',
    },
    {
      label: 'Description in the Idea and Rationale template',
      detail: missing.length ? `Missing ${missing.join(', ')}` : 'All three headings',
      state: missing.length ? 'fail' : 'pass',
    },
    {
      label: 'Matches a Power Pool theme',
      detail: powerPoolThemes.length
        ? powerPoolThemes.join(', ')
        : themed
          ? 'None matched: needed unless it also submits as Regular or ATOM'
          : 'Not reported',
      state: powerPoolThemes.length ? 'pass' : themed ? 'fail' : 'unknown',
    },
  ]
}

/** Pyramids, themes and competitions BRAIN matched, from the checks that carry them. */
export function matches(checks) {
  const list = (name, key) => {
    const raw = byName(checks, name)?.[key]
    return Array.isArray(raw) ? raw.filter((x) => typeof x === 'object' && x !== null) : []
  }
  return {
    pyramids: list('MATCHES_PYRAMID', 'pyramids').map((p) => ({
      name: String(p['name'] ?? ''),
      multiplier: isNum(p['multiplier']) ? p['multiplier'] : null,
    })),
    themes: list('MATCHES_THEMES', 'themes').map((t) => ({
      name: String(t['name'] ?? ''),
      multiplier: isNum(t['multiplier']) ? t['multiplier'] : null,
    })),
    competitions: list('MATCHES_COMPETITION', 'competitions').map((c) => String(c['name'] ?? '')),
  }
}

// ── PnL analysis ───────────────────────────────────────────────────────────────────────────

/** Trading days in a year as BRAIN annualises Sharpe and returns: 250, not the documented 252. */
export const YEAR = 250
/** The cumulative series with gaps dropped, paired with its dates. */
export function cumulative(dates, values) {
  const out = []
  values.forEach((value, i) => {
    const date = dates[i]
    if (isNum(value) && date)
      out.push({
        date,
        value,
      })
  })
  return out
}

/** Each day's PnL, from the running total. */
export const daily = (points) =>
  points.slice(1).map((p, i) => ({
    date: p.date,
    value: p.value - (points[i]?.value ?? 0),
  }))

/** Annualised Sharpe over the trailing `window` days, from the first full window on. */
export function rollingSharpe(days, window = YEAR) {
  const out = []
  let sum = 0
  let squares = 0
  days.forEach((day, i) => {
    sum += day.value
    squares += day.value * day.value
    const leaving = days[i - window]
    if (leaving) {
      sum -= leaving.value
      squares -= leaving.value * leaving.value
    }
    if (i + 1 < window) return
    const mean = sum / window
    const variance = squares / window - mean * mean
    if (variance > 0)
      out.push({
        date: day.date,
        value: (Math.sqrt(YEAR) * mean) / Math.sqrt(variance),
      })
  })
  return out
}
/** Distance below the running peak each day, as a fraction of half the book. */
export function underwater(points, bookSize) {
  let peak = Number.NEGATIVE_INFINITY
  return points.map((p) => {
    peak = Math.max(peak, p.value)
    return {
      date: p.date,
      value: (p.value - peak) / (bookSize / 2),
    }
  })
}

/** The deepest separate falls from a peak, deepest first. */
export function drawdowns(points, bookSize, limit = 3) {
  const episodes = []
  let peakIndex = 0
  let troughIndex = 0
  let open = false
  const close = (end) => {
    const peak = points[peakIndex]
    const trough = points[troughIndex]
    if (!peak || !trough) return
    episodes.push({
      depth: (peak.value - trough.value) / (bookSize / 2),
      peak: peak.date,
      trough: trough.date,
      recovered: end === null ? null : (points[end]?.date ?? null),
      days: (end ?? points.length - 1) - peakIndex,
    })
  }
  points.forEach((p, i) => {
    const peak = points[peakIndex]?.value ?? p.value
    if (p.value >= peak) {
      if (open) close(i)
      open = false
      peakIndex = i
      troughIndex = i
    } else {
      open = true
      if (p.value < (points[troughIndex]?.value ?? p.value)) troughIndex = i
    }
  })
  if (open) close(null)
  return episodes.sort((a, b) => b.depth - a.depth).slice(0, limit)
}

/** Share of days that made money. */
export const hitRate = (days) =>
  days.length ? days.filter((d) => d.value > 0).length / days.length : null
