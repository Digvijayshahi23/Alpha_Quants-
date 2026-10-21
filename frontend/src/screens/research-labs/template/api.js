/** Template Lab: the account's options, saved templates, previews and tasks. Request bodies are snake_case. */

import { http, qs } from '@/api/http'

/** Fields of the chosen datasets, narrowed by the Data Explorer's filter. */

/** A typed list: numbers, groups, operator names or whole expressions. */

export const INVESTABILITY_LABELS = {
  none: 'None',
  max_trade: 'Max Trade',
  max_position: 'Max Position',
}

/** A template and what each of its variables stands for, to be sized. */

const B = '/api/template-lab'
export const templateLab = {
  /** `refresh` syncs the account's operators from BRAIN first. */
  options: (refresh = false) =>
    http.get(
      `${B}/options${qs({
        refresh: refresh || undefined,
      })}`,
    ),
  templates: () => http.get(`${B}/templates`),
  create: (body) => http.post(`${B}/templates`, body),
  update: (id, body) => http.put(`${B}/templates/${id}`, body),
  remove: (id) => http.del(`${B}/templates/${id}`),
  /** Each template's operators and fields, and the kinds of Alpha it makes. Free. */
  stats: (body) => http.post(`${B}/stats`, body),
  /** The template as the Blocks view draws it, or why it can't be read. */
  tree: (text) =>
    http.post(`${B}/tree`, {
      text,
    }),
  /** Free; queues nothing. */
  preview: (body) => http.post(`${B}/preview`, body),
  /** Adds the template's search to Tasks, not started. Spends nothing until it is run there. */
  addTask: (body) => http.post(`${B}/tasks`, body),
}
