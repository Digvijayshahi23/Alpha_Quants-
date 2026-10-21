/**
 * Endpoints every screen can lean on: the day's numbers, the session, the simulation
 * engine and background tasks.
 */

import { http, qs } from './http'
import { scopeQs } from './types'

/** What the Settings screen saves. */

export const preferences = {
  get: () => http.get('/api/preferences'),
  /** Replaces every choice; the engine applies it on its next round. */
  put: (body) => http.put('/api/preferences', body),
}
export const competitions = {
  /** Ongoing first, soonest to end. One BRAIN read, plus one per ongoing competition. */
  list: () => http.get('/api/competitions'),
}
export const today = {
  /** The first screen in one call. Scope defaults to USA / D1 / TOP3000. */
  get: (scope) => http.get(`/api/today${scopeQs(scope)}`),
  /** The header clocks. Cheap. */
  bar: () => http.get('/api/today/bar'),
}
export const auth = {
  /** Omit both to sign in with the stored credential. */
  login: (email, password) =>
    http.post('/api/auth/login', {
      email: email || null,
      password: password || null,
    }),
  /** Close a paused sign-in's identity check. Answering early is normal: the session comes
   *  back unauthenticated and still carrying the inquiry. */
  verify: (inquiry) =>
    http.post('/api/auth/verify', {
      inquiry,
    }),
  logout: () => http.post('/api/auth/logout'),
  /** Legal values for every settings field, given what is chosen. Keys use BRAIN's names. */
  settingsOptions: (settings) =>
    http.post('/api/auth/settings-options', {
      settings,
    }),
}
export const simulations = {
  /** Every PENDING and RUNNING record, oldest first. Queued work is counted by `engine()`. */
  active: () => http.get('/api/simulations/active'),
  engine: () => http.get('/api/simulations/engine'),
  /** Cancel by record id. Cancel the batch PARENT: a child cannot be cancelled on BRAIN. */
  cancel: (recordId) => http.post(`/api/simulations/${recordId}/cancel`),
  /** Drop queued work that has not been sent. Omit `task` to drop everything queued. */
  dropQueue: (task) =>
    http.del(
      `/api/simulations/queue${qs({
        task,
      })}`,
    ),
}
export const tasks = {
  list: () => http.get('/api/tasks'),
}
export const update = {
  /** GitHub's last answer, asked only as often as Settings allow. `refresh` asks now, at
   *  most once a minute however often it is pressed. */
  status: (refresh = false) =>
    http.get(
      `/api/update${qs({
        refresh: refresh || null,
      })}`,
    ),
  /** Hands the install to the launcher and closes the app so it can run. */
  apply: () => http.post('/api/update'),
  /** Closes the app for good: the launcher exits with it rather than starting it again. */
  quit: () => http.post('/api/quit'),
}
