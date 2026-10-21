/**
 * Types shared by more than one screen; screen-specific contracts live next to their endpoints
 * in `api/<domain>.ts`. Turnover, returns, drawdown, margin, coverage and truncation are
 * FRACTIONS (0.64 = 64%), Sharpe and Fitness are plain ratios, and a timestamp without an
 * offset is UTC.
 */

import { qs } from './http'

/** The four-part address almost every lab and catalog call takes. camelCase in the UI. */

/** The same scope for routes whose bodies accept snake_case only. */

export const toScopeBody = (scope) => ({
  instrument_type: scope.instrumentType,
  region: scope.region,
  delay: scope.delay,
  universe: scope.universe,
})

/** A scope in the query string. Every route that reads one takes ``instrumentType``. */
export const scopeQs = (scope, extra = {}) =>
  qs({
    region: scope?.region,
    delay: scope?.delay,
    universe: scope?.universe,
    instrumentType: scope?.instrumentType,
    ...extra,
  })
export const scopeLabel = (scope) => `${scope.region} · D${scope.delay} · ${scope.universe}`

/** BRAIN simulation settings, as BRAIN names them. */

/** Generated from the backend's response models (`src/api/generated.ts`). */

/**
 * One simulation record. A multi-simulation parent holds one of the 8 slots. `settings`
 * is narrowed here: the backend passes BRAIN's settings through untyped.
 */

/** One market's state inside a whole-catalog sync, for the sync matrix. */

/** One catalog download. The live `sync` feed adds progress for a whole-catalog run. */
