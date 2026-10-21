/**
 * The local data-field catalog (Data Explorer). Rows from DuckDB stay snake_case; request
 * bodies are snake_case. `/counts /stats /facets /tree /fields /datasets` read the scope
 * from the query string with `instrumentType`.
 */

import { http } from './http'
import { scopeQs } from './types'

/** A market a full sync covers (`GET /api/catalog/markets`). */

/** Unknown keys sort by alpha_count on the backend. */

/** The backend's own filter, every field optional, with the sort key narrowed to the columns
 * it will actually sort on. */

const B = '/api/catalog'
export const catalog = {
  scopes: () => http.get(`${B}/scopes`),
  size: () => http.get(`${B}/size`),
  syncAll: () => http.post(`${B}/sync-all`),
  /** Region ALL only: its own download, because BRAIN pages it fifty fields at a time. */
  syncRegionAgnostic: () => http.post(`${B}/sync-region-agnostic`),
  markets: () => http.get(`${B}/markets`),
  cancel: (id) => http.post(`${B}/sync/runs/${id}/cancel`),
  counts: (s) => http.get(`${B}/counts${scopeQs(s)}`),
  stats: (s) => http.get(`${B}/stats${scopeQs(s)}`),
  /** Counts under every other active filter; each facet ignores its own selection. */
  facets: (s, filter) => http.post(`${B}/facets${scopeQs(s)}`, filter),
  fields: (s, filter) => http.post(`${B}/fields${scopeQs(s)}`, filter),
  field: (s, id) => http.get(`${B}/fields/${encodeURIComponent(id)}${scopeQs(s)}`),
  availability: (id) => http.get(`${B}/fields/${encodeURIComponent(id)}/availability`),
  datasets: (s) => http.get(`${B}/datasets${scopeQs(s)}`),
  pyramids: () => http.get(`${B}/pyramids`),
  /** The chosen fields as Category › Subcategory › Dataset › Field text, for an LLM. */
  outline: (s, pick) => http.post(`${B}/fields/outline${scopeQs(s)}`, pick),
}
